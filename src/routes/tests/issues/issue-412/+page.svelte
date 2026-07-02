<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
        text: string
    }

    // Fixed-size items whose ONLY variable is the CSS margin: content is a
    // 100px border box with margin: 12px 0. The margins collapse through the
    // component's unstyled item wrappers, so a border-box measurement reads
    // 100px while the real layout pitch (offsetTop delta between neighbors)
    // is 112px. The estimate is pinned to the border box (100) so any height
    // the cache learns beyond that must come from measuring margins.
    const ITEM_COUNT = 500

    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList defaultEstimatedItemHeight={100} {items} testId="issue-412-list">
        {#snippet renderItem(item)}
            <div class="margin-item" data-testid="margin-item-{item.id}">
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

    .margin-item {
        box-sizing: border-box;
        height: 100px;
        margin: 12px 0;
        padding: 8px;
        background: #e8f0fe;
        border-radius: 8px;
        font-size: 14px;
    }
</style>
