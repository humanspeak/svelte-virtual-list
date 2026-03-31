<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import { onDestroy } from 'svelte'

    type ChatMessage = {
        id: string
        nonce?: string
        role: 'user' | 'assistant'
        content: string
        isOptimistic?: boolean
        isStreaming?: boolean
    }

    // --- Streaming content templates ---
    // Each variant is an array of small text chunks that concatenate into realistic LLM markdown output.
    const STREAM_VARIANTS: string[][] = [
        [
            'Sure',
            ', I',
            ' can',
            ' help',
            ' with',
            ' that',
            '!\n\n',
            'Virtual',
            ' scrolling',
            ' works',
            ' by',
            ' only',
            ' rendering',
            ' the',
            ' items',
            ' that',
            ' are',
            ' currently',
            ' visible',
            ' in',
            ' the',
            ' viewport',
            '.',
            ' This',
            ' dramatically',
            ' reduces',
            ' DOM',
            ' node',
            ' count',
            ' and',
            ' improves',
            ' performance',
            ' for',
            ' large',
            ' datasets',
            '.\n\n',
            '```typescript\n',
            'function',
            ' calculateRange',
            '(scrollTop:',
            ' number,',
            ' viewportHeight:',
            ' number)',
            ' {\n',
            '  const',
            ' startIndex',
            ' = Math.floor',
            '(scrollTop',
            ' / estimatedHeight',
            ');\n',
            '  const',
            ' visibleCount',
            ' = Math.ceil',
            '(viewportHeight',
            ' / estimatedHeight',
            ');\n',
            '  const',
            ' endIndex',
            ' = startIndex',
            ' + visibleCount',
            ' + buffer',
            ';\n',
            '  return',
            ' { start:',
            ' startIndex,',
            ' end:',
            ' endIndex',
            ' };\n',
            '}\n',
            '```\n\n',
            'Key',
            ' benefits',
            ' include',
            ':\n\n',
            '- ',
            '**Reduced',
            ' DOM',
            ' nodes',
            '**: Only',
            ' ~50',
            ' elements',
            ' instead',
            ' of',
            ' thousands\n',
            '- ',
            '**Lower',
            ' memory',
            '**: Unmounted',
            ' items',
            ' are',
            ' garbage',
            ' collected\n',
            '- ',
            '**Smooth',
            ' scrolling',
            '**: Buffer',
            ' zones',
            ' prevent',
            ' blank',
            ' flashes\n',
            '- ',
            '**Dynamic',
            ' heights',
            '**: Items',
            ' can',
            ' have',
            ' varying',
            ' sizes\n\n',
            'This',
            ' approach',
            ' scales',
            ' to',
            ' hundreds',
            ' of',
            ' thousands',
            ' of',
            ' items',
            ' with',
            ' consistent',
            ' 60fps',
            ' frame',
            ' rates',
            '.'
        ],
        [
            'Great',
            ' question',
            '!',
            ' Let',
            ' me',
            ' explain',
            ' how',
            ' bottom-to-top',
            ' mode',
            ' works',
            '.\n\n',
            'In',
            ' chat',
            ' applications',
            ',',
            ' messages',
            ' are',
            ' displayed',
            ' with',
            ' the',
            ' newest',
            ' at',
            ' the',
            ' bottom',
            '.',
            ' The',
            ' virtual',
            ' list',
            ' reverses',
            ' the',
            ' rendering',
            ' order',
            ' and',
            ' anchors',
            ' scroll',
            ' position',
            ' to',
            ' the',
            ' bottom',
            ' edge',
            '.\n\n',
            '```svelte\n',
            '<SvelteVirtualList\n',
            '    items={messages}\n',
            '    mode="bottomToTop"\n',
            '    defaultEstimatedItemHeight={40}\n',
            '>\n',
            '    {#snippet',
            ' renderItem(msg)}\n',
            '        <div',
            ' class="bubble">',
            '{msg.content}',
            '</div>\n',
            '    {/snippet}\n',
            '</SvelteVirtualList>\n',
            '```\n\n',
            'The',
            ' tricky',
            ' part',
            ' is',
            ' maintaining',
            ' scroll',
            ' position',
            ' when',
            ':\n\n',
            '1. ',
            'New',
            ' messages',
            ' arrive',
            ' at',
            ' the',
            ' bottom\n',
            '2. ',
            'Existing',
            ' messages',
            ' change',
            ' height',
            ' (e.g.',
            ' streaming)\n',
            '3. ',
            'Items',
            ' are',
            ' removed',
            ' (optimistic',
            ' dedup)\n',
            '4. ',
            'Older',
            ' messages',
            ' load',
            ' at',
            ' the',
            ' top\n\n',
            'Each',
            ' of',
            ' these',
            ' causes',
            ' the',
            ' total',
            ' content',
            ' height',
            ' to',
            ' shift',
            ',',
            ' and',
            ' the',
            ' scroll',
            ' position',
            ' must',
            ' be',
            ' corrected',
            ' to',
            ' keep',
            ' the',
            " user's",
            ' viewport',
            ' stable',
            '.',
            ' Without',
            ' correction',
            ',',
            ' the',
            ' user',
            ' would',
            ' see',
            ' the',
            ' content',
            ' jump',
            ' unpredictably',
            '.'
        ],
        [
            "Here's",
            ' the',
            ' implementation',
            ' breakdown',
            ':\n\n',
            '## Height',
            ' Management\n\n',
            'The',
            ' `ReactiveListManager`',
            ' tracks',
            ' item',
            ' heights',
            ' incrementally',
            '.',
            ' Instead',
            ' of',
            ' recalculating',
            ' the',
            ' entire',
            ' list',
            ' height',
            ' on',
            ' every',
            ' change',
            ' (O(n)),',
            ' it',
            ' maintains',
            ' a',
            ' running',
            ' total',
            ' and',
            ' only',
            ' updates',
            ' the',
            ' delta',
            ' (O(1)).',
            '\n\n',
            '```typescript\n',
            'class',
            ' ReactiveListManager',
            ' {\n',
            '  private',
            ' blockSums:',
            ' number[]',
            ' = [];\n',
            '  private',
            ' dirtyBlocks:',
            ' Set<number>',
            ' = new',
            ' Set();\n\n',
            '  updateHeight(index:',
            ' number,',
            ' newHeight:',
            ' number)',
            ' {\n',
            '    const',
            ' block',
            ' = Math.floor',
            '(index',
            ' / BLOCK_SIZE);\n',
            '    this.dirtyBlocks',
            '.add(block);\n',
            '    this.scheduleRecompute();\n',
            '  }\n',
            '}\n',
            '```\n\n',
            '## Scroll',
            ' Correction\n\n',
            'When',
            ' heights',
            ' change',
            ' above',
            ' the',
            ' viewport',
            ',',
            ' we',
            ' adjust',
            ' `scrollTop`',
            ' by',
            ' the',
            ' exact',
            ' delta',
            ':',
            '\n\n',
            '- ',
            'Height',
            ' increase',
            ' above',
            ' viewport',
            ' →',
            ' increase',
            ' scrollTop\n',
            '- ',
            'Height',
            ' decrease',
            ' above',
            ' viewport',
            ' →',
            ' decrease',
            ' scrollTop\n',
            '- ',
            'Height',
            ' change',
            ' below',
            ' viewport',
            ' →',
            ' no',
            ' adjustment',
            ' needed\n\n',
            'This',
            ' ensures',
            ' the',
            ' visible',
            ' content',
            ' stays',
            ' rock',
            '-solid',
            ' even',
            ' as',
            ' surrounding',
            ' items',
            ' resize',
            '.'
        ]
    ]

    let streamVariantIndex = 0

    // --- Initial messages ---
    const INITIAL_MESSAGES: ChatMessage[] = (() => {
        const msgs: ChatMessage[] = []
        const userTexts = [
            'Hey, can you explain virtual scrolling?',
            'What about performance with 10k items?',
            'How does the height caching work?',
            'Can it handle dynamic content?',
            'What about mobile support?',
            'Is there infinite scroll support?',
            'How do I use bottomToTop mode?',
            'What happens with streaming content?',
            'Can items change height after render?',
            'How does the buffer zone work?'
        ]
        const assistantTexts = [
            'Virtual scrolling renders only visible items in the DOM, dramatically reducing memory usage and improving performance for large datasets.',
            'With 10,000 items, the component maintains consistent 60fps by only mounting ~50 DOM elements at any time. Height estimation handles unmeasured items efficiently.',
            'Heights are cached after first measurement. The ReactiveListManager uses block-level dirty tracking for O(1) total height updates instead of O(n) recalculation.',
            'Yes! Items can have completely dynamic heights. The component measures each item after render and updates its internal height cache automatically.',
            'Full mobile support with touch scrolling, momentum, and iOS Safari compatibility. Uses -webkit-overflow-scrolling: touch for native feel.',
            'Built-in infinite scroll via onLoadMore callback. Triggers when the user scrolls near the threshold, supports async loading with hasMore flag.',
            'Set mode="bottomToTop" for chat-style layouts. Items render from bottom, scroll position anchors to bottom edge, new items appear at bottom.',
            'Streaming content causes continuous height changes on the active item. The scroll correction system adjusts position to keep the user anchored.',
            'Absolutely. A ResizeObserver watches each mounted item. When an item resizes, the height cache updates and scroll corrections fire automatically.',
            'Buffer zones render extra items above and below the viewport. This prevents blank flashes during fast scrolling by having content ready before it scrolls into view.'
        ]
        for (let i = 0; i < 100; i++) {
            const isUser = i % 2 === 0
            msgs.push({
                id: `server-${i}`,
                role: isUser ? 'user' : 'assistant',
                content: isUser
                    ? userTexts[Math.floor(i / 2) % userTexts.length]
                    : assistantTexts[Math.floor(i / 2) % assistantTexts.length]
            })
        }
        // Reverse so index 0 = newest (most recent message first for bottomToTop)
        return msgs.reverse()
    })()

    // --- State ---
    let messages = $state<ChatMessage[]>([...INITIAL_MESSAGES])
    let activeStreamingMessageIds = $state<string[]>([])
    let pendingStreamStarts = $state(0)
    let isStreaming = $derived(activeStreamingMessageIds.length > 0 || pendingStreamStarts > 0)
    let hasMore = $state(false)
    let totalSent = $state(0)
    let totalConfirmed = $state(0)
    let totalDropped = $state(0)
    let inputText = $state('')
    const activeIntervalIds = new Map<string, ReturnType<typeof setInterval>>()
    const pendingStreamStartIds = new Set<ReturnType<typeof setTimeout>>()

    // --- Streaming ---
    function streamResponse(messageId: string) {
        const chunks = STREAM_VARIANTS[streamVariantIndex % STREAM_VARIANTS.length]
        streamVariantIndex++
        let chunkIndex = 0

        // Create streaming assistant message at index 0 (newest)
        const assistantMsg: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: '',
            isStreaming: true
        }
        messages = [assistantMsg, ...messages]
        activeStreamingMessageIds = [...activeStreamingMessageIds, messageId]

        const intervalId = setInterval(() => {
            if (chunkIndex >= chunks.length) {
                // Streaming complete
                clearInterval(intervalId)
                activeIntervalIds.delete(messageId)
                const idx = messages.findIndex((m) => m.id === messageId)
                if (idx !== -1) {
                    messages[idx] = { ...messages[idx], isStreaming: false }
                }
                activeStreamingMessageIds = activeStreamingMessageIds.filter(
                    (id) => id !== messageId
                )
                return
            }

            const idx = messages.findIndex((m) => m.id === messageId)
            if (idx !== -1) {
                messages[idx] = {
                    ...messages[idx],
                    content: messages[idx].content + chunks[chunkIndex]
                }
            }
            chunkIndex++
        }, 40)

        activeIntervalIds.set(messageId, intervalId)
    }

    function scheduleStreamResponse() {
        pendingStreamStarts++
        // Small delay before assistant starts responding
        const timeoutId = setTimeout(() => {
            pendingStreamStartIds.delete(timeoutId)
            pendingStreamStarts = Math.max(0, pendingStreamStarts - 1)
            const assistantId = `assistant-${crypto.randomUUID()}`
            streamResponse(assistantId)
        }, 200)

        pendingStreamStartIds.add(timeoutId)
    }

    // --- Optimistic send ---
    function sendMessage(text: string) {
        const nonce = crypto.randomUUID()
        totalSent++

        // Optimistic insert at position 0
        const optimisticMsg: ChatMessage = {
            id: `opt-${nonce}`,
            nonce,
            role: 'user',
            content: text,
            isOptimistic: true
        }
        messages = [optimisticMsg, ...messages]

        // Simulate server confirmation after 500ms
        setTimeout(() => {
            // Remove optimistic
            messages = messages.filter((m) => m.id !== `opt-${nonce}`)
            totalDropped++

            // Insert confirmed version at position 0
            const confirmedMsg: ChatMessage = {
                id: `confirmed-${nonce}`,
                nonce,
                role: 'user',
                content: text,
                isOptimistic: false
            }
            messages = [confirmedMsg, ...messages]
            totalConfirmed++

            // Start the assistant response independently so bursts stream concurrently.
            scheduleStreamResponse()
        }, 500)
    }

    // --- Handlers ---
    function handleSend() {
        const text = inputText.trim() || `Test message ${totalSent + 1}`
        inputText = ''
        sendMessage(text)
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    function stressTest() {
        for (let i = 1; i <= 5; i++) {
            sendMessage(
                `Stress test question ${i}: How does virtual scrolling handle rapid message bursts?`
            )
        }
    }

    onDestroy(() => {
        for (const intervalId of activeIntervalIds.values()) {
            clearInterval(intervalId)
        }
        for (const timeoutId of pendingStreamStartIds.values()) {
            clearTimeout(timeoutId)
        }
    })
</script>

<div class="page-container">
    <div class="status" data-testid="stream-status">
        Messages: {messages.length} | Streaming: {isStreaming} | Sent: {totalSent} | Confirmed: {totalConfirmed}
        | Dropped: {totalDropped} | Active streams: {activeStreamingMessageIds.length} | Pending starts:
        {pendingStreamStarts}
    </div>
    <div class="controls" data-testid="controls">
        <input
            bind:value={inputText}
            onkeydown={handleKeydown}
            placeholder="Type a message..."
            data-testid="message-input"
        />
        <button onclick={handleSend} data-testid="send-button">Send</button>
        <button onclick={stressTest} data-testid="stress-button">Stress Test (5x)</button>
    </div>
    <div class="list-wrapper" style="height: 500px;">
        <SvelteVirtualList
            items={messages}
            mode="bottomToTop"
            defaultEstimatedItemHeight={80}
            {hasMore}
            testId="streaming-list"
        >
            {#snippet renderItem(message)}
                <div
                    class="message"
                    class:user={message.role === 'user'}
                    class:assistant={message.role === 'assistant'}
                    class:optimistic={message.isOptimistic}
                    class:streaming={message.isStreaming}
                    data-testid="message-{message.id}"
                    data-role={message.role}
                    data-nonce={message.nonce ?? ''}
                >
                    <div class="message-meta">
                        <span class="role-badge">{message.role}</span>
                        {#if message.isOptimistic}<span class="tag optimistic-tag">pending...</span
                            >{/if}
                        {#if message.isStreaming}<span class="tag streaming-tag">streaming...</span
                            >{/if}
                    </div>
                    <div class="message-content">
                        {message.content || '\u00A0'}
                    </div>
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
</div>

<style>
    .page-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .status {
        padding: 8px;
        background: #f0f0f0;
        font-family: monospace;
        font-size: 12px;
        border-bottom: 1px solid #ddd;
        flex-shrink: 0;
    }

    .controls {
        display: flex;
        gap: 8px;
        padding: 8px;
        border-bottom: 1px solid #ddd;
        flex-shrink: 0;
    }

    .controls input {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
    }

    .controls button {
        padding: 6px 14px;
        border: none;
        border-radius: 4px;
        background: #4a90d9;
        color: white;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
    }

    .controls button:hover {
        background: #357abd;
    }

    .list-wrapper {
        flex: 1;
        min-height: 0;
    }

    .message {
        padding: 10px 14px;
        margin: 3px 8px;
        border-radius: 12px;
        max-width: 500px;
        word-break: break-word;
    }

    .message.user {
        margin-left: auto;
        background: #dcf8c6;
        border-bottom-right-radius: 4px;
        width: fit-content;
    }

    .message.assistant {
        margin-right: auto;
        background: #f0f0f0;
        border-bottom-left-radius: 4px;
        width: fit-content;
    }

    .message.optimistic {
        opacity: 0.6;
    }

    .message.streaming {
        border-left: 3px solid #4a90d9;
    }

    .message-meta {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-bottom: 4px;
    }

    .role-badge {
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 600;
        color: #888;
        letter-spacing: 0.5px;
    }

    .tag {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 8px;
    }

    .optimistic-tag {
        background: #ffeeba;
        color: #856404;
    }

    .streaming-tag {
        background: #cce5ff;
        color: #004085;
    }

    .message-content {
        white-space: pre-wrap;
        font-size: 14px;
        line-height: 1.5;
    }
</style>
