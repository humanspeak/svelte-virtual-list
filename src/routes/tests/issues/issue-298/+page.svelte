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

    let chat = $state(messages)

    const addMessage = () => {
        chat.push({
            id: chat.length + 1,
            text: `Message ${chat.length + 1}`,
            timestamp: new Date()
        })
    }
</script>

<div style="height: 500px; border: 1px solid #eee; padding: 8px;">
    <SvelteVirtualList items={chat} mode="bottomToTop" debug>
        {#snippet renderItem(message)}
            <div class="message-row">
                <div>{message.text}</div>
                <small class="timestamp">{message.timestamp.toLocaleString()}</small>
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
<button class="btn" onclick={() => addMessage()} data-testid="add-message-button">
    Add message
</button>

<style>
    .message-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 4px 0;
    }
    .timestamp {
        color: #777;
        font-size: 11px;
    }
</style>
