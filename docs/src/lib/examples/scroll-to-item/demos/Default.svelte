<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type ListRef = {
        scroll: (_options: {
            index: number
            smoothScroll?: boolean
            align?: 'auto' | 'top' | 'bottom' | 'nearest' | 'center'
        }) => void
    }

    type Align = 'auto' | 'top' | 'bottom' | 'nearest' | 'center'

    let listRef: ListRef | undefined = $state(undefined)
    let targetIndex = $state(5000)
    let align = $state<Align>('auto')

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        highlighted: i === 0 || i === 5000 || i === 9999,
        meta: i === 0 ? 'first' : i === 5000 ? 'middle' : i === 9999 ? 'last' : 'scroll target'
    }))

    let demoFrame: HTMLDivElement | undefined = $state(undefined)
    let domRows = $state(0)
    let domNodes = $state(0)
    let firstIndex = $state(0)
    let lastIndex = $state(0)

    const clampIndex = (index: number) => Math.max(0, Math.min(9999, Math.round(index)))

    const updateStats = () => {
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

    function scrollToTarget(index = targetIndex, nextAlign = align) {
        targetIndex = clampIndex(index)
        listRef?.scroll({ index: targetIndex, smoothScroll: true, align: nextAlign })
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
                max="9999"
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
        <button type="button" class="run" onclick={() => scrollToTarget()}>run</button>
        <button type="button" onclick={() => scrollToTarget(0, 'top')}>first</button>
        <button type="button" onclick={() => scrollToTarget(5000, 'center')}>middle</button>
        <button type="button" onclick={() => scrollToTarget(9999, 'bottom')}>last</button>
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
        <div>target · <span>{targetIndex}</span></div>
        <div>align · <span>{align}</span></div>
        <div>range · <span>{firstIndex}-{lastIndex}</span></div>
        <div>dom rows · <span>{domRows}</span></div>
        <div>dom nodes · <span>{domNodes}</span></div>
    </div>
</div>

<style>
    .demo-shell {
        display: flex;
        min-height: 560px;
        width: 100%;
        flex-direction: column;
        background: var(--brut-bg);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }

    .demo-telemetry,
    .demo-foot {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, auto)) 1fr;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink-3);
        font-size: 11px;
    }

    .demo-foot {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        border-top: 1px solid var(--brut-rule);
        border-bottom: 0;
    }

    .demo-telemetry label,
    .demo-telemetry button,
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

    .demo-telemetry input,
    .demo-telemetry select {
        width: 76px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        padding: 3px 8px;
        font: inherit;
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
        padding: 16px 18px;
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
            min-height: 460px;
        }

        .demo-telemetry,
        .demo-foot {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .demo-telemetry label:nth-child(2n),
        .demo-telemetry button:nth-child(2n),
        .demo-foot div:nth-child(2n) {
            border-right: 0;
        }

        .demo-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
            padding: 14px 16px;
        }
    }
</style>
