<script lang="ts">
    import SvelteVirtualList, { type SvelteVirtualListScrollAlign } from '$lib/index.js'

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
    let smoothScroll = $state(true)
    let shouldThrowOnBounds = $state(true)
    let align = $state('auto' as SvelteVirtualListScrollAlign)
</script>

<div>
    <input type="range" min="0" max="10000" bind:value={index} />
    <div style="margin: 10px 0;">
        <label style="margin-right: 15px;">
            <input type="checkbox" bind:checked={smoothScroll} />
            Smooth Scroll
        </label>
        <label style="margin-right: 15px;">
            <input type="checkbox" bind:checked={shouldThrowOnBounds} />
            Throw on Bounds
        </label>
        <label>
            Align:
            <select bind:value={align} style="margin-left: 5px;">
                <option value="auto">Auto</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="center">Center</option>
                <option value="nearest">Nearest</option>
            </select>
        </label>
    </div>
    <button
        onclick={() => {
            console.log('scroll to', index, items[index])
            virtualList.scroll({ index, smoothScroll, shouldThrowOnBounds, align })
        }}
        style="margin-bottom: 10px;"
    >
        Scroll to {index}
    </button>
</div>
<div
    class="test-container"
    style="height: 500px; border: 1px solid pink;padding: 10px; border-radius: 10px;"
>
    <SvelteVirtualList {items} testId="basic-list" mode="bottomToTop" bind:this={virtualList}>
        {#snippet renderItem(item: Item)}
            <div class="test-item" data-testid="list-item-{item.id}">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
