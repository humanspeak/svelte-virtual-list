<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))
</script>

<div class="border-border h-[300px] w-full max-w-md rounded border">
    <VirtualList {items}>
        {#snippet renderItem(item)}
            <div class="border-border hover:bg-muted border-b px-4 py-3">
                {item.text}
            </div>
        {/snippet}
    </VirtualList>
</div>
