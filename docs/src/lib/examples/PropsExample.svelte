<script lang="ts">
    import VirtualList, { type SvelteVirtualListDebugInfo } from '@humanspeak/svelte-virtual-list'

    const items = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        note: i % 4 === 0 ? 'measured row' : i % 4 === 1 ? 'buffer candidate' : 'stable offset'
    }))

    let bufferSize = $state(20)
    let estimatedHeight = $state(40)
    let debug = $state(true)
    let debugInfo = $state<SvelteVirtualListDebugInfo | null>(null)

    const visibleRange = $derived(
        debugInfo ? `${debugInfo.startIndex}-${debugInfo.endIndex}` : 'pending'
    )

    function handleDebug(info: SvelteVirtualListDebugInfo) {
        debugInfo = info
    }
</script>

<div class="demo-shell">
    <div class="demo-toolbar">
        <label for="buffer-input" class="flex items-center gap-2">
            <span class="demo-label">buffer</span>
            <input
                id="buffer-input"
                type="number"
                bind:value={bufferSize}
                min="1"
                max="50"
                class="demo-input"
            />
        </label>

        <label for="height-input" class="flex items-center gap-2">
            <span class="demo-label">estimated</span>
            <input
                id="height-input"
                type="number"
                bind:value={estimatedHeight}
                min="20"
                max="100"
                class="demo-input"
            />
        </label>

        <label for="debug-toggle" class="flex items-center gap-2">
            <span class="demo-label">debug</span>
            <input id="debug-toggle" type="checkbox" bind:checked={debug} class="demo-check" />
        </label>

        <div class="demo-meta">
            <span><span>range ·</span> {visibleRange}</span>
            <span
                ><span>measured ·</span>
                {debugInfo?.processedItems ?? 0}</span
            >
            <span class="demo-status">● {debug ? 'debug on' : 'debug off'}</span>
        </div>
    </div>

    <div class="min-h-0 flex-1 p-3">
        <div class="demo-frame">
            <div class="demo-section-label">out / rendered props</div>
            <div class="h-[calc(100%-35px)]">
                {#key `${bufferSize}-${estimatedHeight}-${debug}`}
                    <VirtualList
                        {items}
                        {bufferSize}
                        defaultEstimatedItemHeight={estimatedHeight}
                        {debug}
                        debugFunction={handleDebug}
                    >
                        {#snippet renderItem(item)}
                            <div class="demo-row">
                                <span class="demo-row-title">Item {item.id}</span>
                                <span class="demo-row-note">
                                    {item.note}
                                </span>
                            </div>
                        {/snippet}
                    </VirtualList>
                {/key}
            </div>
        </div>
    </div>

    <div class="demo-foot">
        <div>
            <span>items ·</span>
            {items.length}
        </div>
        <div>
            <span>visible ·</span>
            {debugInfo?.visibleItemsCount ?? 'pending'}
        </div>
        <div>
            <span>avg height ·</span>
            {debugInfo ? `${debugInfo.averageItemHeight.toFixed(1)}px` : `${estimatedHeight}px`}
        </div>
        <div>
            <span>total height ·</span>
            {debugInfo ? `${Math.round(debugInfo.totalHeight)}px` : 'pending'}
        </div>
    </div>
</div>

<style>
    .demo-shell {
        display: flex;
        height: 340px;
        width: 100%;
        flex-direction: column;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }

    .demo-toolbar {
        display: flex;
        min-height: 44px;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        padding: 8px 16px;
    }

    .demo-label,
    .demo-meta span span,
    .demo-section-label,
    .demo-row-note,
    .demo-foot span {
        color: var(--brut-ink-3);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    .demo-input {
        height: 28px;
        width: 64px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        padding: 0 8px;
        font: inherit;
        font-size: 14px;
    }

    .demo-check {
        width: 16px;
        height: 16px;
        accent-color: var(--brut-accent);
    }

    .demo-meta {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 20px;
        color: var(--brut-ink);
        font-size: 12px;
    }

    .demo-status {
        color: var(--brut-accent);
    }

    .demo-frame {
        height: 100%;
        overflow: hidden;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }

    .demo-section-label {
        border-bottom: 1px solid var(--brut-rule);
        padding: 8px 16px;
        letter-spacing: 0.2em;
    }

    .demo-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid var(--brut-rule);
        padding: 12px 16px;
    }

    .demo-row:hover {
        background: var(--brut-bg-2);
    }

    .demo-row-title {
        color: var(--brut-ink);
        font-size: 14px;
        font-weight: 600;
    }

    .demo-row-note {
        font-size: 10px;
        letter-spacing: 0.12em;
    }

    .demo-foot {
        display: grid;
        min-height: 32px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        border-top: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink);
        font-size: 12px;
    }

    .demo-foot div {
        border-right: 1px solid var(--brut-rule);
        padding: 8px 16px;
    }

    .demo-foot div:last-child {
        border-right: 0;
    }

    @media (max-width: 720px) {
        .demo-shell {
            height: auto;
            min-height: 420px;
        }

        .demo-meta {
            margin-left: 0;
            width: 100%;
            flex-wrap: wrap;
            gap: 10px 16px;
        }

        .demo-foot {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .demo-foot div:nth-child(2n) {
            border-right: 0;
        }
    }
</style>
