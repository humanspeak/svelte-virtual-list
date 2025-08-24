<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import type { Item } from '$lib/test/types/item.js'

    let virtualList: SvelteVirtualList<Item> | null = $state(null)
    let contentClass = $state('flex flex-1 flex-col gap-4 p-4')
    let itemsClass = $state('grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-3')

    // Create a large dataset to test performance
    const items: Item[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    const setGrid = () => {
        contentClass = 'flex flex-1 flex-col gap-4 p-4'
        itemsClass = 'grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-3'
    }

    const setList = () => {
        contentClass = ''
        itemsClass = ''
    }
</script>

<div>
    <button class="btn" onclick={setGrid} style="margin-bottom: 10px;"> Grid Layout </button>
    <button class="btn" onclick={setList} style="margin-bottom: 10px;"> List Layout </button>
</div>
<div class="h-[500px] border border-pink-500 p-4 rounded-md mx-2 w-full">
    <SvelteVirtualList
        {items}
        testId="issue-215"
        {contentClass}
        {itemsClass}
        bind:this={virtualList}
    >
        {#snippet renderItem(item)}
            <div class="p-2 border-b-1 border-gray-200">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
