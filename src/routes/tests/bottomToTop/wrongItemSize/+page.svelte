<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import { page } from '$app/state'

    type Item = {
        id: number
        text: string
    }

    const raw = page.url.searchParams.get('itemHeight')
    const itemHeight = Number.isNaN(parseInt(raw ?? '', 10)) ? 40 : parseInt(raw!, 10)

    // Create a large dataset to test performance
    const items: Item[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={itemHeight}
        {items}
        testId="wrong-item-size-list"
        mode="bottomToTop"
        debug={false}
    >
        {#snippet renderItem(item)}
            <div class="test-item">
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
