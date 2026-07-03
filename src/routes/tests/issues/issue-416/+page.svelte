<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'
    import { uncoveredPx } from '$lib/test/utils/coverage.js'

    type Item = {
        id: number
        text: string
    }

    // Fixed 40px items and a deliberately SMALL buffer: the buffer normally
    // masks a stale viewport height (20 items × 40px hides ~800px of missed
    // growth), so bufferSize=2 keeps the probe honest — any unhandled
    // container growth beyond ~80px paints as unfilled viewport.
    const ITEM_COUNT = 500
    const ITEM_HEIGHT_PX = 40
    const BUFFER_SIZE = 2
    const BASE_HEIGHT_PX = 300
    const GROWN_HEIGHT_PX = 900

    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    let containerHeight = $state(BASE_HEIGHT_PX)
    let grownClientHeight = $state<number | null>(null)
    let blankPx = $state<number | null>(null)
    let running = $state(false)

    const grownPass = $derived(grownClientHeight === GROWN_HEIGHT_PX)
    // Strict zero, matching the stat label and the Playwright assertion.
    const coveragePass = $derived(blankPx === 0)

    const getViewport = (): HTMLElement | null =>
        document.querySelector('[data-testid="issue-416-list-viewport"]')

    const settle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    /** Unfilled vertical px of the viewport, via the shared coverage core. */
    const measureBlankPx = (viewport: HTMLElement): number => {
        const rects = Array.from(viewport.querySelectorAll('[data-original-index]')).map((el) =>
            el.getBoundingClientRect()
        )
        return uncoveredPx(viewport.getBoundingClientRect(), rects)
    }

    const runProbe = async () => {
        const viewport = getViewport()
        if (!viewport || running) return
        running = true
        grownClientHeight = null
        blankPx = null

        // Reset to the base height and let the list settle there.
        containerHeight = BASE_HEIGHT_PX
        viewport.scrollTop = 0
        await settle(400)

        // Nudge the scroll by a few px BEFORE growing: a small nonzero
        // scroll delta arms the visible-range memo, which must not serve a
        // range sized for the old height after the resize lands.
        viewport.scrollTop = 10
        await settle(100)

        // Grow the container and give the component's ResizeObserver ample
        // time to react (it fires within a frame or two when it works).
        containerHeight = GROWN_HEIGHT_PX
        await settle(600)

        grownClientHeight = viewport.clientHeight
        blankPx = measureBlankPx(viewport)
        running = false
    }

    onMount(() => {
        const timer = setTimeout(runProbe, 500)
        return () => clearTimeout(timer)
    })
</script>

<div class="page">
    <h1>Issue #416 — container resizes are ignored</h1>

    <div class="description">
        <p>
            <strong>What:</strong> the component watches its container with a ResizeObserver, but
            the handler early-returns unless <code>heightManager.initialized</code> is true — and that
            flag's only writer is a callback passed to a utility that never calls it, so it is false for
            the lifetime of every instance. Container resizes are silently dropped; the internal viewport
            height is only read once, shortly after mount.
        </p>
        <p>
            <strong>Why it's bad:</strong> any layout change that resizes the list's container — responsive
            breakpoints, a sidebar collapsing, a panel expanding — leaves the render window sized for
            the stale height. Growing the container paints an unfilled region at the bottom of the viewport:
            the space is scrollable, but the items that should fill it are simply not rendered.
        </p>
        <p>
            <strong>How it's measured:</strong> the probe settles the list at {BASE_HEIGHT_PX}px,
            grows the container to {GROWN_HEIGHT_PX}px, waits well past ResizeObserver latency, then
            measures coverage — viewport height minus the union of rendered item rects. The fixture
            uses <code>bufferSize={BUFFER_SIZE}</code> because the default 20-item buffer masks ~800px
            of missed growth.
        </p>
    </div>

    <div class="stats" data-testid="issue-416-stats">
        <div
            class="stat"
            class:pass={grownPass}
            class:fail={grownClientHeight !== null && !grownPass}
        >
            <span class="light"
                >{grownClientHeight === null ? (running ? '⟳' : '…') : grownPass ? '✓' : '✗'}</span
            >
            <span class="label">container grew</span>
            <span class="value" data-testid="stat-grown">
                clientHeight={grownClientHeight ?? '—'}
            </span>
            <span class="expected"
                >fixture sanity: the viewport element must be {GROWN_HEIGHT_PX}px tall</span
            >
        </div>

        <div class="stat" class:pass={coveragePass} class:fail={blankPx !== null && !coveragePass}>
            <span class="light"
                >{blankPx === null ? (running ? '⟳' : '…') : coveragePass ? '✓' : '✗'}</span
            >
            <span class="label">rendered items fill the grown viewport</span>
            <span class="value" data-testid="stat-coverage">blankPx={blankPx ?? '—'}</span>
            <span class="expected">
                must be 0 — every unfilled px is the resize the component ignored
            </span>
        </div>

        <button class="remeasure" onclick={runProbe} disabled={running}>
            {running ? 'probing…' : 'Re-run probe'}
        </button>
    </div>

    <div class="test-container" style="height: {containerHeight}px;">
        <SvelteVirtualList
            defaultEstimatedItemHeight={ITEM_HEIGHT_PX}
            bufferSize={BUFFER_SIZE}
            {items}
            testId="issue-416-list"
        >
            {#snippet renderItem(item)}
                <div class="fixed-item" style="height: {ITEM_HEIGHT_PX}px;">
                    {item.text}
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
</div>

<style>
    .page {
        max-width: 860px;
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
        grid-template-columns: 22px 230px minmax(120px, auto) 1fr;
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

    .stat.pass .light {
        color: #1a7f37;
    }

    .stat.fail .light {
        color: #c62828;
    }

    .label {
        font-weight: 600;
    }

    .value {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
    }

    .stat.pass .value {
        color: #1a7f37;
    }

    .stat.fail .value {
        color: #c62828;
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

    /* The list's container is behind the items; if you see this red, the
       viewport region is not covered by rendered items. (No border: it
       would subtract from clientHeight and skew the sanity check.) */
    .test-container {
        width: 100%;
        background: #ffc2c2;
        transition: none;
    }

    .fixed-item {
        box-sizing: border-box;
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
        background: #fff;
        font-size: 14px;
    }
</style>
