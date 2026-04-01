<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { onDestroy } from 'svelte'
    import { SvelteMap, SvelteSet } from 'svelte/reactivity'

    type ChatMessage = {
        id: string
        nonce?: string
        role: 'user' | 'assistant'
        content: string
        isOptimistic?: boolean
        isStreaming?: boolean
    }

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
            ' items',
            ' visible',
            ' in',
            ' the',
            ' viewport',
            '.',
            ' This',
            ' reduces',
            ' DOM',
            ' nodes',
            ' and',
            ' improves',
            ' performance',
            '.\n\n',
            '```typescript\n',
            'function',
            ' visibleRange',
            '(scrollTop,',
            ' height)',
            ' {\n',
            '  const',
            ' start',
            ' = Math.floor',
            '(scrollTop',
            ' / itemHeight',
            ');\n',
            '  return',
            ' { start,',
            ' end:',
            ' start',
            ' + count',
            ' };\n',
            '}\n',
            '```\n\n',
            'Key',
            ' benefits',
            ':\n\n',
            '- ',
            '**Fewer',
            ' DOM',
            ' nodes',
            '**',
            ' — only',
            ' ~50',
            ' elements\n',
            '- ',
            '**Lower',
            ' memory',
            '**',
            ' — unmounted',
            ' items',
            ' are',
            " GC'd\n",
            '- ',
            '**Smooth',
            ' scrolling',
            '**',
            ' — buffer',
            ' prevents',
            ' flashes\n'
        ],
        [
            'Great',
            ' question',
            '!',
            ' Bottom-to-top',
            ' mode',
            ' anchors',
            ' to',
            ' the',
            ' newest',
            ' content',
            '.\n\n',
            'The',
            ' list',
            ' reverses',
            ' render',
            ' order',
            ' and',
            ' pins',
            ' scroll',
            ' to',
            ' the',
            ' bottom',
            ' edge',
            '.\n\n',
            '```svelte\n',
            '<VirtualList\n',
            '  items={messages}\n',
            '  mode="bottomToTop"\n',
            '/>\n',
            '```\n\n',
            'Scroll',
            ' corrections',
            ' fire',
            ' when',
            ':\n\n',
            '1. ',
            'New',
            ' messages',
            ' arrive\n',
            '2. ',
            'Items',
            ' resize',
            ' (streaming)\n',
            '3. ',
            'Items',
            ' removed',
            ' (dedup)\n'
        ],
        [
            "Here's",
            ' how',
            ' height',
            ' management',
            ' works',
            ':\n\n',
            'The',
            ' `ReactiveListManager`',
            ' tracks',
            ' heights',
            ' incrementally',
            ' —',
            ' O(1)',
            ' updates',
            ' instead',
            ' of',
            ' O(n)',
            ' recalculation',
            '.\n\n',
            '```typescript\n',
            'updateHeight(index,',
            ' height)',
            ' {\n',
            '  const',
            ' block',
            ' = index',
            ' / BLOCK_SIZE;\n',
            '  this.dirty',
            '.add(block);\n',
            '  this.schedule();\n',
            '}\n',
            '```\n\n',
            'This',
            ' keeps',
            ' frame',
            ' rates',
            ' at',
            ' 60fps',
            ' even',
            ' with',
            ' 10k+',
            ' items',
            '.'
        ]
    ]

    let streamVariantIndex = 0

    const userQuestions = [
        'How does virtual scrolling work?',
        'What about bottom-to-top mode?',
        'How are item heights managed?',
        'Can items change height dynamically?',
        'How does infinite scroll work?'
    ]

    const INITIAL_MESSAGES: ChatMessage[] = (() => {
        const msgs: ChatMessage[] = []
        const assistantResponses = [
            'Virtual scrolling renders only visible items in the DOM, dramatically reducing memory usage for large datasets.',
            'Bottom-to-top mode anchors scroll to the bottom edge — perfect for chat interfaces where the newest messages appear at the bottom.',
            'Heights are cached after first measurement. The ReactiveListManager uses block-level dirty tracking for O(1) total height updates.',
            'Yes! A ResizeObserver watches each mounted item. When an item resizes, the height cache updates and scroll corrections fire automatically.',
            'Built-in via `onLoadMore` callback. Triggers when the user scrolls near the threshold, with `hasMore` flag to stop.'
        ]
        for (let i = 0; i < 50; i++) {
            const isUser = i % 2 === 0
            msgs.push({
                id: `init-${i}`,
                role: isUser ? 'user' : 'assistant',
                content: isUser
                    ? userQuestions[Math.floor(i / 2) % userQuestions.length]
                    : assistantResponses[Math.floor(i / 2) % assistantResponses.length]
            })
        }
        return msgs.reverse()
    })()

    let messages = $state<ChatMessage[]>([...INITIAL_MESSAGES])
    let inputText = $state('')
    let activeStreamingIds = $state<string[]>([])
    let pendingStarts = $state(0)
    let isStreaming = $derived(activeStreamingIds.length > 0 || pendingStarts > 0)
    let debugInfo = $state({ visibleItemsCount: 0, totalHeight: 0 })
    const activeIntervals = new SvelteMap<string, ReturnType<typeof setInterval>>()
    const pendingTimeouts = new SvelteSet<ReturnType<typeof setTimeout>>()

    function streamResponse(messageId: string) {
        const chunks = STREAM_VARIANTS[streamVariantIndex % STREAM_VARIANTS.length]
        streamVariantIndex++
        let chunkIndex = 0

        const assistantMsg: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: '',
            isStreaming: true
        }
        messages = [assistantMsg, ...messages]
        activeStreamingIds = [...activeStreamingIds, messageId]

        const intervalId = setInterval(() => {
            if (chunkIndex >= chunks.length) {
                clearInterval(intervalId)
                activeIntervals.delete(messageId)
                const idx = messages.findIndex((m) => m.id === messageId)
                if (idx !== -1) {
                    messages[idx] = { ...messages[idx], isStreaming: false }
                }
                activeStreamingIds = activeStreamingIds.filter((id) => id !== messageId)
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

        activeIntervals.set(messageId, intervalId)
    }

    function scheduleStream() {
        pendingStarts++
        const tid = setTimeout(() => {
            pendingTimeouts.delete(tid)
            pendingStarts = Math.max(0, pendingStarts - 1)
            streamResponse(`assistant-${crypto.randomUUID()}`)
        }, 200)
        pendingTimeouts.add(tid)
    }

    function sendMessage(text: string) {
        const nonce = crypto.randomUUID()

        const optimistic: ChatMessage = {
            id: `opt-${nonce}`,
            nonce,
            role: 'user',
            content: text,
            isOptimistic: true
        }
        messages = [optimistic, ...messages]

        const tid = setTimeout(() => {
            pendingTimeouts.delete(tid)
            messages = messages.filter((m) => m.id !== `opt-${nonce}`)
            messages = [
                { id: `confirmed-${nonce}`, nonce, role: 'user', content: text },
                ...messages
            ]
            scheduleStream()
        }, 400)
        pendingTimeouts.add(tid)
    }

    function handleSend() {
        const text = inputText.trim()
        if (!text) return
        inputText = ''
        sendMessage(text)
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    onDestroy(() => {
        for (const id of activeIntervals.values()) clearInterval(id)
        for (const id of pendingTimeouts.values()) clearTimeout(id)
    })
</script>

<div class="flex w-full max-w-lg flex-col gap-4">
    <div
        class="flex h-[500px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
        <div
            class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700"
        >
            <div class="flex items-center gap-2">
                <div
                    class="h-2.5 w-2.5 rounded-full {isStreaming
                        ? 'animate-pulse bg-green-400'
                        : 'bg-gray-300 dark:bg-gray-600'}"
                ></div>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isStreaming ? 'AI is typing...' : 'AI Assistant'}
                </span>
            </div>
            <div
                class="flex items-center gap-3 font-mono text-[10px] text-gray-400 dark:text-gray-500"
            >
                <span title="Total messages in the list">{messages.length} msgs</span>
                <span class="text-gray-300 dark:text-gray-600">|</span>
                <span
                    title="DOM nodes rendered vs total items"
                    class="text-blue-400 dark:text-blue-500"
                    >{debugInfo.visibleItemsCount} in DOM</span
                >
                <span class="text-gray-300 dark:text-gray-600">|</span>
                <span title="Virtual content height">{Math.round(debugInfo.totalHeight)}px</span>
            </div>
        </div>

        <div class="flex-1 overflow-hidden">
            <VirtualList
                items={messages}
                mode="bottomToTop"
                defaultEstimatedItemHeight={60}
                debug
                debugFunction={(info) => {
                    debugInfo = info
                }}
            >
                {#snippet renderItem(message)}
                    <div class="px-3 py-1.5">
                        <div
                            class="max-w-[85%] rounded-2xl px-4 py-2.5 {message.role === 'user'
                                ? 'ml-auto rounded-br-md bg-blue-500 text-white'
                                : 'mr-auto rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'} {message.isOptimistic
                                ? 'opacity-60'
                                : ''} {message.isStreaming ? 'border-l-2 border-blue-400' : ''}"
                            style="width: fit-content;"
                        >
                            {#if message.isStreaming && !message.content}
                                <div class="flex items-center gap-1.5 py-1">
                                    <span
                                        class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]"
                                    ></span>
                                    <span
                                        class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]"
                                    ></span>
                                    <span
                                        class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]"
                                    ></span>
                                </div>
                            {:else if message.role === 'assistant'}
                                <div
                                    class="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                >
                                    <SvelteMarkdown
                                        source={message.content}
                                        streaming={message.isStreaming}
                                    />
                                </div>
                            {:else}
                                <p class="text-sm">{message.content}</p>
                            {/if}
                        </div>
                    </div>
                {/snippet}
            </VirtualList>
        </div>

        <div
            class="flex items-center gap-2 border-t border-gray-200 px-3 py-2.5 dark:border-gray-700"
        >
            <input
                bind:value={inputText}
                onkeydown={handleKeydown}
                placeholder="Send a message..."
                aria-label="Message"
                class="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm transition-colors outline-none focus:border-blue-400 focus:bg-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:bg-gray-700"
            />
            <button
                onclick={handleSend}
                disabled={!inputText.trim()}
                aria-label="Send message"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-blue-500"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="h-4 w-4"
                >
                    <path
                        d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"
                    />
                </svg>
            </button>
        </div>
    </div>

    <div class="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <span>Markdown rendered by</span>
        <a
            href="https://markdown.svelte.page"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-blue-500 underline decoration-blue-500/30 transition-colors hover:text-blue-600 hover:decoration-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >@humanspeak/svelte-markdown</a
        >
    </div>
</div>
