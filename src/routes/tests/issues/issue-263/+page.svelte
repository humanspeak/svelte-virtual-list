<script lang="ts">
    // https://github.com/humanspeak/svelte-virtual-list/issues/263
    import SvelteVirtualList from '$lib/index.js'

    let counter = $state(0)
    let items = $state(
        Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            text: `Item ${i}`
        }))
    )

    const deleteItem = () => {
        items = items.filter((i) => i.id !== 3 + counter)
        counter++
    }
</script>

<button class="btn" onclick={deleteItem}>Delete Item</button>
<div class="test-container" style="height: 500px;">
    <SvelteVirtualList defaultEstimatedItemHeight={22} {items} testId="basic-list" debug={false}>
        {#snippet renderItem(item)}
            <div>
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
