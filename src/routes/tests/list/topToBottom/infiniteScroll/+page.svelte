<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    type Item = { id: number; text: string; height: number }

    const BATCH_SIZE = 50
    const items = $state<Item[]>([
        ...Array.from({ length: BATCH_SIZE }, (_, i) => ({
            id: i,
            text: `Item ${i}`,
            height: 40
        }))
    ])

    let hasMore = $state(true)
    let loadCount = $state(0)
    let isLoading = $state(false)

    const loadMore = async () => {
        if (isLoading) return
        isLoading = true

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 200))

        const startId = items.length
        const newItems = Array.from({ length: BATCH_SIZE }, (_, i) => ({
            id: startId + i,
            text: `Item ${startId + i}`,
            height: 40
        }))

        items.push(...newItems)
        loadCount++

        // Stop after 10 loads (500 items total)
        if (items.length >= 500) {
            hasMore = false
        }

        isLoading = false
    }
</script>

<div class="test-container" style="height: 500px;">
    <div class="status" data-testid="load-status">
        Items: {items.length} | Loads: {loadCount} | Has More: {hasMore} | Loading: {isLoading}
    </div>
    <SvelteVirtualList
        defaultEstimatedItemHeight={40}
        {items}
        testId="infinite-list"
        mode="topToBottom"
        onLoadMore={loadMore}
        loadMoreThreshold={20}
        {hasMore}
    >
        {#snippet renderItem(item)}
            <div
                class="test-item"
                style="height: {item.height}px;"
                data-testid="list-item-{item.id}"
            >
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>

<style>
    .test-container {
        display: flex;
        flex-direction: column;
    }

    .status {
        padding: 8px;
        background: #f0f0f0;
        font-family: monospace;
        font-size: 12px;
    }

    .test-item {
        padding: 8px;
        border-bottom: 1px solid #eee;
        display: flex;
        align-items: center;
    }
</style>
