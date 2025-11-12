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

<div style="height: 500px;">
    <SvelteVirtualList items={chat} mode="bottomToTop" debug>
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

<button class="btn" onclick={() => addMessage()}>Add message</button>
