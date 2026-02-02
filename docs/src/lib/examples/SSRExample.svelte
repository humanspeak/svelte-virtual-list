<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'
    import { browser } from '$app/environment'

    // Simulating data that would come from server load function
    const items = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        description: `This item was loaded ${browser ? 'on the client' : 'during SSR'}`
    }))
</script>

<div class="flex w-full max-w-md flex-col gap-4">
    <div class="border-border bg-muted/50 rounded border p-3">
        <div class="flex items-center gap-2 text-sm">
            <span
                class="inline-block size-2 rounded-full {browser
                    ? 'bg-green-500'
                    : 'bg-yellow-500'}"
            ></span>
            <span>
                {browser ? 'Hydrated (client-side)' : 'Server-rendered'}
            </span>
        </div>
    </div>
    <div class="border-border h-[300px] rounded border">
        <VirtualList {items} defaultEstimatedItemHeight={60}>
            {#snippet renderItem(item)}
                <div class="border-border border-b px-4 py-3">
                    <div class="font-medium">{item.text}</div>
                    <div class="text-muted-foreground text-sm">{item.description}</div>
                </div>
            {/snippet}
        </VirtualList>
    </div>
</div>

<p class="text-muted-foreground mt-2 text-center text-sm">
    The list works seamlessly during SSR and hydration.
</p>
