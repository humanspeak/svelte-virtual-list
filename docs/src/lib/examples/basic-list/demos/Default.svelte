<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        meta:
            i % 4 === 0
                ? 'dynamic content ready'
                : i % 4 === 1
                  ? 'measured row'
                  : i % 4 === 2
                    ? 'recycled dom'
                    : 'stable offset'
    }))

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

    $effect(() => {
        if (typeof window === 'undefined' || !demoFrame) return
        updateStats()
        const intervalId = window.setInterval(updateStats, 250)
        return () => window.clearInterval(intervalId)
    })
</script>

<div class="demo-shell">
    <div class="demo-telemetry">
        <div>range · <span>{firstIndex}-{lastIndex}</span></div>
        <div>dom rows · <span>{domRows}</span></div>
        <div>dom nodes · <span>{domNodes}</span></div>
        <div>dataset · <span>10,000</span></div>
        <div>mode · <span>windowed</span></div>
    </div>
    <div class="demo-frame" bind:this={demoFrame}>
        <VirtualList {items}>
            {#snippet renderItem(item)}
                <div class="demo-row" data-index={item.id}>
                    <strong>{item.text}</strong>
                    <span>{item.meta}</span>
                </div>
            {/snippet}
        </VirtualList>
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

    .demo-telemetry {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink-3);
        font-size: 11px;
    }

    .demo-telemetry div {
        border-right: 1px solid var(--brut-rule);
        padding: 8px 14px;
        white-space: nowrap;
    }

    .demo-telemetry div:last-child {
        border-right: 0;
    }

    .demo-telemetry span {
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

        .demo-telemetry {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .demo-telemetry div:nth-child(2n) {
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
