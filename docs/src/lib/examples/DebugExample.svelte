<script lang="ts">
    import VirtualList, { type SvelteVirtualListDebugInfo } from '@humanspeak/svelte-virtual-list'

    const items = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        height: 40 + (i % 3) * 20
    }))

    let debugInfo = $state<SvelteVirtualListDebugInfo | null>(null)

    function handleDebug(info: SvelteVirtualListDebugInfo) {
        debugInfo = info
    }
</script>

<div class="flex w-full max-w-2xl flex-col gap-4 md:flex-row">
    <div class="border-border h-[300px] flex-1 rounded border">
        <VirtualList {items} debug={true} debugFunction={handleDebug}>
            {#snippet renderItem(item)}
                <div class="border-border border-b px-4 py-3" style="min-height: {item.height}px">
                    {item.text}
                </div>
            {/snippet}
        </VirtualList>
    </div>
    <div class="border-border bg-muted/50 flex-1 rounded border p-4">
        <h3 class="mb-3 text-sm font-medium">Debug Output</h3>
        {#if debugInfo}
            <div class="space-y-2 text-xs">
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Visible Range:</span>
                    <span class="font-mono">{debugInfo.startIndex} - {debugInfo.endIndex}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Total Items:</span>
                    <span class="font-mono">{debugInfo.totalItems}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Visible Count:</span>
                    <span class="font-mono">{debugInfo.visibleItemsCount}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Processed:</span>
                    <span class="font-mono">{debugInfo.processedItems}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Avg Height:</span>
                    <span class="font-mono">{debugInfo.averageItemHeight.toFixed(1)}px</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Total Height:</span>
                    <span class="font-mono">{debugInfo.totalHeight.toFixed(0)}px</span>
                </div>
                <div class="border-border mt-3 flex gap-4 border-t pt-3">
                    <div class="flex items-center gap-1">
                        <span
                            class="inline-block size-2 rounded-full {debugInfo.atTop
                                ? 'bg-green-500'
                                : 'bg-muted-foreground/30'}"
                        ></span>
                        <span class="text-muted-foreground">At Top</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <span
                            class="inline-block size-2 rounded-full {debugInfo.atBottom
                                ? 'bg-green-500'
                                : 'bg-muted-foreground/30'}"
                        ></span>
                        <span class="text-muted-foreground">At Bottom</span>
                    </div>
                </div>
            </div>
        {:else}
            <p class="text-muted-foreground text-sm">Scroll to see debug info...</p>
        {/if}
    </div>
</div>

<p class="text-muted-foreground mt-2 text-center text-sm">
    Scroll the list to see real-time debug information update.
</p>
