<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
        text: string
    }

    // Fixed-size items whose ONLY variable is the CSS margin: content is a
    // 100px border box with margin: 12px 0. The margins collapse through the
    // component's unstyled item wrappers, so a border-box measurement reads
    // 100px while the real layout pitch (offsetTop delta between neighbors)
    // is 112px. The estimate is pinned to the border box (100) so any height
    // the cache learns beyond that must come from measuring margins.
    const ITEM_COUNT = 500
    const BORDER_BOX_PX = 100
    const MARGIN_PX = 12
    const REAL_PITCH_PX = BORDER_BOX_PX + MARGIN_PX
    const SWEEP_STEPS = 25
    const PITCH_TOLERANCE_PX = 1.5
    const JUMP_TOLERANCE_PX = 3

    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    type SweepResult = {
        jumps: number
        maxJumpPx: number
        totalJumpPx: number
        samples: number
    }

    let realPitch = $state<number | null>(null)
    let cachePitch = $state<number | null>(null)
    let scrollHeightPx = $state<number | null>(null)
    let sweep = $state<SweepResult | null>(null)
    let sweepRunning = $state(false)

    const marginLossPx = $derived(
        realPitch !== null && cachePitch !== null
            ? Math.round((realPitch - cachePitch) * 10) / 10
            : null
    )
    const expectedScrollHeight = $derived(realPitch !== null ? ITEM_COUNT * realPitch : null)
    const missingPx = $derived(
        expectedScrollHeight !== null && scrollHeightPx !== null
            ? expectedScrollHeight - scrollHeightPx
            : null
    )

    const pitchPass = $derived(
        realPitch !== null &&
            cachePitch !== null &&
            Math.abs(cachePitch - realPitch) <= PITCH_TOLERANCE_PX
    )
    const sweepPass = $derived(sweep !== null && sweep.maxJumpPx <= JUMP_TOLERANCE_PX)

    const getViewport = (): HTMLElement | null =>
        document.querySelector('[data-testid="issue-412-list-viewport"]')

    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

    const measurePitchStats = () => {
        const viewport = getViewport()
        if (!viewport) return
        const wrappers = Array.from(
            viewport.querySelectorAll('[data-original-index]')
        ) as HTMLElement[]
        if (wrappers.length >= 2) {
            realPitch = wrappers[1].offsetTop - wrappers[0].offsetTop
        }
        scrollHeightPx = viewport.scrollHeight
        cachePitch = Math.round((viewport.scrollHeight / ITEM_COUNT) * 10) / 10
    }

    /**
     * Constant-rate scroll sweep: scroll exactly one pitch per step and track
     * a mid-window item across frames. Content must move by exactly the
     * scrolled distance — any deviation is a painted jump the user sees.
     */
    const runSweep = async () => {
        const viewport = getViewport()
        if (!viewport || sweepRunning) return
        sweepRunning = true
        sweep = null

        viewport.scrollTop = 2000
        await nextFrame()
        await nextFrame()

        const rectTopOf = (index: number): number | null => {
            const el = viewport.querySelector(
                `[data-original-index="${index}"]`
            ) as HTMLElement | null
            return el ? el.getBoundingClientRect().top : null
        }
        const midRenderedIndex = (): number => {
            const rendered = Array.from(
                viewport.querySelectorAll('[data-original-index]')
            ) as HTMLElement[]
            return parseInt(
                rendered[Math.floor(rendered.length / 2)]?.dataset.originalIndex ?? '-1',
                10
            )
        }

        let trackedIndex = midRenderedIndex()
        const result: SweepResult = { jumps: 0, maxJumpPx: 0, totalJumpPx: 0, samples: 0 }

        for (let step = 0; step < SWEEP_STEPS; step++) {
            if (rectTopOf(trackedIndex) === null) trackedIndex = midRenderedIndex()

            const before = rectTopOf(trackedIndex)
            viewport.scrollTop += REAL_PITCH_PX
            await nextFrame()
            await nextFrame()
            const after = rectTopOf(trackedIndex)

            if (before === null || after === null) continue
            const jump = Math.abs(after - before + REAL_PITCH_PX)
            if (jump > 1) result.jumps++
            result.maxJumpPx = Math.max(result.maxJumpPx, Math.round(jump * 10) / 10)
            result.totalJumpPx = Math.round((result.totalJumpPx + jump) * 10) / 10
            result.samples++
        }

        sweep = result
        sweepRunning = false
        // Re-sample totals after the sweep — measuring while scrolled deep
        // reflects what the cache has learned across the swept range.
        measurePitchStats()
    }

    const remeasure = async () => {
        const viewport = getViewport()
        if (viewport) {
            viewport.scrollTop = 0
            await nextFrame()
            await nextFrame()
        }
        measurePitchStats()
        await runSweep()
    }

    onMount(() => {
        // Let the post-hydration measurement pass and debounced height
        // recalculation settle before sampling geometry.
        const timer = setTimeout(remeasure, 800)
        return () => clearTimeout(timer)
    })
</script>

