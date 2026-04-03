<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import { onMount } from 'svelte'
    import type {
        SvelteVirtualListDebugInfo,
        SvelteVirtualListExtendedDebugInfo
    } from '$lib/types.js'

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    let stats = $state<SvelteVirtualListDebugInfo | null>(null)
    const extendedStats = $derived.by((): SvelteVirtualListExtendedDebugInfo | null =>
        stats && 'engine' in stats ? stats : null
    )
    let lastDebugSignature = ''

    const handleDebugInfo = (_info: SvelteVirtualListDebugInfo) => {}

    onMount(() => {
        let rafId = 0

        const syncStats = () => {
            const viewport = document.querySelector('[data-testid="basic-list-viewport"]') as
                | (HTMLElement & { __svlDebug?: SvelteVirtualListDebugInfo })
                | null
            const nextStats = viewport?.__svlDebug ?? null
            if (nextStats) {
                const nextSignature = JSON.stringify(nextStats)
                if (nextSignature !== lastDebugSignature) {
                    lastDebugSignature = nextSignature
                    stats = nextStats
                }
            }

            rafId = requestAnimationFrame(syncStats)
        }

        rafId = requestAnimationFrame(syncStats)

        return () => {
            cancelAnimationFrame(rafId)
        }
    })
</script>

<div class="page">
    <div class="demo-shell">
        <div class="stats-panel" data-testid="bottom-to-top-basic-stats">
            <div class="stats-header">
                <div>
                    <div class="eyebrow">BottomToTop Basic</div>
                    <h1>Tail window, top spacer, background measurement.</h1>
                </div>
                <div class="state-pill" data-testid="stats-state">
                    {extendedStats?.engine ?? 'n/a'} · {extendedStats?.mode ?? 'n/a'} · {extendedStats?.bottomToTopState ??
                        'n/a'}
                </div>
            </div>

            <div class="stats-grid">
                <div class="stats-item" data-testid="stats-measured">
                    <span class="label">Measured</span>
                    <strong
                        >{extendedStats?.measuredCount ?? 0}/{stats?.totalItems ??
                            items.length}</strong
                    >
                    <span>
                        live {Math.round(extendedStats?.measuredPercent ?? 0)}% · staged {extendedStats?.stagedMeasurementCount ??
                            0} · tracked {(extendedStats?.measuredCount ?? 0) +
                            (extendedStats?.stagedMeasurementCount ?? 0)}
                    </span>
                </div>
                <div class="stats-item" data-testid="stats-mounted">
                    <span class="label">DOM</span>
                    <strong>{extendedStats?.mountedCount ?? 0}</strong>
                    <span>
                        visible {extendedStats?.renderedVisibleCount ?? 0} · lane {extendedStats?.measurementLaneCount ??
                            0}
                    </span>
                </div>
                <div class="stats-item" data-testid="stats-scroll">
                    <span class="label">Bottom Gap</span>
                    <strong>{extendedStats?.gapFromBottomPx ?? 0}px</strong>
                    <span>
                        scroll {extendedStats?.scrollTopPx ?? 0}/{extendedStats?.maxScrollTopPx ??
                            0}
                    </span>
                </div>
                <div class="stats-item" data-testid="stats-spacers">
                    <span class="label">Spacers</span>
                    <strong>{extendedStats?.topSpacerPx ?? 0}px</strong>
                    <span>top · {extendedStats?.bottomSpacerPx ?? 0}px bottom</span>
                </div>
                <div class="stats-item" data-testid="stats-heights">
                    <span class="label">Heights</span>
                    <strong>{Math.round(extendedStats?.averageItemHeightPx ?? 0)}px</strong>
                    <span>avg · {Math.round(extendedStats?.totalHeightPx ?? 0)}px total</span>
                </div>
                <div class="stats-item" data-testid="stats-queue">
                    <span class="label">Queue</span>
                    <strong>{extendedStats?.measurementQueueCount ?? 0}</strong>
                    <span>
                        backfill {String(extendedStats?.backfillPending ?? false)} · reconcile {String(
                            extendedStats?.reconcileActive ?? false
                        )} · promote {String(extendedStats?.stagedPromotionPending ?? false)}
                    </span>
                </div>
                <div class="stats-item stats-item-wide" data-testid="stats-window">
                    <span class="label">Window</span>
                    <strong>
                        logical {extendedStats?.logicalWindowStart ??
                            0}..{extendedStats?.logicalWindowEnd ?? 0}
                    </strong>
                    <span>
                        physical {extendedStats?.physicalWindowStart ??
                            0}..{extendedStats?.physicalWindowEnd ?? 0} · viewport {extendedStats?.clientHeightPx ??
                            0}px · scrollHeight {extendedStats?.scrollHeightPx ?? 0}px
                    </span>
                </div>
            </div>
        </div>

        <div class="list-stage">
            <div class="test-container" style="height: 500px;">
                <SvelteVirtualList
                    defaultEstimatedItemHeight={22}
                    {items}
                    testId="basic-list"
                    mode="bottomToTop"
                    debug={true}
                    debugFunction={handleDebugInfo}
                >
                    {#snippet renderItem(item)}
                        <div class="list-item">
                            {item.text}
                        </div>
                    {/snippet}
                </SvelteVirtualList>
            </div>
        </div>
    </div>
</div>

<style>
    .page {
        min-height: 100vh;
        padding: 24px;
        background:
            radial-gradient(circle at top left, rgba(18, 87, 64, 0.08), transparent 38%),
            linear-gradient(180deg, #f5f7f4 0%, #eef2ec 100%);
        color: #17211c;
    }

    .demo-shell {
        width: min(980px, 100%);
        margin: 0 auto;
        display: grid;
        gap: 18px;
    }

    .stats-panel {
        padding: 18px;
        border: 1px solid rgba(23, 33, 28, 0.1);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(10px);
        box-shadow: 0 12px 35px rgba(18, 28, 22, 0.08);
    }

    .stats-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
    }

    .eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #3d6b59;
        margin-bottom: 6px;
    }

    h1 {
        margin: 0;
        font-size: 20px;
        line-height: 1.15;
        font-weight: 650;
    }

    .state-pill {
        font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.4;
        padding: 8px 12px;
        border-radius: 999px;
        background: #17211c;
        color: #f5f7f4;
        white-space: nowrap;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 10px;
    }

    .stats-item {
        min-width: 0;
        display: grid;
        gap: 4px;
        padding: 10px 12px;
        border-radius: 14px;
        background: #f7faf7;
        border: 1px solid rgba(61, 107, 89, 0.12);
    }

    .stats-item-wide {
        grid-column: span 2;
    }

    .label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #587a6d;
    }

    .stats-item strong {
        font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace;
        font-size: 15px;
        font-weight: 700;
        color: #17211c;
    }

    .stats-item span:last-child {
        font-size: 12px;
        color: #4f6359;
        line-height: 1.4;
    }

    .list-stage {
        padding: 18px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 18px 50px rgba(18, 28, 22, 0.12);
    }

    .list-item {
        padding: 6px 10px;
        border-bottom: 1px solid rgba(23, 33, 28, 0.05);
    }

    @media (max-width: 900px) {
        .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .stats-item-wide {
            grid-column: span 2;
        }
    }

    @media (max-width: 640px) {
        .page {
            padding: 16px;
        }

        .stats-header {
            flex-direction: column;
        }

        .stats-grid {
            grid-template-columns: 1fr;
        }

        .stats-item-wide {
            grid-column: span 1;
        }
    }
</style>
