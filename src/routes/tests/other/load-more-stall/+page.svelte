<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'

    type Item = { id: number }

    // Five 40px rows in a 200px list: fewer than loadMoreThreshold, so every
    // list asks for more data as soon as it mounts.
    const ROW_PX = 40
    const START_ITEMS = 5
    // Loop breaker. Unbounded, a stalled loader re-requests in a microtask
    // loop and freezes the page; the fixture stops each loader at this many
    // calls (by setting hasMore=false) so the numbers can be read.
    const CALL_CAP = 50
    const OBSERVE_MS = 1500
    const EXPECTED_CALLS = 1
    const RESCROLL_LENGTH = 100

    const makeItems = (count: number): Item[] => Array.from({ length: count }, (_, id) => ({ id }))
    const settle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    type ProbeKey =
        'syncEmpty' | 'asyncEmpty' | 'rejected' | 'recovers' | 'rescroll' | 'spreadEmpty'
    type Probe = { calls: number; capped: boolean; done: boolean }
    const probeKeys: ProbeKey[] = [
        'syncEmpty',
        'asyncEmpty',
        'rejected',
        'recovers',
        'rescroll',
        'spreadEmpty'
    ]

    const freshProbes = (): Record<ProbeKey, Probe> =>
        Object.fromEntries(
            probeKeys.map((key) => [key, { calls: 0, capped: false, done: false }])
        ) as Record<ProbeKey, Probe>

    let probes = $state(freshProbes())
    let hasMore = $state<Record<ProbeKey, boolean>>({
        syncEmpty: true,
        asyncEmpty: true,
        rejected: true,
        recovers: true,
        rescroll: true,
        spreadEmpty: true
    })
    let recoversItems = $state.raw(makeItems(START_ITEMS))
    let recoversPhase = $state<'stall' | 'deliver'>('stall')
    // After the stall, a page that does arrive must be requested again.
    let callsAfterItemsArrive = $state<number | null>(null)
    // (e) calls made by scrolling away from the end and back after a stall.
    let callsAfterRescroll = $state<number | null>(null)
    let rescrollList = $state<SvelteVirtualList<Item>>()
    let spreadItems = $state.raw(makeItems(START_ITEMS))
    let running = $state(false)
    let generation = $state(0)

    /** Counts a call and trips the loop breaker at CALL_CAP. */
    const count = (key: ProbeKey) => {
        const probe = probes[key]
        probe.calls += 1
        if (probe.calls >= CALL_CAP) {
            probe.capped = true
            hasMore[key] = false
        }
    }

    // (a) A synchronous loader that has nothing to add this time.
    const loadSyncEmpty = () => {
        count('syncEmpty')
    }

    // (b) An async loader whose request comes back empty.
    const loadAsyncEmpty = async () => {
        count('asyncEmpty')
        await settle(20)
    }

    // (c) An async loader whose request fails — the docs' own example
    // leaves hasMore=true when fetchMoreItems() throws.
    const loadRejected = async () => {
        count('rejected')
        await settle(20)
        throw new Error('network down (expected in this fixture)')
    }

    // (d) Stalls once, then data arrives: loading must resume.
    const loadRecovers = async () => {
        count('recovers')
        await settle(20)
        if (recoversPhase === 'deliver') {
            recoversItems = [
                ...recoversItems,
                ...makeItems(START_ITEMS).map((item) => ({ id: item.id + recoversItems.length }))
            ]
            hasMore.recovers = false
        }
    }

    // (e) A long list whose load at the end fails: scrolling away from the
    // end and back is the user's retry and must ask exactly once more.
    // (f) The loader shape the docs recommend: always reassign
    // `items = [...items, ...newItems]`. An empty page still produces a NEW
    // array of the same length and the same rows.
    const loadSpreadEmpty = async () => {
        count('spreadEmpty')
        await settle(20)
        const newItems: Item[] = []
        spreadItems = [...spreadItems, ...newItems]
    }

    const loadRescroll = async () => {
        count('rescroll')
        await settle(20)
        throw new Error('network down (expected in this fixture)')
    }

    const runProbes = async () => {
        if (running) return
        running = true
        probes = freshProbes()
        for (const key of probeKeys) hasMore[key] = true
        recoversItems = makeItems(START_ITEMS)
        recoversPhase = 'stall'
        callsAfterItemsArrive = null
        callsAfterRescroll = null
        spreadItems = makeItems(START_ITEMS)
        generation += 1

        // Lists mount and each loader stalls; nothing else happens.
        await settle(OBSERVE_MS)
        for (const key of ['syncEmpty', 'asyncEmpty', 'rejected', 'spreadEmpty'] as const) {
            probes[key].done = true
        }

        // (d) The app delivers data out of band (e.g. a websocket push):
        // items grow, so the component may ask again.
        const callsBefore = probes.recovers.calls
        recoversPhase = 'deliver'
        recoversItems = [
            ...recoversItems,
            ...makeItems(START_ITEMS).map((item) => ({ id: item.id + recoversItems.length }))
        ]
        await settle(OBSERVE_MS)
        callsAfterItemsArrive = probes.recovers.calls - callsBefore
        probes.recovers.done = true

        // (e) Reach the end (one failed load), sit there, then leave the end
        // and come back.
        await rescrollList!.scroll({ index: RESCROLL_LENGTH - 1, smoothScroll: false })
        await settle(OBSERVE_MS)
        const stalledCalls = probes.rescroll.calls
        await rescrollList!.scroll({ index: 0, smoothScroll: false, align: 'top' })
        await settle(300)
        await rescrollList!.scroll({ index: RESCROLL_LENGTH - 1, smoothScroll: false })
        await settle(OBSERVE_MS)
        callsAfterRescroll = probes.rescroll.calls - stalledCalls
        probes.rescroll.done = true
        running = false
    }

    onMount(() => {
        // The rejected loader's errors are the scenario, not a failure.
        const swallow = (event: PromiseRejectionEvent) => {
            if (String(event.reason).includes('expected in this fixture')) event.preventDefault()
        }
        window.addEventListener('unhandledrejection', swallow)
        const timer = setTimeout(runProbes, 100)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('unhandledrejection', swallow)
        }
    })

    const rows: { key: ProbeKey; label: string; expected: string }[] = [
        {
            key: 'syncEmpty',
            label: '(a) sync loader, nothing to add',
            expected: `called ${EXPECTED_CALLS}× in ${OBSERVE_MS}ms with no scrolling`
        },
        {
            key: 'asyncEmpty',
            label: '(b) async loader, empty page',
            expected: `called ${EXPECTED_CALLS}× in ${OBSERVE_MS}ms with no scrolling`
        },
        {
            key: 'rejected',
            label: '(c) async loader, request fails',
            expected: `called ${EXPECTED_CALLS}× in ${OBSERVE_MS}ms with no scrolling`
        },
        {
            key: 'recovers',
            label: '(d) stalls, then items arrive',
            expected: `1× while stalled, then asked again once new items arrive`
        },
        {
            key: 'rescroll',
            label: '(e) fails at end, user scrolls back',
            expected: `1× while sitting at the end, then 1× more after leaving and returning`
        },
        {
            key: 'spreadEmpty',
            label: '(f) docs-style loader, empty page',
            expected: `items = [...items, ...[]] — a new array with the same rows; called ${EXPECTED_CALLS}× in ${OBSERVE_MS}ms`
        }
    ]

    const passFor = (key: ProbeKey): boolean | null => {
        const probe = probes[key]
        if (!probe.done) return null
        if (key === 'recovers') {
            return probe.calls === 2 && callsAfterItemsArrive === 1 && !probe.capped
        }
        if (key === 'rescroll') {
            return probe.calls === 2 && callsAfterRescroll === 1 && !probe.capped
        }
        return probe.calls === EXPECTED_CALLS && !probe.capped
    }

    const statLine = (key: ProbeKey) => {
        const probe = probes[key]
        if (!probe.done) return '—'
        const base = `calls=${probe.calls} capped=${probe.capped ? 1 : 0}`
        if (key === 'recovers') return `${base} afterItems=${callsAfterItemsArrive ?? 0}`
        if (key === 'rescroll') return `${base} afterRescroll=${callsAfterRescroll ?? 0}`
        return base
    }