<div class="page">
    <h1>Issue #412 — item margins escape height measurement</h1>

    <div class="description">
        <p>
            <strong>What:</strong> 500 items, each a <code>{BORDER_BOX_PX}px</code> border box with
            <code>margin: {MARGIN_PX}px 0</code>. The margins collapse through the component's
            unstyled item wrappers, so the real layout pitch is
            <strong>{REAL_PITCH_PX}px</strong> while a border-box measurement reads
            <strong>{BORDER_BOX_PX}px</strong>. The height estimate is pinned to the border box, so
            any pitch the cache learns beyond {BORDER_BOX_PX}px must come from measuring margins.
        </p>
        <p>
            <strong>Why it's bad:</strong> when margins escape, <code>totalHeight</code> runs
            {MARGIN_PX}px/item short (−{ITEM_COUNT * MARGIN_PX}px of scrollable content on this
            fixture) and content visibly jumps by the lost margin every time the render-range
            boundary advances while scrolling — a {MARGIN_PX}px sawtooth, roughly once per item.
        </p>
        <p>
            <strong>How it's measured:</strong> real pitch is the <code>offsetTop</code> delta
            between neighboring rendered wrappers (layout ground truth); cache pitch is
            <code>scrollHeight ÷ {ITEM_COUNT}</code> (what the component believes). The sweep scrolls
            exactly one pitch per step and tracks a mid-window item — any deviation between scrolled distance
            and painted movement is a jump the user sees.
        </p>
    </div>

    <div class="stats" data-testid="issue-412-stats">
        <div
            class="stat"
            class:pass={realPitch === REAL_PITCH_PX}
            class:fail={realPitch !== null && realPitch !== REAL_PITCH_PX}
        >
            <span class="light"
                >{realPitch === null ? '…' : realPitch === REAL_PITCH_PX ? '✓' : '✗'}</span
            >
            <span class="label">real layout pitch</span>
            <span class="value" data-testid="stat-real-pitch">{realPitch ?? '—'}px</span>
            <span class="expected">fixture sanity: must be {REAL_PITCH_PX}px</span>
        </div>

        <div class="stat" class:pass={pitchPass} class:fail={cachePitch !== null && !pitchPass}>
            <span class="light">{cachePitch === null ? '…' : pitchPass ? '✓' : '✗'}</span>
            <span class="label">cache-implied pitch</span>
            <span class="value" data-testid="stat-cache-pitch">{cachePitch ?? '—'}px</span>
            <span class="expected">must match real pitch ±{PITCH_TOLERANCE_PX}px</span>
        </div>

        <div class="stat" class:pass={pitchPass} class:fail={marginLossPx !== null && !pitchPass}>
            <span class="light">{marginLossPx === null ? '…' : pitchPass ? '✓' : '✗'}</span>
            <span class="label">margin loss per item</span>
            <span class="value" data-testid="stat-margin-loss">{marginLossPx ?? '—'}px</span>
            <span class="expected">should be 0px — {MARGIN_PX}px means the margin escaped</span>
        </div>

        <div class="stat" class:pass={pitchPass} class:fail={missingPx !== null && !pitchPass}>
            <span class="light">{missingPx === null ? '…' : pitchPass ? '✓' : '✗'}</span>
            <span class="label">missing scrollable content</span>
            <span class="value" data-testid="stat-missing-px">{missingPx ?? '—'}px</span>
            <span class="expected"
                >scrollHeight {scrollHeightPx ?? '—'}px vs real {expectedScrollHeight ??
                    '—'}px</span
            >
        </div>

        <div class="stat" class:pass={sweepPass} class:fail={sweep !== null && !sweepPass}>
            <span class="light"
                >{sweep === null ? (sweepRunning ? '⟳' : '…') : sweepPass ? '✓' : '✗'}</span
            >
            <span class="label">painted jumps during sweep</span>
            <span class="value" data-testid="stat-sweep">
                {#if sweep}
                    jumps={sweep.jumps} maxJumpPx={sweep.maxJumpPx} totalJumpPx={sweep.totalJumpPx}
                    samples={sweep.samples}
                {:else if sweepRunning}
                    running…
                {:else}
                    —
                {/if}
            </span>
            <span class="expected"
                >maxJumpPx must be ≤{JUMP_TOLERANCE_PX}px over {SWEEP_STEPS} one-pitch steps</span
            >
        </div>

        <button class="remeasure" onclick={remeasure} disabled={sweepRunning}>
            {sweepRunning ? 'sweeping…' : 'Re-measure'}
        </button>
    </div>

    <div class="test-container" style="height: 500px;">
        <SvelteVirtualList defaultEstimatedItemHeight={100} {items} testId="issue-412-list">
            {#snippet renderItem(item)}
                <div class="margin-item" data-testid="margin-item-{item.id}">
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
        grid-template-columns: 22px 190px minmax(120px, auto) 1fr;
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

    .test-container {
        width: 100%;
        border: 1px solid #eee;
    }

    .margin-item {
        box-sizing: border-box;
        height: 100px;
        margin: 12px 0;
        padding: 8px;
        background: #e8f0fe;
        border-radius: 8px;
        font-size: 14px;
    }
</style>
