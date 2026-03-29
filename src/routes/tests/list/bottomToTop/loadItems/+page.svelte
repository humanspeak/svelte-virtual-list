<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import {
        createTestItemsWithHeight,
        type ItemWithHeight as Item
    } from '$lib/test/utils/createTestItems.js'

    const items = $state<Item[]>([...createTestItemsWithHeight(2, [20])])
    let virtualList = $state<SvelteVirtualList<Item> | null>(null)

    setTimeout(() => {
        items.push(
            ...Array.from({ length: 9998 }, (_, i) => ({
                id: i + 2,
                text: `Item ${i + 2}`,
                height: 20
            }))
        )

        // setTimeout(() => {
        //     virtualList?.scroll({
        //         index: 0
        //     })
        // }, 50)
    }, 1000)
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={22}
        bind:this={virtualList}
        {items}
        testId="basic-list"
        mode="bottomToTop"
        debug={false}
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
