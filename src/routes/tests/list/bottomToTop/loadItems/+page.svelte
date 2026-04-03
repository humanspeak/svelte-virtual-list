<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import { onDestroy } from 'svelte'
    import {
        createTestItemsWithHeight,
        type ItemWithHeight as Item
    } from '$lib/test/utils/createTestItems.js'

    const items = $state<Item[]>([...createTestItemsWithHeight(2, [20])])
    let virtualList = $state<SvelteVirtualList<Item> | null>(null)
    let nextItemId = 2

    const appendItems = (count: number) => {
        const startId = nextItemId
        items.push(
            ...Array.from({ length: count }, (_, i) => ({
                id: startId + i,
                text: `Item ${startId + i}`,
                height: 20
            }))
        )
        nextItemId += count
    }

    setTimeout(() => {
        appendItems(9998)

        // setTimeout(() => {
        //     virtualList?.scroll({
        //         index: 0
        //     })
        // }, 50)
    }, 1000)

    if (typeof window !== 'undefined') {
        ;(
            window as typeof window & {
                __appendLoadItems?: (count?: number) => void
            }
        ).__appendLoadItems = (count = 20) => {
            appendItems(count)
        }
    }

    onDestroy(() => {
        if (typeof window === 'undefined') return
        delete (
            window as typeof window & {
                __appendLoadItems?: (count?: number) => void
            }
        ).__appendLoadItems
    })
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={22}
        bind:this={virtualList}
        {items}
        testId="basic-list"
        mode="bottomToTop"
        debug={true}
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
