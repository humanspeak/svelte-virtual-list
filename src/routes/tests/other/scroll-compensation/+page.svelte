<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
    }

    // Deterministic variable heights (40–160px) against a 40px estimate:
    // every probe runs over genuinely wrong estimates, and trimmed/prepended
    // blocks have a nonzero, non-uniform height so a missed compensation
    // cannot cancel out by accident.
    const ESTIMATE_PX = 40
    const heightFor = (id: number) => 40 + (Math.abs(id * 37) % 5) * 30
    const LIST_LENGTH = 200
    const SMOOTH_LIST_LENGTH = 1000
    const SMOOTH_TARGET = 600
    const READ_INDEX = 80
    const BATCH = 20
    const GROW_PX = 300
    const TOLERANCE_PX = 2
    // Sentinel for "the item the probe tracks is not rendered at all".
    const MISSING = 9999

    const makeItems = (from: number, count: number): Item[] =>
        Array.from({ length: count }, (_, i) => ({ id: from + i }))

    type ProbeKey =
        | 'smooth'
        | 'grow'
        | 'followTrim'
        | 'readTrim'
        | 'readPrepend'
        | 'readRemoved'
        | 'startPrepend'
        | 'loaderTrim'
    type Probe = { stats: Record<string, number> | null; value: number | null }

    const emptyProbes = (): Record<ProbeKey, Probe> => ({
        smooth: { stats: null, value: null },
        grow: { stats: null, value: null },
        followTrim: { stats: null, value: null },
        readTrim: { stats: null, value: null },
        readPrepend: { stats: null, value: null },
        readRemoved: { stats: null, value: null },
        startPrepend: { stats: null, value: null },
        loaderTrim: { stats: null, value: null }
    })

    let probes = $state(emptyProbes())
    let running = $state(false)
    // Bumped per run: {#key} remounts every list so each run starts from a
    // cold measurement cache (a warm cache would make estimates correct and
    // the probes vacuous).
    let generation = $state(0)

    let smoothItems = $state.raw(makeItems(0, SMOOTH_LIST_LENGTH))
    let growItems = $state.raw(makeItems(0, LIST_LENGTH))
    let followItems = $state.raw(makeItems(0, LIST_LENGTH))
    let readTrimItems = $state.raw(makeItems(0, LIST_LENGTH))
    let readPrependItems = $state.raw(makeItems(0, LIST_LENGTH))
    let readRemovedItems = $state.raw(makeItems(0, LIST_LENGTH))
    let startPrependItems = $state.raw(makeItems(0, LIST_LENGTH))
    let loaderItems = $state.raw(makeItems(0, LIST_LENGTH))
    let expandedId = $state<number | null>(null)

    // (h)'s loader behaves like a real one: the request stays in flight
    // until the probe delivers its page, then reports no more data. (A
    // loader that resolves without adding items is re-requested at once.)
    let loaderHasMore = $state(true)
    let deliverPage: (() => void) | null = null
    const loadMore = () =>
        new Promise<void>((resolve) => {
            deliverPage = resolve
        })

    let smoothList = $state<SvelteVirtualList<Item>>()
    let growList = $state<SvelteVirtualList<Item>>()
    let followList = $state<SvelteVirtualList<Item>>()
    let readTrimList = $state<SvelteVirtualList<Item>>()
    let readPrependList = $state<SvelteVirtualList<Item>>()
    let readRemovedList = $state<SvelteVirtualList<Item>>()
    let loaderList = $state<SvelteVirtualList<Item>>()

    // Wall-clock time AND a few rendered frames: the component corrects on
    // animation frames, and an unfocused or occluded window throttles those
    // (2 fps in an embedded preview), so a timeout alone reads too early.
    const SETTLE_FRAMES = 4
    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
    const settle = async (ms: number) => {
        await new Promise<void>((r) => setTimeout(r, ms))
        for (let frame = 0; frame < SETTLE_FRAMES; frame += 1) await nextFrame()
    }

    const viewportOf = (name: string): HTMLElement =>
        document.querySelector(`[data-testid="${name}-viewport"]`) as HTMLElement

    const itemEl = (viewport: HTMLElement, id: number): HTMLElement | null =>
        viewport.querySelector(`[data-item-id="${id}"]`)

    /** Painted top of an item relative to the viewport's top edge. */
    const itemTop = (viewport: HTMLElement, id: number): number | null => {
        const el = itemEl(viewport, id)
        if (!el) return null
        return el.getBoundingClientRect().top - viewport.getBoundingClientRect().top
    }

    /** Distance between the last-scrollable position and the current one. */
    const bottomGap = (viewport: HTMLElement) =>
        Math.round(viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop)

    /** The item straddling the viewport's top edge — what a reader is looking at. */
    const readingAnchor = (viewport: HTMLElement): { id: number; top: number } | null => {
        const vpTop = viewport.getBoundingClientRect().top
        let best: { id: number; top: number } | null = null
        for (const el of viewport.querySelectorAll<HTMLElement>('[data-item-id]')) {
            const rect = el.getBoundingClientRect()
            if (rect.bottom <= vpTop + 1) continue
            if (!best || rect.top - vpTop < best.top) {
                best = { id: Number(el.dataset.itemId), top: rect.top - vpTop }
            }
        }
        return best
    }

    const round = (n: number) => Math.round(n)

    // (a) Smooth programmatic scroll across unmeasured, wrongly-estimated
    // items: items measure mid-flight, and the scroll must still land with
    // the target flush to the top edge.
    const probeSmooth = async () => {
        const viewport = viewportOf('sc-smooth')
        await smoothList!.scroll({ index: SMOOTH_TARGET, smoothScroll: true, align: 'top' })
        await settle(500)
        const top = itemTop(viewport, SMOOTH_TARGET)
        const landedPx = top === null ? MISSING : round(Math.abs(top))
        probes.smooth = { stats: { landedPx }, value: landedPx }
    }

    // (b) Bottom-pinned list whose last item grows: the view must stay
    // pinned to the new bottom (the browser clamps a scrollTop written
    // before the taller total is committed).
    const probeGrow = async () => {
        const viewport = viewportOf('sc-grow')
        await growList!.scroll({ index: LIST_LENGTH - 1, smoothScroll: false, align: 'bottom' })
        await settle(400)
        const pinnedBefore = bottomGap(viewport)
        expandedId = LIST_LENGTH - 1
        await settle(400)
        const gapPx = bottomGap(viewport)
        probes.grow = { stats: { pinnedBefore, gapPx }, value: Math.max(pinnedBefore, gapPx) }
    }

    // (c) Bottom-pinned keyed list, append + trim at constant count: the
    // view must keep following the newest item.
    const probeFollowTrim = async () => {
        const viewport = viewportOf('sc-follow')
        await followList!.scroll({ index: LIST_LENGTH - 1, smoothScroll: false, align: 'bottom' })
        await settle(400)
        const pinnedBefore = bottomGap(viewport)
        const last = followItems[followItems.length - 1].id
        followItems = [...followItems.slice(BATCH), ...makeItems(last + 1, BATCH)]
        await settle(400)
        const newest = followItems[followItems.length - 1].id
        const el = itemEl(viewport, newest)
        const newestOffPx = el
            ? round(
                  Math.abs(
                      viewport.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom
                  )
              )
            : MISSING
        probes.followTrim = {
            stats: { pinnedBefore, gapPx: bottomGap(viewport), newestOffPx },
            value: Math.max(pinnedBefore, newestOffPx)
        }
    }

    /** Shared body for the reader-anchor probes (d) and (e). */
    const probeReading = async (
        name: string,
        list: SvelteVirtualList<Item>,
        mutate: () => void
    ): Promise<Probe> => {
        const viewport = viewportOf(name)
        await list.scroll({ index: READ_INDEX, smoothScroll: false, align: 'top' })
        await settle(400)
        const anchor = readingAnchor(viewport)
        if (!anchor) return { stats: { driftPx: MISSING }, value: MISSING }
        mutate()
        await settle(400)
        const after = itemTop(viewport, anchor.id)
        const driftPx = after === null ? MISSING : round(Math.abs(after - anchor.top))
        return { stats: { anchorId: anchor.id, driftPx }, value: driftPx }
    }

    // (f) Reader mid-list, and the item being read is removed along with
    // its neighbours: the next surviving item must take its place.
    const probeReadRemoved = async () => {
        const viewport = viewportOf('sc-read-removed')
        await readRemovedList!.scroll({ index: READ_INDEX, smoothScroll: false, align: 'top' })
        await settle(400)
        const anchor = readingAnchor(viewport)
        if (!anchor) {
            probes.readRemoved = { stats: { driftPx: MISSING }, value: MISSING }
            return
        }
        const from = anchor.id - BATCH / 2
        const survivorId = from + BATCH
        readRemovedItems = readRemovedItems.filter(
            (item) => item.id < from || item.id >= survivorId
        )
        await settle(400)
        const after = itemTop(viewport, survivorId)
        const driftPx = after === null ? MISSING : round(Math.abs(after - anchor.top))
        probes.readRemoved = {
            stats: { removedId: anchor.id, survivorId, driftPx },
            value: driftPx
        }
    }

    // (g) Resting at the start, keyed prepend: nothing is being read past,
    // so the new items must show instead of being scrolled out of view.
    const probeStartPrepend = async () => {
        const viewport = viewportOf('sc-start-prepend')
        const firstId = startPrependItems[0].id - BATCH
        startPrependItems = [...makeItems(firstId, BATCH), ...startPrependItems]
        await settle(400)
        const top = itemTop(viewport, firstId)
        const firstOffPx = top === null ? MISSING : round(Math.abs(top))
        const scrollTop = round(viewport.scrollTop)
        probes.startPrepend = {
            stats: { scrollTop, firstOffPx },
            value: Math.max(scrollTop, firstOffPx)
        }
    }

    // (h) Infinite loader resting at the end, append + trim: the end is a
    // loading edge, so the reading position must hold — re-pinning to the
    // end would skip the new page and request the next one.
    const probeLoaderTrim = async () => {
        const viewport = viewportOf('sc-loader')
        await loaderList!.scroll({ index: LIST_LENGTH - 1, smoothScroll: false, align: 'bottom' })
        await settle(400)
        const pinnedBefore = bottomGap(viewport)
        const anchor = readingAnchor(viewport)
        if (!anchor) {
            probes.loaderTrim = { stats: { driftPx: MISSING }, value: MISSING }
            return
        }
        const last = loaderItems[loaderItems.length - 1].id
        loaderItems = [...loaderItems.slice(BATCH), ...makeItems(last + 1, BATCH)]
        loaderHasMore = false
        deliverPage?.()
        await settle(400)
        const after = itemTop(viewport, anchor.id)
        const driftPx = after === null ? MISSING : round(Math.abs(after - anchor.top))
        probes.loaderTrim = {
            stats: { pinnedBefore, anchorId: anchor.id, driftPx },
            value: Math.max(pinnedBefore, driftPx)
        }
    }

    const runProbes = async () => {
        if (running) return
        running = true
        probes = emptyProbes()
        expandedId = null
        smoothItems = makeItems(0, SMOOTH_LIST_LENGTH)
        growItems = makeItems(0, LIST_LENGTH)
        followItems = makeItems(0, LIST_LENGTH)
        readTrimItems = makeItems(0, LIST_LENGTH)
        readPrependItems = makeItems(0, LIST_LENGTH)
        readRemovedItems = makeItems(0, LIST_LENGTH)
        startPrependItems = makeItems(0, LIST_LENGTH)
        loaderItems = makeItems(0, LIST_LENGTH)
        loaderHasMore = true
        deliverPage = null
        generation += 1
        await settle(600)

        await probeSmooth()
        await probeGrow()
        await probeFollowTrim()
        // (d) Reader mid-list, keyed append + trim: the item being read must
        // keep its painted position while items above it are removed.
        probes.readTrim = await probeReading('sc-read-trim', readTrimList!, () => {
            const last = readTrimItems[readTrimItems.length - 1].id
            readTrimItems = [...readTrimItems.slice(BATCH), ...makeItems(last + 1, BATCH)]
        })
        // (e) Reader mid-list, keyed prepend: the item being read must keep
        // its painted position while items are inserted above it.
        probes.readPrepend = await probeReading('sc-read-prepend', readPrependList!, () => {
            readPrependItems = [
                ...makeItems(readPrependItems[0].id - BATCH, BATCH),
                ...readPrependItems
            ]
        })
        await probeReadRemoved()
        await probeStartPrepend()
        await probeLoaderTrim()
        running = false
    }

    onMount(() => {
        const timer = setTimeout(runProbes, 300)
        return () => clearTimeout(timer)
    })

    const rows: { key: ProbeKey; label: string; expected: string }[] = [
        {
            key: 'smooth',
            label: '(a) smooth scroll lands',
            expected: `target #${SMOOTH_TARGET} flush to top after measuring mid-flight (≤${TOLERANCE_PX}px)`
        },
        {
            key: 'grow',
            label: '(b) pinned, last item grows',
            expected: `still at the bottom after last item grows +${GROW_PX}px (≤${TOLERANCE_PX}px)`
        },
        {
            key: 'followTrim',
            label: '(c) pinned, append + trim',
            expected: `newest item flush to the bottom after +${BATCH}/−${BATCH} (≤${TOLERANCE_PX}px)`
        },
        {
            key: 'readTrim',
            label: '(d) reading, append + trim',
            expected: `item being read does not move when ${BATCH} items above are trimmed (≤${TOLERANCE_PX}px)`
        },
        {
            key: 'readPrepend',
            label: '(e) reading, prepend',
            expected: `item being read does not move when ${BATCH} items are prepended (≤${TOLERANCE_PX}px)`
        },
        {
            key: 'readRemoved',
            label: '(f) reading, item removed',
            expected: `next surviving item takes the removed item's place (≤${TOLERANCE_PX}px)`
        },
        {
            key: 'startPrepend',
            label: '(g) at start, prepend',
            expected: `still at the start with the first new item showing (≤${TOLERANCE_PX}px)`
        },
        {
            key: 'loaderTrim',
            label: '(h) loader at end, append + trim',
            expected: `item being read does not move — an infinite loader's end is not followed (≤${TOLERANCE_PX}px)`
        }
    ]

    const statLine = (stats: Record<string, number> | null) =>
        stats
            ? Object.entries(stats)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(' ')
            : '—'
