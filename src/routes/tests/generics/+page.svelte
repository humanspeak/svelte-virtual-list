<script lang="ts">
    import SvelteVirtualList from '$lib/SvelteVirtualList.svelte'

    interface Message {
        id: number
        text: string
    }

    const items: Message[] = Array.from({ length: 100 }, (_, i) => ({ id: i, text: `Msg ${i}` }))

    // This usage should infer TItem = Message from items and forward it to renderItem
</script>

<SvelteVirtualList {items}>
    {#snippet renderItem(item, index)}
        <div data-testid="generic-item-{index}">{item.text}</div>
    {/snippet}
</SvelteVirtualList>
