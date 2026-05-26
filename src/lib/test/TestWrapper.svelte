<script lang="ts">
    import type { SvelteVirtualListProps } from '$lib/types.js'
    import SvelteVirtualList from '$lib/SvelteVirtualList.svelte'

    type Props = Omit<SvelteVirtualListProps, 'renderItem'>

    const {
        items,
        testId,
        debug = false,
        debugFunction,
        viewportClass,
        contentClass,
        itemsClass,
        bufferSize,
        ...restProps
    }: Props = $props()
</script>

<SvelteVirtualList
    {items}
    {testId}
    {debug}
    {debugFunction}
    {viewportClass}
    {contentClass}
    {itemsClass}
    {bufferSize}
    {...restProps}
>
    {#snippet renderItem(currentItem, index)}
        <div data-testid="item-{currentItem.id || index}" class="test-item">
            {currentItem.text || `Item ${index}`}
        </div>
    {/snippet}
</SvelteVirtualList>
