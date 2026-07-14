<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
        text: string
    }

    const ITEM_COUNT = 1_000
    const ITEM_HEIGHT_PX = 40
    const VIEWPORT_HEIGHT_PX = 400
    const CENTER_INDEX = 500
    const RESTORE_OFFSET_PX = 12_345

    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    let listRef: SvelteVirtualList<Item>
    let centerDeltaPx = $state<number | null>(null)
    let scrollTopPx = $state<number | null>(null)
    let running = $state(false)

    const centerPass = $derived(centerDeltaPx !== null && centerDeltaPx <= 2)
    const offsetPass = $derived(
        scrollTopPx !== null && Math.abs(scrollTopPx - RESTORE_OFFSET_PX) <= 2
    )

    const getViewport = (): HTMLElement | null =>
        document.querySelector('[data-testid="issue-165-list-viewport"]')

    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const runProbes = async () => {
        const viewport = getViewport()
        if (!viewport || !listRef || running) return
        running = true
        centerDeltaPx = null
        scrollTopPx = null

        await listRef.scroll({ index: CENTER_INDEX, align: 'center', smoothScroll: false })
        await nextFrame()

        const target = viewport.querySelector(`[data-testid="issue-165-item-${CENTER_INDEX}"]`)
        if (target) {
            const viewportRect = viewport.getBoundingClientRect()
            const targetRect = target.getBoundingClientRect()
            const viewportCenter = (viewportRect.top + viewportRect.bottom) / 2
            const targetCenter = (targetRect.top + targetRect.bottom) / 2
            centerDeltaPx = Math.round(Math.abs(targetCenter - viewportCenter))
        } else {
            // Keep a missing target visibly red and machine-readable.
            centerDeltaPx = 999_999
        }

        await listRef.scrollToOffset({ offset: RESTORE_OFFSET_PX, smoothScroll: false })
        await nextFrame()
        scrollTopPx = Math.round(viewport.scrollTop)
        running = false
    }

    onMount(() => {
        const timer = setTimeout(runProbes, 500)
        return () => clearTimeout(timer)
    })
</script>

<div class="page">
    <h1>Issue #165 — center-aligned programmatic scrolling</h1>

    <div class="description">
        <p>
            <strong>What:</strong> issue #165 asked for top, center, or bottom alignment when
            scrolling to an item. Before the fix, <code>align: 'center'</code> fell through the
            scroll-target calculation and returned <code>null</code>, silently leaving the list in
            place.
        </p>
        <p>
            <strong>Why it's bad:</strong> consumers could not center a search result or restore a persisted
            raw scroll position through the component's supported programmatic-scroll machinery.
        </p>
        <p>
            <strong>How it's measured:</strong> the first probe scrolls to item {CENTER_INDEX} with center
            alignment and compares its rendered center with the viewport center. The second probe calls
            <code>scrollToOffset</code>
            with {RESTORE_OFFSET_PX}px and reads the viewport's actual <code>scrollTop</code>.
        </p>
    </div>

    <div class="stats" data-testid="issue-165-stats">
        <div
            class="stat"
            class:pass={centerPass}
            class:fail={centerDeltaPx !== null && !centerPass}
        >
            <span class="light"
                >{centerDeltaPx === null ? (running ? '⟳' : '…') : centerPass ? '✓' : '✗'}</span
            >
            <span class="label">target is vertically centered</span>
            <span class="value" data-testid="stat-center">
                centerDeltaPx={centerDeltaPx ?? '—'}
            </span>
            <span class="expected">must be within 2px of the viewport center</span>
        </div>

        <div class="stat" class:pass={offsetPass} class:fail={scrollTopPx !== null && !offsetPass}>
            <span class="light"
                >{scrollTopPx === null ? (running ? '⟳' : '…') : offsetPass ? '✓' : '✗'}</span
            >
            <span class="label">raw offset is restored</span>
            <span class="value" data-testid="stat-offset">scrollTopPx={scrollTopPx ?? '—'}</span>
            <span class="expected">must be within 2px of {RESTORE_OFFSET_PX}px</span>
        </div>

        <button class="remeasure" onclick={runProbes} disabled={running}>
            {running ? 'probing…' : 'Re-run probes'}
        </button>
    </div>

    <div class="test-container" style="height: {VIEWPORT_HEIGHT_PX}px;">
        <SvelteVirtualList
            defaultEstimatedItemHeight={ITEM_HEIGHT_PX}
            {items}
            testId="issue-165-list"
            bind:this={listRef}
        >
            {#snippet renderItem(item)}
                <div
                    class="fixed-item"
                    style="height: {ITEM_HEIGHT_PX}px;"
                    data-testid="issue-165-item-{item.id}"
                >
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
        grid-template-columns: 22px 220px minmax(160px, auto) 1fr;
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

    .label,
    .value {
        font-weight: 600;
    }

    .value {
        font-variant-numeric: tabular-nums;
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

    /* Warning-red backdrop: any unrendered viewport region stays visibly red. */
    .test-container {
        width: 100%;
        background: #ffc2c2;
    }

    .fixed-item {
        box-sizing: border-box;
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
        background: #fff;
        font-size: 14px;
    }
</style>
