<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    type Message = {
        id: number
        text: string
        timestamp: Date
    }

    const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        text: `Message ${i}`,
        timestamp: new Date()
    }))
</script>

<div style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={21}
        items={messages}
        mode="bottomToTop"
        debug={false}
    >
        {#snippet renderItem(message)}
            <div class="message-container">
                <p>{message.text}</p>
                <span class="timestamp">
                    {message.timestamp.toLocaleString()}
                </span>
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>

<style>
    .message-container {
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .timestamp {
        font-size: 0.875rem;
        color: #6b7280;
    }
</style>
