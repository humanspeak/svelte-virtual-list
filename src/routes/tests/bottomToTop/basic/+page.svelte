<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}` // eslint-disable-line svelte/no-at-html-tags
    }))
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={22}
        {items}
        testId="basic-list"
        mode="bottomToTop"
        debug={false}
    >
        {#snippet renderItem(item)}
            <div>
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
