<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    const items = $state(
        Array.from({ length: 100 }, (_, i) => ({
            id: i,
            text: `Item ${i}`
        }))
    )

    function loadMoreItems(): boolean {
        // Simulate loading more items
        const currentLength = items.length
        const newItems = Array.from({ length: 100 }, (_, i) => ({
            id: currentLength + i,
            text: `Item ${currentLength + i}`
        }))
        items.push(...newItems)
        if (items.length >= 1000) {
            // Stop loading more items after reaching a limit
            return true // Indicate that the list is complete
        }
        return false // Indicate that more items can be loaded
    }
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList {items} testId="basic-list" onReachEnd={loadMoreItems}>
        {#snippet renderItem(item)}
            <div class="test-item" data-testid="list-item-{item.id}">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
