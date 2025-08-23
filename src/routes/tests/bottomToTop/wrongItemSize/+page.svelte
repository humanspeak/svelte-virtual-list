<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import { page } from '$app/state'

    type Item = {
        id: number
        text: string
    }

    const raw = page.url.searchParams.get('itemHeight')
    const itemHeight = Number.isNaN(parseInt(raw ?? '', 10)) ? 40 : parseInt(raw!, 10)
    let virtualList: SvelteVirtualList<Item> | null = $state(null)

    // Create a large dataset to test performance
    const items: Item[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    const smoothScrollToTop = () => {
        virtualList?.scroll({
            index: 0,
            smoothScroll: true,
            align: 'top'
        })
    }

    const smoothScrollToBottom = () => {
        virtualList?.scroll({
            index: items.length - 1,
            smoothScroll: true,
            align: 'bottom'
        })
    }
</script>

<div class="controls">
    <button data-testid="scroll-top" onclick={smoothScrollToTop}> Scroll to Top (smooth) </button>
    <button data-testid="scroll-bottom" onclick={smoothScrollToBottom}>
        Scroll to Bottom (smooth)
    </button>
</div>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={itemHeight}
        {items}
        testId="wrong-item-size-list"
        mode="bottomToTop"
        bind:this={virtualList}
    >
        {#snippet renderItem(item)}
            <div class="test-item">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>

<style>
    .controls {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
    }
    .test-container {
        width: 100%;
        border: 1px solid #eee;
    }

    .test-item {
        padding: 8px;
        border-bottom: 1px solid #eee;
    }
</style>
