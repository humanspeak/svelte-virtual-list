<script lang="ts">
    import type { SvelteVirtualListProps } from '$lib/types.js'
    import SvelteVirtualList from '$lib/SvelteVirtualList.svelte'

    interface Props extends Omit<SvelteVirtualListProps, 'renderItem'> {}

    let {
        items,
        testId,
        mode = 'topToBottom',
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
    {mode}
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
