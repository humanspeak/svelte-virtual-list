<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
        text: string
        heightPx: number
    }

    // Variable-height items so estimate misses CANNOT self-heal: the average
    // estimate converges to ~300px (the cycle mean), but every individual
    // unmeasured item is wrong by up to 400px. Scrolling up through the
    // backlog forces a measurement correction on nearly every item — and the
    // component must hide each one, however wrong the estimate was.
    const HEIGHT_CYCLE = [64, 96, 128, 512, 700]
    const ITEM_COUNT = 300
    const SWEEP_STEP_PX = 250
    const SWEEP_STEPS = 40
    const JUMP_TOLERANCE_PX = 3

    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        heightPx: HEIGHT_CYCLE[i % HEIGHT_CYCLE.length]
    }))

    type SweepResult = {
        jumps: number
        maxJumpPx: number
        totalJumpPx: number
        samples: number
    }

    let heightsMatch = $state<boolean | null>(null)
    let sweep = $state<SweepResult | null>(null)
    let sweepRunning = $state(false)

    const sweepPass = $derived(sweep !== null && sweep.maxJumpPx <= JUMP_TOLERANCE_PX)

    const getViewport = (): HTMLElement | null =>
        document.querySelector('[data-testid="issue-413-list-viewport"]')

    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
    const settle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    /** Fixture sanity: rendered wrappers must be exactly their declared height. */
    const verifyHeights = () => {
        const viewport = getViewport()
        if (!viewport) return
        const wrappers = Array.from(
            viewport.querySelectorAll('[data-original-index]')
        ) as HTMLElement[]
        if (wrappers.length < 2) return
        heightsMatch = wrappers.every((w) => {
            const index = parseInt(w.dataset.originalIndex ?? '-1', 10)
            return (
                index >= 0 &&
                Math.abs(
                    w.getBoundingClientRect().height - HEIGHT_CYCLE[index % HEIGHT_CYCLE.length]
                ) < 0.5
            )
        })
    }

    /**
     * Backlog sweep: jump to the bottom (measuring the tail), then scroll UP
     * at a constant rate through items that have never been measured. Content
     * must move down by exactly the scrolled distance each step — any
     * deviation is an estimate-miss correction painting as a lurch.
     */
    const runSweep = async () => {
        const viewport = getViewport()
        if (!viewport || sweepRunning) return
        sweepRunning = true
        sweep = null

        // Deep-end start: everything above the last screen is unmeasured.
        viewport.scrollTop = viewport.scrollHeight
        await settle(400)

        // Track EVERY rendered item, not one: batched corrections can net to
        // zero for a single tracked item (this fixture's cycle sums to the
        // mean) while items between the corrected ones visibly rearrange.
        const snapshotPositions = (): Map<number, number> => {
            const positions = new Map<number, number>()
            for (const el of Array.from(
                viewport.querySelectorAll('[data-original-index]')
            ) as HTMLElement[]) {
                const index = parseInt(el.dataset.originalIndex ?? '-1', 10)
                if (index >= 0) positions.set(index, el.getBoundingClientRect().top)
            }
            return positions
        }

        const result: SweepResult = { jumps: 0, maxJumpPx: 0, totalJumpPx: 0, samples: 0 }

        for (let step = 0; step < SWEEP_STEPS; step++) {
            if (viewport.scrollTop <= 0) break

            const before = snapshotPositions()
            const target = Math.max(0, viewport.scrollTop - SWEEP_STEP_PX)
            const applied = viewport.scrollTop - target
            viewport.scrollTop = target
            await nextFrame()
            await nextFrame()
            const after = snapshotPositions()

            // Scrolling up: content moves down by exactly the scrolled
            // distance. The step's jump is the worst deviation across all
            // items that stayed rendered.
            let stepJump = -1
            for (const [index, beforeTop] of before) {
                const afterTop = after.get(index)
                if (afterTop === undefined) continue
                stepJump = Math.max(stepJump, Math.abs(afterTop - beforeTop - applied))
            }

            if (stepJump < 0) continue
            if (stepJump > 1) result.jumps++
            result.maxJumpPx = Math.max(result.maxJumpPx, Math.round(stepJump * 10) / 10)
            result.totalJumpPx = Math.round((result.totalJumpPx + stepJump) * 10) / 10
            result.samples++
        }

        sweep = result
        sweepRunning = false
    }

    const remeasure = async () => {
        verifyHeights()
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
    <h1>Issue #413 — estimate-miss corrections paint jumps while scrolling backlog</h1>

    <div class="description">
        <p>
            <strong>What:</strong>
            {ITEM_COUNT} items with heights cycling through
            <code>{HEIGHT_CYCLE.join(' / ')}px</code>. The average estimate converges to the cycle
            mean (~300px), but every individual unmeasured item is wrong by up to
            <strong>400px</strong> — variable heights mean the misses cannot self-heal. The sweep jumps
            to the bottom, then scrolls up through backlog that has never been measured.
        </p>
        <p>
            <strong>Why it's bad:</strong> when an unmeasured item scrolls into range it gets
            measured, and the correction shifts all content below it by the full estimate error. The
            component preserves position only at the bottom; mid-list there is no anchor restore at
            all (and <code>overflow-anchor: none</code> disables the browser's own), so every correction
            paints as a visible lurch — once per item, for the whole backlog.
        </p>
        <p>
            <strong>How it's measured:</strong> the sweep scrolls up {SWEEP_STEP_PX}px per step and
            tracks <em>every</em> rendered item across frames (batched corrections can cancel out for
            any single item while its neighbors rearrange). Content must move down by exactly the scrolled
            distance — the step's jump is the worst deviation across all items that stayed rendered.
        </p>
    </div>

    <div class="stats" data-testid="issue-413-stats">
        <div class="stat" class:pass={heightsMatch === true} class:fail={heightsMatch === false}>
            <span class="light">{heightsMatch === null ? '…' : heightsMatch ? '✓' : '✗'}</span>
            <span class="label">rendered heights match declared</span>
            <span class="value" data-testid="stat-heights-match">
                {heightsMatch === null ? '—' : heightsMatch ? 'yes' : 'no'}
            </span>
            <span class="expected">fixture sanity: wrappers must be exactly their cycle height</span
            >
        </div>

        <div class="stat" class:pass={sweepPass} class:fail={sweep !== null && !sweepPass}>
            <span class="light"
                >{sweep === null ? (sweepRunning ? '⟳' : '…') : sweepPass ? '✓' : '✗'}</span
            >
            <span class="label">painted jumps during backlog sweep</span>
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
            <span class="expected">
                maxJumpPx must be ≤{JUMP_TOLERANCE_PX}px over {SWEEP_STEPS} upward {SWEEP_STEP_PX}px
                steps
            </span>
        </div>

        <button class="remeasure" onclick={remeasure} disabled={sweepRunning}>
            {sweepRunning ? 'sweeping…' : 'Re-run sweep'}
        </button>
    </div>

    <div class="test-container" style="height: 500px;">
        <SvelteVirtualList defaultEstimatedItemHeight={40} {items} testId="issue-413-list">
            {#snippet renderItem(item)}
                <div
                    class="variable-item"
                    style="height: {item.heightPx}px;"
                    data-testid="variable-item-{item.id}"
                >
                    {item.text} — {item.heightPx}px
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

    .test-container {
        width: 100%;
        border: 1px solid #eee;
    }

    .variable-item {
        box-sizing: border-box;
        padding: 8px;
        background: #fef3e8;
        border-bottom: 1px solid #f0ddc8;
        font-size: 14px;
    }
</style>