</script>

<div class="page">
    <h1>onLoadMore — a loader that adds nothing is called again forever</h1>

    <div class="description">
        <p>
            <strong>What:</strong> the component calls <code>onLoadMore</code> whenever the visible range
            is near the end and no load is in flight. When a load finishes without adding items — an empty
            page, or a failed request — nothing about the range has changed, so the very next reactive
            pass calls it again, then again.
        </p>
        <p>
            <strong>Why it's bad:</strong> a synchronous or fast loader spins in a microtask loop
            that never yields: the page freezes. A slower one floods the backend with retries. The
            docs' own example hits it: when <code>fetchMoreItems()</code> throws,
            <code>hasMore</code> stays true.
        </p>
        <p>
            <strong>How it's measured:</strong> short lists with {START_ITEMS} rows (fewer than the load
            threshold, so each asks for more on mount). Each loader counts its calls; at {CALL_CAP} the
            fixture sets <code>hasMore=false</code> to break the loop (<code>capped=1</code>). No
            scrolling happens, so a working component calls each loader once. List (d) then receives
            items out of band and must be asked for more again. List (e) is long: its load at the
            end fails, and scrolling away and back must retry exactly once. List (f) uses the loader
            shape the docs recommend, which reassigns <code>items</code> even when the page is empty.
        </p>
    </div>

    <div class="stats" data-testid="load-more-stall-stats">
        {#each rows as row (row.key)}
            {@const pass = passFor(row.key)}
            <div class="stat" class:pass={pass === true} class:fail={pass === false}>
                <span class="light">{pass === null ? (running ? '⟳' : '…') : pass ? '✓' : '✗'}</span
                >
                <span class="label">{row.label}</span>
                <span class="value" data-testid="stat-{row.key}">{statLine(row.key)}</span>
                <span class="expected">{row.expected}</span>
            </div>
        {/each}

        <button class="remeasure" onclick={runProbes} disabled={running}>
            {running ? 'probing…' : 'Re-run probes'}
        </button>
    </div>

    {#snippet renderRow(item: Item)}
        <div class="row" style="height: {ROW_PX}px;">#{item.id}</div>
    {/snippet}

    {#key generation}
        <div class="grid">
            <section>
                <h2>(a) sync, nothing to add</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        items={makeItems(START_ITEMS)}
                        onLoadMore={loadSyncEmpty}
                        hasMore={hasMore.syncEmpty}
                        testId="lms-sync-empty"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(b) async, empty page</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        items={makeItems(START_ITEMS)}
                        onLoadMore={loadAsyncEmpty}
                        hasMore={hasMore.asyncEmpty}
                        testId="lms-async-empty"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(c) async, request fails</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        items={makeItems(START_ITEMS)}
                        onLoadMore={loadRejected}
                        hasMore={hasMore.rejected}
                        testId="lms-rejected"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(d) stalls, then items arrive</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        items={recoversItems}
                        onLoadMore={loadRecovers}
                        hasMore={hasMore.recovers}
                        testId="lms-recovers"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(e) fails at end, scroll back</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        bind:this={rescrollList}
                        items={makeItems(RESCROLL_LENGTH)}
                        onLoadMore={loadRescroll}
                        hasMore={hasMore.rescroll}
                        testId="lms-rescroll"
                        renderItem={renderRow}
                    />
                </div>
            </section>
            <section>
                <h2>(f) docs-style, empty page</h2>
                <div class="test-container">
                    <SvelteVirtualList
                        items={spreadItems}
                        onLoadMore={loadSpreadEmpty}
                        hasMore={hasMore.spreadEmpty}
                        testId="lms-spread-empty"
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

    .description code {
        background: #eef2f7;
        padding: 1px 4px;
        border-radius: 3px;
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
        grid-template-columns: 22px 250px minmax(220px, auto) 1fr;
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
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
    }

    .test-container {
        height: 200px;
        background: #f3f3f3;
    }

    .row {
        box-sizing: border-box;
        padding: 10px 12px;
        border-bottom: 1px solid #eee;
        background: #fff;
        font-size: 13px;
    }
</style>
