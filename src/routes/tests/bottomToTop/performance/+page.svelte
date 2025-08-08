<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    // Create a large dataset to test performance
    const items = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={37}
        {items}
        testId="performance-list"
        mode="bottomToTop"
    >
        {#snippet renderItem(item)}
            <div class="test-item" data-testid="list-item-{item.id}">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>

<style>
    .test-container {
        width: 100%;
        border: 1px solid #eee;
    }

    .test-item {
        padding: 8px;
        border-bottom: 1px solid #eee;
    }
</style>
