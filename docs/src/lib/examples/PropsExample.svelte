<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    const items = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    let mode = $state<'topToBottom' | 'bottomToTop'>('topToBottom')
    let bufferSize = $state(20)
    let estimatedHeight = $state(40)
    let debug = $state(false)
</script>

<div class="flex w-full max-w-2xl flex-col gap-4">
    <div class="border-border flex flex-wrap gap-4 rounded border p-4">
        <div class="flex items-center gap-2">
            <label for="mode-select" class="text-sm">Mode:</label>
            <select
                id="mode-select"
                bind:value={mode}
                class="border-border bg-background rounded border px-2 py-1 text-sm"
            >
                <option value="topToBottom">topToBottom</option>
                <option value="bottomToTop">bottomToTop</option>
            </select>
        </div>
        <div class="flex items-center gap-2">
            <label for="buffer-input" class="text-sm">Buffer:</label>
            <input
                id="buffer-input"
                type="number"
                bind:value={bufferSize}
                min="1"
                max="50"
                class="border-border bg-background w-16 rounded border px-2 py-1 text-sm"
            />
        </div>
        <div class="flex items-center gap-2">
            <label for="height-input" class="text-sm">Est. Height:</label>
            <input
                id="height-input"
                type="number"
                bind:value={estimatedHeight}
                min="20"
                max="100"
                class="border-border bg-background w-16 rounded border px-2 py-1 text-sm"
            />
        </div>
        <div class="flex items-center gap-2">
            <label for="debug-toggle" class="text-sm">Debug:</label>
            <input id="debug-toggle" type="checkbox" bind:checked={debug} class="size-4" />
        </div>
    </div>
    <div class="border-border h-[300px] rounded border">
        {#key `${mode}-${bufferSize}-${estimatedHeight}-${debug}`}
            <VirtualList
                {items}
                {mode}
                {bufferSize}
                defaultEstimatedItemHeight={estimatedHeight}
                {debug}
            >
                {#snippet renderItem(item)}
                    <div class="border-border hover:bg-muted border-b px-4 py-3">
                        {item.text}
                    </div>
                {/snippet}
            </VirtualList>
        {/key}
    </div>
</div>
