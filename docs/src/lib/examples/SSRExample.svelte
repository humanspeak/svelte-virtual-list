<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'
    import { browser } from '$app/environment'

    const runtime = browser ? 'client' : 'server'

    const items = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        description: `Initially rendered on ${runtime}`,
        meta: i % 3 === 0 ? 'ssr seed' : i % 3 === 1 ? 'hydrated row' : 'measured client'
    }))

    let demoFrame: HTMLDivElement | undefined = $state(undefined)
    let domRows = $state(0)
    let domNodes = $state(0)
    let firstIndex = $state(0)
    let lastIndex = $state(0)

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

    $effect(() => {
        if (typeof window === 'undefined' || !demoFrame) return
        updateStats()
        const intervalId = window.setInterval(updateStats, 250)
        return () => window.clearInterval(intervalId)
    })
</script>

<div class="demo-shell">
    <div class="demo-telemetry">
        <div>runtime · <span>{runtime}</span></div>
        <div>hydration · <span class:accent={browser}>{browser ? 'ready' : 'pending'}</span></div>
        <div>range · <span>{firstIndex}-{lastIndex}</span></div>
        <div>dom rows · <span>{domRows}</span></div>
        <div>estimate · <span>60px</span></div>
        <div class="status">● {browser ? 'hydrated' : 'ssr'}</div>
    </div>

    <div class="demo-frame" bind:this={demoFrame}>
        <VirtualList {items} defaultEstimatedItemHeight={60}>
            {#snippet renderItem(item)}
                <div class="demo-row" data-index={item.id}>
                    <div>
                        <strong>{item.text}</strong>
                        <p>{item.description}</p>
                    </div>
                    <span>{item.meta}</span>
                </div>
            {/snippet}
        </VirtualList>
    </div>

    <div class="demo-foot">
        <div>items · <span>{items.length}</span></div>
        <div>ssr · <span>compatible</span></div>
        <div>measure · <span>after hydrate</span></div>
        <div>dom nodes · <span>{domNodes}</span></div>
        <div>mode · <span>sveltekit</span></div>
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
        background: var(--brut-bg-2);
        color: var(--brut-ink-3);
        font-size: 11px;
    }

    .demo-telemetry {
        grid-template-columns: repeat(5, minmax(0, 1fr)) auto;
        border-bottom: 1px solid var(--brut-rule);
    }

    .demo-foot {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        border-top: 1px solid var(--brut-rule);
    }

    .demo-telemetry div,
    .demo-foot div {
        border-right: 1px solid var(--brut-rule);
        padding: 8px 14px;
        white-space: nowrap;
    }

    .demo-telemetry .status {
        border-right: 0;
        color: var(--brut-accent);
        text-align: right;
    }

    .demo-telemetry span,
    .demo-foot span {
        color: var(--brut-ink);
    }

    .demo-telemetry .accent {
        color: var(--brut-accent);
    }

    .demo-foot div:last-child {
        border-right: 0;
    }

    .demo-frame {
        min-height: 0;
        flex: 1;
        background: var(--brut-bg);
    }

    .demo-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid var(--brut-rule);
        padding: 14px 18px;
        font-size: 13px;
    }

    .demo-row:hover {
        background: var(--brut-bg-2);
    }

    .demo-row strong {
        color: var(--brut-ink);
        font-weight: 600;
    }

    .demo-row p {
        margin: 5px 0 0;
        color: var(--brut-ink-3);
        font-size: 12px;
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

        .demo-row {
            flex-direction: column;
            gap: 4px;
            padding: 14px 16px;
        }
    }
</style>
