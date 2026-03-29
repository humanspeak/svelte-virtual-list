<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import { createTestItems, type Item } from '$lib/test/utils/createTestItems.js'

    const items: Item[] = createTestItems(100000)
</script>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 600px;">
    <div>
        <SvelteVirtualList defaultEstimatedItemHeight={22} {items} debug={false}>
            {#snippet renderItem(item: Item, _index: number)}
                <div>
                    {item.text}
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
    <div>
        <SvelteVirtualList defaultEstimatedItemHeight={22} {items} debug={false} mode="bottomToTop">
            {#snippet renderItem(item: Item, _index: number)}
                <div>
                    {item.text}
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
</div>
