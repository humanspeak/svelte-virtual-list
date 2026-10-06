<script lang="ts">
    import VirtualList, { type SvelteVirtualListRangeInfo } from '@humanspeak/svelte-virtual-list'

    const rows = Array.from({ length: 100 }, (_, id) => ({ id }))
    let empty = $state(false)
    let expandedHeader = $state(false)
    let expandedFooter = $state(false)
    const headerHeight = $derived(expandedHeader ? 160 : 56)
    const footerHeight = $derived(expandedFooter ? 144 : 56)
    let list = $state<VirtualList<{ id: number }>>()
    let range = $state<SvelteVirtualListRangeInfo>()
    const items = $derived(empty ? [] : rows)
</script>

<div class="demo-shell">
    <div class="controls">
        <button
            onclick={() => list?.scroll({ index: 40, align: 'start', smoothScroll: false })}
            disabled={empty}
        >
            Align row 40
        </button>
        <button onclick={() => list?.scrollToOffset({ offset: 0 })}>Jump to start</button>
        <button onclick={() => list?.scrollToOffset({ offset: 100000 })}>Jump to end</button>
        <button aria-pressed={expandedHeader} onclick={() => (expandedHeader = !expandedHeader)}>
            {expandedHeader ? 'Shrink header' : 'Grow header'}
        </button>
        <button aria-pressed={expandedFooter} onclick={() => (expandedFooter = !expandedFooter)}>
            {expandedFooter ? 'Shrink footer' : 'Grow footer'}
        </button>
        <button aria-pressed={empty} onclick={() => (empty = !empty)}>
            {empty ? 'Restore rows' : 'Remove rows'}
        </button>
    </div>
    <p class="instructions">
        Align row 40, then grow the header: your reading row stays put. Jump to end and grow the
        footer to keep the end in view. Remove rows to see the snippets without any items.
    </p>
    <div class="viewport">
        <VirtualList
            bind:this={list}
            {items}
            itemKey={(item) => item.id}
            defaultEstimatedItemHeight={32}
            onRangeChange={(value) => (range = value)}
        >
            {#snippet header()}
                <div class="header" style:height="{headerHeight}px">
                    <strong>Header · {headerHeight}px</strong>
                    <span>Measured content before the rows</span>
                </div>
            {/snippet}
            {#snippet renderItem(item)}
                <div class="row" data-index={item.id}>Item {item.id}</div>
            {/snippet}
            {#snippet footer()}
                <div class="footer" style:height="{footerHeight}px">
                    <strong>Footer · {footerHeight}px</strong>
                    <span>Measured content after the rows</span>
                </div>
            {/snippet}
        </VirtualList>
    </div>
    <div class="stats" aria-live="polite">
        <span>rows · {items.length}</span>
        <span
            >rendered · {range && range.end > range.start
                ? `${range.start}–${range.end - 1}`
                : 'none'}</span
        >
        <span>position · {range?.atTop ? 'start' : range?.atBottom ? 'end' : 'reading'}</span>
    </div>
</div>

<style>
    .demo-shell {
        width: 100%;
        color: var(--brut-ink);
        background: var(--brut-bg);
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 13px;
    }
    .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px;
        border-bottom: 1px solid var(--brut-rule);
    }
    button {
        padding: 7px 10px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink);
        font: inherit;
        cursor: pointer;
    }
    button:hover,
    button[aria-pressed='true'] {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    button:disabled {
        opacity: 0.5;
        cursor: default;
    }
    button:focus-visible {
        outline: 2px solid var(--brut-accent);
        outline-offset: 2px;
    }
    .instructions {
        margin: 0;
        padding: 12px;
        color: var(--brut-ink-2);
        font-size: 12px;
        line-height: 1.5;
        border-bottom: 1px solid var(--brut-rule);
    }
    .viewport {
        height: 320px;
    }
    .header,
    .footer {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        padding: 8px 12px;
        background: var(--brut-bg-2);
        border-block: 1px solid var(--brut-rule);
    }
    .header strong,
    .footer strong {
        color: var(--brut-accent);
    }
    .header span,
    .footer span {
        color: var(--brut-ink-3);
        font-size: 11px;
    }
    .row {
        box-sizing: border-box;
        height: 32px;
        padding: 6px 12px;
        line-height: 19px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .row[data-index='40'] {
        color: var(--brut-accent);
        background: var(--brut-bg-2);
    }
    .stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 24px;
        padding: 12px;
        border-top: 1px solid var(--brut-rule);
        color: var(--brut-ink-2);
        font-size: 12px;
    }
</style>
