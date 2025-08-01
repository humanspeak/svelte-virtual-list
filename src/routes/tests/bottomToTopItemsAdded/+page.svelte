<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    let items: { id: number; text: string }[] = $state([])
    let virtualList: SvelteVirtualList | null = $state(null)

    setTimeout(() => {
        items.push(
            ...Array.from({ length: 10000 }, (_, i) => ({
                id: i,
                text: `Item ${i}`,
                height: 20
            }))
        )

        // setTimeout(() => {
        //     virtualList?.scroll({
        //         index: 0
        //     })
        // }, 50)
    }, 1000)
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList bind:this={virtualList} {items} testId="basic-list" mode="bottomToTop" debug>
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
