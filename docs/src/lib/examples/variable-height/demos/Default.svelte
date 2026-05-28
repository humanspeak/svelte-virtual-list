<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'
    import ChevronDown from '@lucide/svelte/icons/chevron-down'

    type Item = {
        id: number
        title: string
        description: string
        expanded: boolean
    }

    const loremSentences = [
        'Measured content can grow after initial render.',
        'ResizeObserver reports the new height and the list updates offsets.',
        'Scroll position stays coherent while rows open and close.',
        'Mixed row sizes stay virtualized instead of forcing all nodes into the DOM.',
        'This mirrors cards, messages, audit logs, and search result snippets.'
    ]

    function getDescription(seed: number): string {
        const count = (seed % 4) + 1
        return Array.from(
            { length: count },
            (_, i) => loremSentences[(seed + i) % loremSentences.length]
        ).join(' ')
    }

    let items = $state<Item[]>(
        Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            title: `Measured row ${i}`,
            description: getDescription(i),
            expanded: i === 0 || i === 7
        }))
    )

    let demoFrame: HTMLDivElement | undefined = $state(undefined)
    let domRows = $state(0)
    let domNodes = $state(0)
    let firstIndex = $state(0)
    let lastIndex = $state(0)

    const expandedCount = $derived(items.filter((item) => item.expanded).length)

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

    function toggleExpand(id: number) {
        items = items.map((item) => (item.id === id ? { ...item, expanded: !item.expanded } : item))
    }

    function reset() {
        items = items.map((item) => ({ ...item, expanded: item.id === 0 || item.id === 7 }))
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
        <div>items · <span>1,000</span></div>
        <div>expanded · <span>{expandedCount}</span></div>
        <div>range · <span>{firstIndex}-{lastIndex}</span></div>
        <div>dom rows · <span>{domRows}</span></div>
        <div>dom nodes · <span>{domNodes}</span></div>
        <button type="button" onclick={reset}>reset</button>
    </div>
    <div class="demo-frame" bind:this={demoFrame}>
        <VirtualList {items}>
            {#snippet renderItem(item)}
                <div class:expanded={item.expanded} class="demo-row" data-index={item.id}>
                    <button type="button" onclick={() => toggleExpand(item.id)}>
                        <strong>{item.title}</strong>
                        <span class:open={item.expanded}>
                            <ChevronDown size={12} />
                        </span>
                    </button>
                    {#if item.expanded}
                        <p>{item.description}</p>
                    {/if}
                </div>
            {/snippet}
        </VirtualList>
    </div>
    <div class="demo-foot">
        <div>height · <span>auto measured</span></div>
        <div>observer · <span>resize</span></div>
        <div>content · <span>expandable</span></div>
        <div>range · <span>{firstIndex}-{lastIndex}</span></div>
        <div>mode · <span>dynamic</span></div>
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
        grid-template-columns: repeat(6, minmax(0, 1fr));
        background: var(--brut-bg-2);
        color: var(--brut-ink-3);
        font-size: 11px;
    }

    .demo-telemetry {
        border-bottom: 1px solid var(--brut-rule);
    }

    .demo-foot {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        border-top: 1px solid var(--brut-rule);
    }

    .demo-telemetry div,
    .demo-telemetry button,
    .demo-foot div {
        border-right: 1px solid var(--brut-rule);
        padding: 8px 14px;
        white-space: nowrap;
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

    .demo-telemetry button,
    .demo-foot div:last-child {
        border-right: 0;
    }

    .demo-telemetry span,
    .demo-foot span {
        color: var(--brut-ink);
    }

    .demo-frame {
        min-height: 0;
        flex: 1;
        background: var(--brut-bg);
    }

    .demo-row {
        border-bottom: 1px solid var(--brut-rule);
        padding: 0;
        font-size: 13px;
    }

    .demo-row.expanded {
        background: var(--brut-bg-2);
    }

    .demo-row button {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        border: 0;
        background: transparent;
        color: var(--brut-ink);
        cursor: pointer;
        font: inherit;
        padding: 16px 18px;
        text-align: left;
    }

    .demo-row strong {
        color: var(--brut-ink);
        font-weight: 600;
    }

    .demo-row button span {
        color: var(--brut-ink-3);
        transition: transform 0.15s;
    }

    .demo-row button span.open {
        color: var(--brut-accent);
        transform: rotate(180deg);
    }

    .demo-row p {
        margin: 0;
        max-width: 860px;
        padding: 0 18px 18px;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13px;
        line-height: 1.55;
    }

    @media (max-width: 720px) {
        .demo-shell {
            min-height: 460px;
        }

        .demo-telemetry,
        .demo-foot {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .demo-telemetry div:nth-child(2n),
        .demo-foot div:nth-child(2n) {
            border-right: 0;
        }
    }
</style>
