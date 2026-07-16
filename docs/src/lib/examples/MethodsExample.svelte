<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type Align = 'auto' | 'top' | 'bottom' | 'nearest' | 'center'

    type ListRef = {
        scroll: (_options: {
            index: number
            smoothScroll?: boolean
            align?: Align
            shouldThrowOnBounds?: boolean
        }) => Promise<void>
    }

    let listRef: ListRef | undefined = $state(undefined)
    let targetIndex = $state(500)
    let smoothScroll = $state(true)
    let align = $state<Align>('auto')
    let demoFrame: HTMLDivElement | undefined = $state(undefined)
    let domRows = $state(0)
    let domNodes = $state(0)
    let firstIndex = $state(0)
    let lastIndex = $state(0)

    const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        highlighted: i === 0 || i === 500 || i === 999,
        meta:
            i === 0
                ? 'first row'
                : i === 500
                  ? 'target row'
                  : i === 999
                    ? 'last row'
                    : 'stable offset'
    }))

    const clampIndex = (index: number) => Math.max(0, Math.min(items.length - 1, Math.round(index)))

    function updateStats() {
        if (!demoFrame) return

        const rows = Array.from(demoFrame.querySelectorAll<HTMLElement>('.demo-row'))
        domRows = rows.length
        domNodes = demoFrame.querySelectorAll('*').length

        const indices = rows
            .map((row) => row.dataset.index)
            .filter((value): value is string => Boolean(value))
            .map(Number)

        if (indices.length > 0) {
            firstIndex = indices[0]
            lastIndex = indices[indices.length - 1]
        }
    }

    function scrollTo(index = targetIndex, nextAlign = align) {
        targetIndex = clampIndex(index)
        align = nextAlign
        void listRef?.scroll({ index: targetIndex, smoothScroll, align: nextAlign })
    }

    $effect(() => {
        if (typeof window === 'undefined' || !demoFrame) return
        updateStats()
        const intervalId = window.setInterval(updateStats, 250)
        return () => window.clearInterval(intervalId)
    })
</script>

<div class="demo-shell">
    <div class="demo-telemetry">
        <label>
            <span>index</span>
            <input
                type="number"
                bind:value={targetIndex}
                min="0"
                max={items.length - 1}
                aria-label="Target item index"
            />
        </label>
        <label>
            <span>align</span>
            <select bind:value={align} aria-label="Scroll alignment">
                <option value="auto">auto</option>
                <option value="top">top</option>
                <option value="bottom">bottom</option>
                <option value="nearest">nearest</option>
                <option value="center">center</option>
            </select>
        </label>
        <label class="check">
            <input type="checkbox" bind:checked={smoothScroll} />
            <span>smooth</span>
        </label>
        <button type="button" class="run" onclick={() => scrollTo()}>run</button>
        <button type="button" onclick={() => scrollTo(0, 'top')}>first</button>
        <button type="button" onclick={() => scrollTo(500, 'center')}>middle</button>
        <button type="button" onclick={() => scrollTo(items.length - 1, 'bottom')}>last</button>
        <div class="status">● ready</div>
    </div>

    <div class="demo-frame" bind:this={demoFrame}>
        <VirtualList {items} bind:this={listRef}>
            {#snippet renderItem(item)}
                <div class:highlighted={item.highlighted} class="demo-row" data-index={item.id}>
                    <strong>{item.text}</strong>
                    <span>{item.meta}</span>
                </div>
            {/snippet}
        </VirtualList>
    </div>

    <div class="demo-foot">
        <div>method · <span>scroll()</span></div>
        <div>target · <span>{targetIndex}</span></div>
        <div>range · <span>{firstIndex}-{lastIndex}</span></div>
        <div>dom rows · <span>{domRows}</span></div>
        <div>dom nodes · <span>{domNodes}</span></div>
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

    .demo-telemetry,
    .demo-foot {
        display: grid;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink-3);
        font-size: 11px;
    }

    .demo-telemetry {
        grid-template-columns: repeat(7, minmax(0, auto)) 1fr;
    }

    .demo-foot {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        border-top: 1px solid var(--brut-rule);
        border-bottom: 0;
    }

    .demo-telemetry label,
    .demo-telemetry button,
    .demo-telemetry .status,
    .demo-foot div {
        border-right: 1px solid var(--brut-rule);
        padding: 8px 14px;
        white-space: nowrap;
    }

    .demo-telemetry label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }

    .demo-telemetry .check input {
        accent-color: var(--brut-accent);
    }

    .demo-telemetry button {
        border-top: 0;
        border-bottom: 0;
        border-left: 0;
        background: transparent;
        color: var(--brut-accent);
        cursor: pointer;
        font: inherit;
        text-align: left;
    }

    .demo-telemetry .run {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
    }

    .demo-telemetry .status {
        margin-left: auto;
        border-right: 0;
        color: var(--brut-accent);
        text-align: right;
    }

    .demo-telemetry input,
    .demo-telemetry select {
        width: 74px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        padding: 3px 8px;
        font: inherit;
    }

    .demo-telemetry .check input {
        width: auto;
    }

    .demo-foot div:last-child {
        border-right: 0;
    }

    .demo-foot span {
        color: var(--brut-ink);
    }

    .demo-frame {
        min-height: 0;
        flex: 1;
        background: var(--brut-bg);
    }

    .demo-row {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid var(--brut-rule);
        padding: 15px 18px;
        font-size: 13px;
    }

    .demo-row:hover,
    .demo-row.highlighted {
        background: var(--brut-accent-soft);
    }

    .demo-row strong {
        color: var(--brut-ink);
        font-weight: 600;
    }

    .demo-row span {
        color: var(--brut-ink-3);
        font-size: 10.5px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    @media (max-width: 720px) {
        .demo-shell {
            height: auto;
            min-height: 420px;
        }

        .demo-telemetry,
        .demo-foot {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .demo-telemetry .status {
            margin-left: 0;
            text-align: left;
        }

        .demo-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
            padding: 14px 16px;
        }
    }
</style>
