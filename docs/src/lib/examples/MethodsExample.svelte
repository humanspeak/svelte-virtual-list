<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type ListRef = {
        scroll: (_options: {
            index: number
            smoothScroll?: boolean
            align?: 'auto' | 'top' | 'bottom' | 'nearest'
        }) => void
        scrollToTop: () => void
        scrollToBottom: () => void
    }

    let listRef: ListRef | undefined = $state(undefined)

    const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        highlighted: i === 0 || i === 500 || i === 999
    }))

    let targetIndex = $state(500)
    let smoothScroll = $state(true)
    let align = $state<'auto' | 'top' | 'bottom' | 'nearest'>('auto')
</script>

<div class="flex w-full max-w-md flex-col gap-4">
    <div class="border-border rounded border p-4">
        <div class="mb-3 text-sm font-medium">scroll() method</div>
        <div class="flex flex-wrap items-center gap-2">
            <input
                type="number"
                bind:value={targetIndex}
                min="0"
                max="999"
                aria-label="Target item index"
                class="border-border bg-background w-20 rounded border px-2 py-1 text-sm"
            />
            <select
                bind:value={align}
                aria-label="Scroll alignment"
                class="border-border bg-background rounded border px-2 py-1 text-sm"
            >
                <option value="auto">auto</option>
                <option value="top">top</option>
                <option value="bottom">bottom</option>
                <option value="nearest">nearest</option>
            </select>
            <label class="flex items-center gap-1 text-sm">
                <input type="checkbox" bind:checked={smoothScroll} class="size-3" />
                smooth
            </label>
            <button
                onclick={() => listRef?.scroll({ index: targetIndex, smoothScroll, align })}
                class="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1 text-sm"
            >
                Go
            </button>
        </div>
    </div>
    <div class="flex gap-2">
        <button
            onclick={() => listRef?.scrollToTop()}
            class="border-border hover:bg-muted flex-1 rounded border px-3 py-2 text-sm"
        >
            scrollToTop()
        </button>
        <button
            onclick={() => listRef?.scrollToBottom()}
            class="border-border hover:bg-muted flex-1 rounded border px-3 py-2 text-sm"
        >
            scrollToBottom()
        </button>
    </div>
    <div class="border-border h-[250px] rounded border">
        <VirtualList {items} bind:this={listRef}>
            {#snippet renderItem(item)}
                <div
                    class="border-border border-b px-4 py-3 {item.highlighted
                        ? 'bg-primary/10 font-medium'
                        : 'hover:bg-muted'}"
                >
                    {item.text}
                </div>
            {/snippet}
        </VirtualList>
    </div>
</div>

<p class="text-muted-foreground mt-2 text-center text-sm">
    Use the controls above to test the scroll methods.
</p>
