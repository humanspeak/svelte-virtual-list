<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    const items = $state(
        Array.from({ length: 100 }, (_, i) => ({
            id: i,
            text: `Item ${i}`
        }))
    )

    function loadMoreItems(): Promise<boolean> {
        // Simulate loading more items after a delay
        console.log('Loading more items...')
        return new Promise((resolve) => {
            setTimeout(() => {
                const currentLength = items.length
                const newItems = Array.from({ length: 100 }, (_, i) => ({
                    id: currentLength + i,
                    text: `Item ${currentLength + i}`
                }))
                items.push(...newItems)
                resolve(false) // Indicate that more items can be loaded
            }, 1000) // Simulate a 1 second delay for loading
        })
    }
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList {items} testId="basic-list" infiniteScrollCallback={loadMoreItems}>
        {#snippet renderItem(item)}
            <div class="test-item" data-testid="list-item-{item.id}">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
