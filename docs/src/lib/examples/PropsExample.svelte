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

<div class="border-border flex h-[340px] w-full flex-col border bg-[#f7fbfa]">
    <div
        class="border-border flex min-h-11 flex-wrap items-center gap-4 border-b bg-[#edf5f2] px-4 py-2"
    >
        <label for="buffer-input" class="flex items-center gap-2">
            <span class="font-mono text-[11px] tracking-[0.14em] text-black/45 uppercase"
                >buffer</span
            >
            <input
                id="buffer-input"
                type="number"
                bind:value={bufferSize}
                min="1"
                max="50"
                class="border-border h-7 w-16 border bg-white px-2 font-mono text-sm"
            />
        </label>

        <label for="height-input" class="flex items-center gap-2">
            <span class="font-mono text-[11px] tracking-[0.14em] text-black/45 uppercase"
                >estimated</span
            >
            <input
                id="height-input"
                type="number"
                bind:value={estimatedHeight}
                min="20"
                max="100"
                class="border-border h-7 w-16 border bg-white px-2 font-mono text-sm"
            />
        </label>

        <label for="debug-toggle" class="flex items-center gap-2">
            <span class="font-mono text-[11px] tracking-[0.14em] text-black/45 uppercase"
                >debug</span
            >
            <input
                id="debug-toggle"
                type="checkbox"
                bind:checked={debug}
                class="size-4 accent-[#247b68]"
            />
        </label>

        <div class="ml-auto flex items-center gap-5 font-mono text-xs">
            <span><span class="text-black/40">range ·</span> {visibleRange}</span>
            <span
                ><span class="text-black/40">measured ·</span>
                {debugInfo?.processedItems ?? 0}</span
            >
            <span class="text-[#247b68]">● {debug ? 'debug on' : 'debug off'}</span>
        </div>
    </div>

    <div class="min-h-0 flex-1 p-3">
        <div class="border-border h-full overflow-hidden border bg-[#fbfdfc]">
            <div
                class="border-border border-b px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-black/40 uppercase"
            >
                out / rendered props
            </div>
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
                            <div
                                class="border-border flex items-center justify-between border-b px-4 py-3"
                            >
                                <span class="font-mono text-sm font-semibold">Item {item.id}</span>
                                <span
                                    class="font-mono text-[10px] tracking-[0.12em] text-black/35 uppercase"
                                >
                                    {item.note}
                                </span>
                            </div>
                        {/snippet}
                    </VirtualList>
                {/key}
            </div>
        </div>
    </div>

    <div class="border-border grid min-h-8 grid-cols-4 border-t font-mono text-xs">
        <div class="border-border border-r px-4 py-2">
            <span class="text-black/40">items ·</span>
            {items.length}
        </div>
        <div class="border-border border-r px-4 py-2">
            <span class="text-black/40">visible ·</span>
            {debugInfo?.visibleItemsCount ?? 'pending'}
        </div>
        <div class="border-border border-r px-4 py-2">
            <span class="text-black/40">avg height ·</span>
            {debugInfo ? `${debugInfo.averageItemHeight.toFixed(1)}px` : `${estimatedHeight}px`}
        </div>
        <div class="px-4 py-2">
            <span class="text-black/40">total height ·</span>
            {debugInfo ? `${Math.round(debugInfo.totalHeight)}px` : 'pending'}
        </div>
    </div>
</div>
