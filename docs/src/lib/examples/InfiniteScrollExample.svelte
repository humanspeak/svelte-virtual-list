<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type Item = {
        id: number
        text: string
    }

    let items = $state<Item[]>(
        Array.from({ length: 50 }, (_, i) => ({
            id: i,
            text: `Item ${i}`
        }))
    )

    let hasMore = $state(true)
    let loadingCount = $state(0)

    async function loadMore() {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500))

        loadingCount++
        const start = items.length
        const newItems = Array.from({ length: 50 }, (_, i) => ({
            id: start + i,
            text: `Item ${start + i}`
        }))

        items = [...items, ...newItems]

        // Stop after 500 items for demo
        if (items.length >= 500) {
            hasMore = false
        }
    }
</script>

<div class="flex w-full max-w-md flex-col gap-2">
    <div class="text-muted-foreground text-sm">
        Items: {items.length} | Loads: {loadingCount} | {hasMore
            ? 'Scroll for more...'
            : 'All loaded!'}
    </div>
    <div class="border-border h-[300px] rounded border">
        <VirtualList {items} onLoadMore={loadMore} {hasMore} loadMoreThreshold={10}>
            {#snippet renderItem(item)}
                <div class="border-border hover:bg-muted border-b px-4 py-3">
                    {item.text}
                </div>
            {/snippet}
        </VirtualList>
    </div>
</div>
