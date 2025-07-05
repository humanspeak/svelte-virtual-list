<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    const items = $state(
        Array.from({ length: 10 }, (_, i) => ({
            id: i,
            text: `Item ${i}`
        }))
    )

    function loadMoreItems() {
        return false
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
