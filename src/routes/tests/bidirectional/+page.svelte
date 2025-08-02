<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))
</script>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 500px;">
    <div>
        <SvelteVirtualList defaultEstimatedItemHeight={21} {items} testId="top-to-bottom">
            {#snippet renderItem(item)}
                <div class="test-item" data-testid="ttb-item-{item.id}">
                    {item.text}
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
    <div>
        <SvelteVirtualList
            defaultEstimatedItemHeight={21}
            {items}
            mode="bottomToTop"
            testId="bottom-to-top"
        >
            {#snippet renderItem(item)}
                <div class="test-item" data-testid="btt-item-{item.id}">
                    {item.text}
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
</div>