</script>

<div class="page">
    <h1>Scroll compensation — pinned, reading, and smooth-scroll anchoring</h1>

    <div class="description">
        <p>
            <strong>What:</strong> the component preserves the view through measurement corrections
            (items resolving from the {ESTIMATE_PX}px estimate to their real height), keeping either
            the bottom pin or the item at the top edge in place. Competitors ship the same guarantee
            for smooth programmatic scrolls, a growing last item, and keyed mutations — append +
            trim at a constant count, and prepends. The edges keep their own meaning: resting at the
            start shows content added above, and an infinite loader's end is a loading edge that is
            not followed.
        </p>
        <p>
            <strong>Why it's bad:</strong> a chat or log view that trims old rows, or a feed that prepends
            newer ones, loses the reader's place — the content under them jumps by the height of every
            row added or removed above. A bottom-pinned view that stops following appears frozen.
        </p>
        <p>
            <strong>How it's measured:</strong> cold-cache keyed lists (heights 40–160px vs a {ESTIMATE_PX}px
            estimate). Each probe records the painted position of the item that should stay still,
            applies the mutation, waits 400ms, and reports the movement in px. {MISSING} means the tracked
            item is no longer rendered at all.
        </p>
    </div>

    <div class="stats" data-testid="scroll-compensation-stats">
        {#each rows as row (row.key)}
            {@const probe = probes[row.key]}
            {@const pass = probe.value !== null && probe.value <= TOLERANCE_PX}
            <div class="stat" class:pass class:fail={probe.value !== null && !pass}>
                <span class="light"
                    >{probe.value === null ? (running ? '⟳' : '…') : pass ? '✓' : '✗'}</span
                >
                <span class="label">{row.label}</span>
                <span class="value" data-testid="stat-{row.key}">{statLine(probe.stats)}</span>
                <span class="expected">{row.expected}</span>
            </div>
        {/each}

        <button class="remeasure" onclick={runProbes} disabled={running}>
            {running ? 'probing…' : 'Re-run probes'}
        </button>
    </div>

    {#snippet sizedRow(item: Item, extraPx: number)}
        <div class="row" data-item-id={item.id} style="height: {heightFor(item.id) + extraPx}px;">
            #{item.id} · {heightFor(item.id) + extraPx}px
        </div>
    {/snippet}

    {#snippet renderRow(item: Item)}
        {@render sizedRow(item, 0)}
    {/snippet}

    <!-- Only list (b) grows its row: ids repeat across the lists. -->
    {#snippet renderGrowingRow(item: Item)}
        {@render sizedRow(item, item.id === expandedId ? GROW_PX : 0)}
    {/snippet}

    {#key generation}
        <div class="grid">
            <section>
                <h2>(a) smooth scroll</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        bind:this={smoothList}
                        items={smoothItems}
                        itemKey={(item) => item.id}
                        defaultEstimatedItemHeight={ESTIMATE_PX}
                        testId="sc-smooth"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(b) pinned, grow last</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        bind:this={growList}
                        items={growItems}
                        itemKey={(item) => item.id}
                        defaultEstimatedItemHeight={ESTIMATE_PX}
                        testId="sc-grow"
                        renderItem={renderGrowingRow}
                    />
                </div>
            </section>
            <section>
                <h2>(c) pinned, append + trim</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        bind:this={followList}
                        items={followItems}
                        itemKey={(item) => item.id}
                        defaultEstimatedItemHeight={ESTIMATE_PX}
                        testId="sc-follow"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(d) reading, append + trim</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        bind:this={readTrimList}
                        items={readTrimItems}
                        itemKey={(item) => item.id}
                        defaultEstimatedItemHeight={ESTIMATE_PX}
                        testId="sc-read-trim"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(e) reading, prepend</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        bind:this={readPrependList}
                        items={readPrependItems}
                        itemKey={(item) => item.id}
                        defaultEstimatedItemHeight={ESTIMATE_PX}
                        testId="sc-read-prepend"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(f) reading, item removed</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        bind:this={readRemovedList}
                        items={readRemovedItems}
                        itemKey={(item) => item.id}
                        defaultEstimatedItemHeight={ESTIMATE_PX}
                        testId="sc-read-removed"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(g) at start, prepend</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        items={startPrependItems}
                        itemKey={(item) => item.id}
                        defaultEstimatedItemHeight={ESTIMATE_PX}
                        testId="sc-start-prepend"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(h) loader at end, append + trim</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        bind:this={loaderList}
                        items={loaderItems}
                        itemKey={(item) => item.id}
                        defaultEstimatedItemHeight={ESTIMATE_PX}
                        onLoadMore={loadMore}
                        hasMore={loaderHasMore}
                        testId="sc-loader"
                        renderItem={renderRow}
                    />
                </div>
            </section>
        </div>
    {/key}
</div>

<style>
    .page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 16px;
        font-family:
            system-ui,
            -apple-system,
            sans-serif;
    }

    h1 {
        font-size: 18px;
        margin: 0 0 12px;
    }

    h2 {
        font-size: 13px;
        margin: 0 0 6px;
        color: #555;
    }

    .description {
        font-size: 13px;
        line-height: 1.5;
        color: #333;
        background: #fafafa;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 4px 14px;
        margin-bottom: 12px;
    }

    .stats {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;
        font-size: 13px;
    }

    .stat {
        display: grid;
        grid-template-columns: 22px 210px minmax(220px, auto) 1fr;
        gap: 8px;
        align-items: baseline;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #e5e5e5;
        background: #f6f6f6;
    }

    .stat.pass {
        background: #e9f7ee;
        border-color: #b7e2c4;
    }

    .stat.fail {
        background: #fdeaea;
        border-color: #f2b8b8;
    }

    .light {
        font-weight: 700;
    }

    .stat.pass .light,
    .stat.pass .value {
        color: #1a7f37;
    }

    .stat.fail .light,
    .stat.fail .value {
        color: #c62828;
    }

    .label {
        font-weight: 600;
    }

    .value {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
    }

    .expected {
        color: #777;
        font-size: 12px;
    }

    .remeasure {
        align-self: flex-start;
        margin-top: 4px;
        padding: 6px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
    }

    .remeasure:disabled {
        opacity: 0.6;
        cursor: wait;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
    }

    /* Behind the items: any red showing inside a list is viewport the
       rendered items fail to cover. */
    .test-container {
        height: 320px;
        background: #ffc2c2;
    }

    .row {
        box-sizing: border-box;
        padding: 6px 10px;
        border-bottom: 1px solid #eee;
        background: #fff;
        font-size: 13px;
    }
</style>
