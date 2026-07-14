<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
        text: string
    }

    // 200k items: large enough that an O(n) prefix walk near the tail is
    // orders of magnitude more work than the same walk near the head.
    const ITEM_COUNT = 200_000
    const ITEM_HEIGHT_PX = 40
    const STEP_PX = 1_000
    const STEPS = 15
    const RATIO_LIMIT = 3

    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    let headMs = $state<number | null>(null)
    let tailMs = $state<number | null>(null)
    let ratio = $state<number | null>(null)
    let running = $state(false)

    const ratioPass = $derived(ratio !== null && ratio < RATIO_LIMIT)

    const getViewport = (): HTMLElement | null =>
        document.querySelector('[data-testid="tail-cost-list-viewport"]')

    const settle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

    const median = (values: number[]): number => {
        const sorted = [...values].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    /**
     * Times STEPS scroll steps of STEP_PX each: scrollTop += step, then wait
     * for the next animation frame so the visible-range recompute and paint
     * are inside the measured window. Returns the median step cost in ms.
     */
    const timeScrollSteps = async (viewport: HTMLElement): Promise<number> => {
        const samples: number[] = []
        for (let i = 0; i < STEPS; i++) {
            const start = performance.now()
            viewport.scrollTop += STEP_PX
            await nextFrame()
            samples.push(performance.now() - start)
            // Delay between steps is excluded from the timing.
            await settle(50)
        }
        return median(samples)
    }

    const runProbe = async () => {
        const viewport = getViewport()
        if (!viewport || running) return
        running = true
        headMs = null
        tailMs = null
        ratio = null

        // Settle at the top, then time the head steps.
        viewport.scrollTop = 0
        await settle(400)
        const head = await timeScrollSteps(viewport)

        // Jump to ~95% depth, settle, and repeat the identical steps.
        const maxScrollTop = viewport.scrollHeight - viewport.clientHeight
        viewport.scrollTop = Math.floor(maxScrollTop * 0.95)
        await settle(400)
        const tail = await timeScrollSteps(viewport)

        headMs = Math.round(head * 100) / 100
        tailMs = Math.round(tail * 100) / 100
        // Some engines coarsen performance.now() to ~1ms ticks (WebKit), so
        // sub-ms medians quantize to 0 and one or two ticks of paint noise at
        // the tail could fabricate a huge ratio against a zero head. Floor
        // both medians at two clock ticks: quantization then reads as ratio
        // ~1-2, while a real O(n) tail regression (tens of ms of prefix
        // walking against a ~0ms head) still trips the limit unmistakably.
        const FLOOR_MS = 2
        ratio = Math.round((Math.max(tail, FLOOR_MS) / Math.max(head, FLOOR_MS)) * 100) / 100
        running = false
    }

    onMount(() => {
        const timer = setTimeout(runProbe, 500)
        return () => clearTimeout(timer)
    })
</script>

<div class="page">
    <h1>Tail scroll cost — end-of-list scrolling must not pay O(n)</h1>

    <div class="description">
        <p>
            <strong>What:</strong> the visible-range and transform math walk item heights to turn a
            <code>scrollTop</code> into a start index and pixel offset. Without block prefix-sum acceleration
            those walks start at index 0, so their cost grows linearly with scroll depth: near item 190,000
            every scroll frame walks ~190,000 height lookups that a frame near the top never pays.
        </p>
        <p>
            <strong>Why it's bad:</strong> the same gesture gets slower the deeper the user scrolls —
            the end of a large list is measurably heavier than the top, on a component that advertises
            O(1) height management.
        </p>
        <p>
            <strong>How it's measured:</strong> the probe settles at the top and performs {STEPS}
            scroll steps of {STEP_PX}px, timing each <code>scrollTop += step</code> to the next
            animation frame; the median is <code>headMs</code>. It then jumps to ~95% depth and
            repeats the identical steps for <code>tailMs</code>. The pass condition is
            <code>ratio &lt; {RATIO_LIMIT}</code> — a generous regression tripwire, not a benchmark; the
            precise gate is the read-budget unit tests.
        </p>
    </div>

    <div class="stats" data-testid="tail-cost-stats">
        <div class="stat" class:pass={ratioPass} class:fail={ratio !== null && !ratioPass}>
            <span class="light"
                >{ratio === null ? (running ? '⟳' : '…') : ratioPass ? '✓' : '✗'}</span
            >
            <span class="label">tail steps cost like head steps</span>
            <span class="value" data-testid="stat-tailcost">
                headMs={headMs ?? '—'} tailMs={tailMs ?? '—'} ratio={ratio ?? '—'}
            </span>
            <span class="expected">
                ratio must stay below {RATIO_LIMIT} — anything higher means scroll depth is buying back
                the O(n) walk
            </span>
        </div>

        <button class="remeasure" onclick={runProbe} disabled={running}>
            {running ? 'probing…' : 'Re-run probe'}
        </button>
    </div>

    <div class="test-container">
        <SvelteVirtualList
            defaultEstimatedItemHeight={ITEM_HEIGHT_PX}
            {items}
            testId="tail-cost-list"
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

    /* Solid failure backdrop: if the list fails to render, this red shows. */
    .test-container {
        width: 100%;
        height: 500px;
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
