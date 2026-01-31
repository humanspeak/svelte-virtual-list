<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type Message = {
        id: number
        text: string
        timestamp: Date
        isOwn: boolean
    }

    const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        text: `Message ${i}: ${i % 3 === 0 ? 'This is a longer message that spans multiple lines to demonstrate variable height support in the virtual list component.' : 'Short message'}`,
        timestamp: new Date(Date.now() - (100 - i) * 60000),
        isOwn: i % 2 === 0
    }))
</script>

<div class="border-border bg-muted/20 h-[400px] w-full max-w-md rounded border">
    <VirtualList items={messages} mode="bottomToTop">
        {#snippet renderItem(message)}
            <div class="px-3 py-2">
                <div
                    class="max-w-[80%] rounded-lg px-3 py-2 {message.isOwn
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'}"
                >
                    <p class="text-sm">{message.text}</p>
                    <span class="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                    </span>
                </div>
            </div>
        {/snippet}
    </VirtualList>
</div>
