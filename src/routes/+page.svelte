<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
        text: string
    }

    const items: Item[] = Array.from({ length: 100000 }, (_, i) => ({ id: i, text: `Item ${i}` }))
</script>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 600px;">
    <div>
        <SvelteVirtualList {items} debug>
            {#snippet renderItem(item: Item, _index: number)}
                <div>
                    {item.text}
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
    <div>
        <SvelteVirtualList {items} debug mode="bottomToTop">
            {#snippet renderItem(item: Item, _index: number)}
                <div>
                    {item.text}
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
</div>
