<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    type Item = { id: number; text: string }

    let items = $state<Item[]>([])

    function addItems(count: number) {
        const startId = items.length
        const newItems = Array.from({ length: count }, (_, i) => ({
            id: startId + i,
            text: `Item ${startId + i}`
        }))
        items = [...items, ...newItems]
    }

    function removeAllItems() {
        items = []
    }

    function addSingleItem() {
        addItems(1)
    }

    function addManyItems() {
        addItems(1000)
    }
</script>

<div class="controls" data-testid="controls">
    <button data-testid="add-single-item" onclick={addSingleItem}>Add Single Item</button>
    <button data-testid="add-many-items" onclick={addManyItems}>Add 1000 Items</button>
    <button data-testid="remove-all-items" onclick={removeAllItems}>Remove All Items</button>
    <span data-testid="item-count">Items: {items.length}</span>
</div>

<div class="test-container" style="height: 500px;" data-testid="test-container">
    <SvelteVirtualList
        defaultEstimatedItemHeight={40}
        {items}
        testId="empty-list"
        mode="bottomToTop"
        debug={false}
    >
        {#snippet renderItem(item)}
            <div class="test-item" data-testid="list-item-{item.id}" style="height: 40px;">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>

<style>
    .controls {
        padding: 10px;
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .test-container {
        border: 1px solid #ccc;
    }

    .test-item {
        padding: 10px;
        border-bottom: 1px solid #eee;
        box-sizing: border-box;
    }
</style>
