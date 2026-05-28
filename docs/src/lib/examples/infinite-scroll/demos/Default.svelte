<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type Item = {
        id: number
        text: string
        meta: string
    }

    const makeItems = (start: number, count: number) =>
        Array.from({ length: count }, (_, i) => {
            const id = start + i
            return {
                id,
                text: `Feed row ${id}`,
                meta:
                    id % 3 === 0 ? 'loaded page' : id % 3 === 1 ? 'windowed dom' : 'threshold ready'
            }
        })

    let items = $state<Item[]>(makeItems(0, 50))
    let hasMore = $state(true)
    let loadingCount = $state(0)
    let isLoading = $state(false)

    let demoFrame: HTMLDivElement | undefined = $state(undefined)
    let domRows = $state(0)
    let domNodes = $state(0)
    let firstIndex = $state(0)
    let lastIndex = $state(0)

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

    async function loadMore() {
        if (isLoading || !hasMore) return
        isLoading = true
        await new Promise((resolve) => setTimeout(resolve, 500))

        loadingCount++
        const start = items.length
        items = [...items, ...makeItems(start, 50)]
        if (items.length >= 500) hasMore = false
        isLoading = false
    }

    function reset() {
        items = makeItems(0, 50)
        hasMore = true
        loadingCount = 0
        isLoading = false
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
        <div>loaded · <span>{items.length}</span></div>
        <div>loads · <span>{loadingCount}</span></div>
        <div>range · <span>{firstIndex}-{lastIndex}</span></div>
        <div>dom rows · <span>{domRows}</span></div>
        <div>
            status · <span class:accent={hasMore}
                >{isLoading ? 'loading' : hasMore ? 'ready' : 'complete'}</span
            >
        </div>
        <button type="button" onclick={reset}>reset</button>
    </div>
    <div class="demo-frame" bind:this={demoFrame}>
        <VirtualList {items} onLoadMore={loadMore} {hasMore} loadMoreThreshold={10}>
            {#snippet renderItem(item)}
                <div class="demo-row" data-index={item.id}>
                    <strong>{item.text}</strong>
                    <span>{item.meta}</span>
                </div>
            {/snippet}
        </VirtualList>
    </div>
    <div class="demo-foot">
        <div>threshold · <span>10 rows</span></div>
        <div>batch · <span>50 rows</span></div>
        <div>dom nodes · <span>{domNodes}</span></div>
        <div>cap · <span>500 rows</span></div>
        <div>mode · <span>append</span></div>
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

    .demo-telemetry div:nth-last-child(2),
    .demo-telemetry button,
    .demo-foot div:last-child {
        border-right: 0;
    }

    .demo-telemetry span,
    .demo-foot span {
        color: var(--brut-ink);
    }

    .demo-telemetry .accent {
        color: var(--brut-accent);
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

    .demo-row:hover {
        background: var(--brut-bg-2);
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

        .demo-telemetry div:nth-child(2n),
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
