<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'
    import type { SvelteVirtualListRangeInfo } from '$lib/types.js'

    type Item = {
        id: number
        text: string
    }

    const ITEM_COUNT = 1000
    const ITEM_HEIGHT_PX = 40

    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    // Live tally of the public onRangeChange channel. `calls` counts every
    // delivery so the dedupe behaviour is observable; `latest` is the most
    // recent payload the component handed us.
    let calls = $state(0)
    let latest = $state<SvelteVirtualListRangeInfo | null>(null)
    let running = $state(false)

    const handleRangeChange = (range: SvelteVirtualListRangeInfo) => {
        calls += 1
        latest = range
    }

    const getViewport = (): HTMLElement | null =>
        document.querySelector('[data-testid="range-callback-list-viewport"]')

    const settle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    // After mount the list settles at the top; the probe then scrolls the
    // viewport all the way to the bottom so the spec can assert atBottom=1
    // and end=ITEM_COUNT arrive through the callback.
    const runProbe = async () => {
        const viewport = getViewport()
        if (!viewport || running) return
        running = true

        viewport.scrollTop = 0
        await settle(300)

        viewport.scrollTop = viewport.scrollHeight
        await settle(600)

        running = false
    }

    onMount(() => {
        const timer = setTimeout(runProbe, 500)
        return () => clearTimeout(timer)
    })

    const b = (v: boolean) => (v ? 1 : 0)
</script>

<div class="page">
    <h1>onRangeChange — public visible-range / scroll-edge callback</h1>

    <div class="description">
        <p>
            <strong>What:</strong> the list exposes a first-class
            <code>onRangeChange</code> prop that fires whenever the rendered range or the
            at-top/at-bottom state changes. It delivers a trimmed
            <code>{'{ start, end, atTop, atBottom }'}</code> payload — no debug gating and no console
            noise — for impression tracking, URL sync, or scroll-position persistence.
        </p>
        <p>
            <strong>How it's measured:</strong> the handler counts every delivery and records the
            latest payload. The probe settles the list at the top, then scrolls the viewport to
            <code>scrollHeight</code>. Identical payloads are de-duplicated, so
            <code>calls</code> only grows on real range/edge changes.
        </p>
    </div>

    <div class="stats" data-testid="range-callback-stats">
        <div class="stat" class:running>
            <span class="light">{running ? '⟳' : latest ? '✓' : '…'}</span>
            <span class="label">range callback</span>
            <span class="value" data-testid="stat-range">
                calls={calls} start={latest?.start ?? '—'} end={latest?.end ?? '—'} atTop={latest
                    ? b(latest.atTop)
                    : '—'} atBottom={latest ? b(latest.atBottom) : '—'}
            </span>
            <span class="expected">
                after mount: start=0 atTop=1; after scroll-to-bottom: end={ITEM_COUNT} atBottom=1
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
            testId="range-callback-list"
            onRangeChange={handleRangeChange}
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
        grid-template-columns: 22px 160px minmax(320px, auto) 1fr;
        gap: 8px;
        align-items: baseline;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #e5e5e5;
        background: #f6f6f6;
    }

    .stat.running {
        background: #eef2f7;
    }

    .light {
        font-weight: 700;
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

    .test-container {
        width: 100%;
        height: 400px;
        background: #f0f0f0;
    }

    .fixed-item {
        box-sizing: border-box;
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
        background: #fff;
        font-size: 14px;
    }
</style>
