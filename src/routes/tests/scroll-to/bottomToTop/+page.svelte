<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    let virtualList: SvelteVirtualList

    type Item = {
        id: number
        text: string
    }

    const items: Item[] = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    let index = $state(5000)
</script>

<div>
    <input type="range" min="0" max="10000" bind:value={index} />
    <button
        onclick={() => virtualList.scrollToIndex(index, false, false)}
        style="margin-bottom: 10px;"
    >
        Scroll to {index}
    </button>
</div>
<div
    class="test-container"
    style="height: 500px; border: 1px solid pink;padding: 10px; border-radius: 10px;"
>
    <SvelteVirtualList {items} testId="basic-list" mode="bottomToTop" bind:this={virtualList} debug>
        {#snippet renderItem(item: Item)}
            <div class="test-item" data-testid="list-item-{item.id}">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
