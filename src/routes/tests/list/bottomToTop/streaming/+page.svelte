<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import type {
        SvelteVirtualListDebugInfo,
        SvelteVirtualListExtendedDebugInfo
    } from '$lib/types.js'
    import { onDestroy, onMount } from 'svelte'
    import { SvelteMap, SvelteSet } from 'svelte/reactivity'

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
    const INITIAL_MESSAGE_COUNT = 1000
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
        for (let i = 0; i < INITIAL_MESSAGE_COUNT; i++) {
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
    let listRef: SvelteVirtualList<ChatMessage>
    let activeStreamingMessageIds = $state<string[]>([])
    let pendingStreamStarts = $state(0)
    let isStreaming = $derived(activeStreamingMessageIds.length > 0 || pendingStreamStarts > 0)
    let totalSent = $state(0)
    let totalConfirmed = $state(0)
    let totalDropped = $state(0)
    let inputText = $state('')
    const activeIntervalIds = new SvelteMap<string, ReturnType<typeof setInterval>>()
    const pendingStreamStartIds = new SvelteSet<ReturnType<typeof setTimeout>>()
    let stats = $state<SvelteVirtualListDebugInfo | null>(null)
    const extendedStats = $derived.by((): SvelteVirtualListExtendedDebugInfo | null =>
        stats && 'engine' in stats ? stats : null
    )
    let lastDebugSignature = ''

    const handleDebugInfo = (_info: SvelteVirtualListDebugInfo) => {}

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
                    messages[idx].isStreaming = false
                }
                activeStreamingMessageIds = activeStreamingMessageIds.filter(
                    (id) => id !== messageId
                )
                return
            }

            const idx = messages.findIndex((m) => m.id === messageId)
            if (idx !== -1) {
                messages[idx].content += chunks[chunkIndex]
            }
            chunkIndex++
        }, 80)

        activeIntervalIds.set(messageId, intervalId)
    }

    function scheduleStreamResponse() {
        const streamStartOffsetMs = pendingStreamStarts * 24
        pendingStreamStarts++
        // Small delay before assistant starts responding
        const timeoutId = setTimeout(() => {
            pendingStreamStartIds.delete(timeoutId)
            pendingStreamStarts = Math.max(0, pendingStreamStarts - 1)
            const assistantId = `assistant-${crypto.randomUUID()}`
            streamResponse(assistantId)
        }, 200 + streamStartOffsetMs)

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
        const tid = setTimeout(() => {
            pendingStreamStartIds.delete(tid)
            // Confirm in place so concurrent optimistic sends do not create
            // interior remove/reinsert mutations that force a full bottomToTop reinit.
            const confirmedMsg: ChatMessage = {
                id: `confirmed-${nonce}`,
                nonce,
                role: 'user',
                content: text,
                isOptimistic: false
            }
            const optimisticIndex = messages.findIndex((m) => m.id === `opt-${nonce}`)
            if (optimisticIndex !== -1) {
                messages[optimisticIndex].id = confirmedMsg.id
                messages[optimisticIndex].nonce = confirmedMsg.nonce
                messages[optimisticIndex].role = confirmedMsg.role
                messages[optimisticIndex].content = confirmedMsg.content
                messages[optimisticIndex].isOptimistic = false
            } else {
                messages = [confirmedMsg, ...messages]
            }
            totalConfirmed++

            // Start the assistant response independently so bursts stream concurrently.
            scheduleStreamResponse()
        }, 500)
        pendingStreamStartIds.add(tid)
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
        listRef.runInBatch(() => {
            for (let i = 1; i <= 5; i++) {
                sendMessage(
                    `Stress test question ${i}: How does virtual scrolling handle rapid message bursts?`
                )
            }
        })
    }

    onMount(() => {
        let rafId = 0

        const syncStats = () => {
            const viewport = document.querySelector('[data-testid="streaming-list-viewport"]') as
                | (HTMLElement & { __svlDebug?: SvelteVirtualListDebugInfo })
                | null
            const nextStats = viewport?.__svlDebug ?? null
            if (nextStats) {
                const nextSignature = JSON.stringify(nextStats)
                if (nextSignature !== lastDebugSignature) {
                    lastDebugSignature = nextSignature
                    stats = nextStats
                }
            }

            rafId = requestAnimationFrame(syncStats)
        }

        rafId = requestAnimationFrame(syncStats)

        return () => {
            cancelAnimationFrame(rafId)
        }
    })

    onDestroy(() => {
        for (const intervalId of activeIntervalIds.values()) {
            clearInterval(intervalId)
        }
        for (const timeoutId of pendingStreamStartIds.values()) {
            clearTimeout(timeoutId)
        }
    })
</script>

<div class="page">
    <div class="demo-shell">
        <div class="stats-panel" data-testid="bottom-to-top-streaming-stats">
            <div class="stats-header">
                <div>
                    <div class="eyebrow">BottomToTop Streaming</div>
                    <h1>Optimistic sends, streaming growth, and burst concurrency.</h1>
                </div>
                <div class="state-pill" data-testid="stats-state">
                    {extendedStats?.engine ?? 'n/a'} · {extendedStats?.mode ?? 'n/a'} · {extendedStats?.bottomToTopState ??
                        'n/a'}
                </div>
            </div>

            <div class="stats-grid">
                <div class="stats-item" data-testid="stats-measured">
                    <span class="label">Measured</span>
                    <strong
                        >{extendedStats?.measuredCount ?? 0}/{stats?.totalItems ??
                            messages.length}</strong
                    >
                    <span>
                        live {Math.round(extendedStats?.measuredPercent ?? 0)}% · staged {extendedStats?.stagedMeasurementCount ??
                            0} · tracked {(extendedStats?.measuredCount ?? 0) +
                            (extendedStats?.stagedMeasurementCount ?? 0)}
                    </span>
                </div>
                <div class="stats-item" data-testid="stats-mounted">
                    <span class="label">DOM</span>
                    <strong>{extendedStats?.mountedCount ?? 0}</strong>
                    <span>
                        visible {extendedStats?.renderedVisibleCount ?? 0} · lane {extendedStats?.measurementLaneCount ??
                            0}
                    </span>
                </div>
                <div class="stats-item" data-testid="stats-scroll">
                    <span class="label">Bottom Gap</span>
                    <strong>{extendedStats?.gapFromBottomPx ?? 0}px</strong>
                    <span>
                        scroll {extendedStats?.scrollTopPx ?? 0}/{extendedStats?.maxScrollTopPx ??
                            0}
                    </span>
                </div>
                <div class="stats-item" data-testid="stats-spacers">
                    <span class="label">Spacers</span>
                    <strong>{extendedStats?.topSpacerPx ?? 0}px</strong>
                    <span>top · {extendedStats?.bottomSpacerPx ?? 0}px bottom</span>
                </div>
                <div class="stats-item" data-testid="stats-heights">
                    <span class="label">Heights</span>
                    <strong>{Math.round(extendedStats?.averageItemHeightPx ?? 0)}px</strong>
                    <span>avg · {Math.round(extendedStats?.totalHeightPx ?? 0)}px total</span>
                </div>
                <div class="stats-item" data-testid="stats-queue">
                    <span class="label">Queue</span>
                    <strong>{extendedStats?.measurementQueueCount ?? 0}</strong>
                    <span>
                        backfill {String(extendedStats?.backfillPending ?? false)} · reconcile {String(
                            extendedStats?.reconcileActive ?? false
                        )} · promote {String(extendedStats?.stagedPromotionPending ?? false)} · drain
                        {String(extendedStats?.stagedDrainActive ?? false)}/{String(
                            extendedStats?.stagedDrainScheduled ?? false
                        )}
                    </span>
                </div>
                <div class="stats-item stats-item-wide" data-testid="stats-window">
                    <span class="label">Window</span>
                    <strong>
                        logical {extendedStats?.logicalWindowStart ??
                            0}..{extendedStats?.logicalWindowEnd ?? 0}
                    </strong>
                    <span>
                        physical {extendedStats?.physicalWindowStart ??
                            0}..{extendedStats?.physicalWindowEnd ?? 0} · viewport {extendedStats?.clientHeightPx ??
                            0}px · scrollHeight {extendedStats?.scrollHeightPx ?? 0}px
                    </span>
                </div>
            </div>
        </div>

        <div class="list-stage">
            <div class="status" data-testid="stream-status">
                Messages: {messages.length} | Streaming: {isStreaming} | Sent: {totalSent} | Confirmed:
                {totalConfirmed} | Dropped: {totalDropped} | Active streams:
                {activeStreamingMessageIds.length} | Pending starts: {pendingStreamStarts}
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
                    bind:this={listRef}
                    items={messages}
                    mode="bottomToTop"
                    defaultEstimatedItemHeight={80}
                    testId="streaming-list"
                    debug={true}
                    debugFunction={handleDebugInfo}
                >
                    {#snippet renderItem(message)}
                        <div
                            class="message-slot"
                            class:user={message.role === 'user'}
                            class:assistant={message.role === 'assistant'}
                            data-testid="message-{message.id}"
                            data-role={message.role}
                            data-nonce={message.nonce ?? ''}
                        >
                            <div
                                class="message-card"
                                class:optimistic={message.isOptimistic}
                                class:streaming={message.isStreaming}
                            >
                                <div class="message-meta">
                                    <span class="role-badge">{message.role}</span>
                                    {#if message.isOptimistic}<span class="tag optimistic-tag"
                                            >pending...</span
                                        >{/if}
                                    {#if message.isStreaming}<span class="tag streaming-tag"
                                            >streaming...</span
                                        >{/if}
                                </div>
                                <div class="message-content">
                                    {message.content || '\u00A0'}
                                </div>
                            </div>
                        </div>
                    {/snippet}
                </SvelteVirtualList>
            </div>
        </div>
    </div>
</div>

<style>
    .page {
        min-height: 100vh;
        padding: 24px;
        background:
            radial-gradient(circle at top left, rgba(18, 87, 64, 0.08), transparent 38%),
            linear-gradient(180deg, #f5f7f4 0%, #eef2ec 100%);
        color: #17211c;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .demo-shell {
        width: min(980px, 100%);
        margin: 0 auto;
        display: grid;
        gap: 18px;
    }

    .stats-panel {
        padding: 18px;
        border: 1px solid rgba(23, 33, 28, 0.1);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(10px);
        box-shadow: 0 12px 35px rgba(18, 28, 22, 0.08);
    }

    .stats-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
    }

    .eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #3d6b59;
        margin-bottom: 6px;
    }

    h1 {
        margin: 0;
        font-size: 20px;
        line-height: 1.15;
        font-weight: 650;
    }

    .state-pill {
        font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.4;
        padding: 8px 12px;
        border-radius: 999px;
        background: #17211c;
        color: #f5f7f4;
        white-space: nowrap;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 10px;
    }

    .stats-item {
        min-width: 0;
        display: grid;
        gap: 4px;
        padding: 10px 12px;
        border-radius: 14px;
        background: #f7faf7;
        border: 1px solid rgba(61, 107, 89, 0.12);
    }

    .stats-item-wide {
        grid-column: span 2;
    }

    .label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #587a6d;
    }

    .stats-item strong {
        font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace;
        font-size: 15px;
        font-weight: 700;
        color: #17211c;
    }

    .stats-item span:last-child {
        font-size: 12px;
        color: #4f6359;
        line-height: 1.4;
    }

    .list-stage {
        border-radius: 24px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 18px 50px rgba(18, 28, 22, 0.12);
    }

    .status {
        padding: 8px;
        background: #f7faf7;
        font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace;
        font-size: 12px;
        border-bottom: 1px solid rgba(61, 107, 89, 0.12);
        flex-shrink: 0;
    }

    .controls {
        display: flex;
        gap: 8px;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(61, 107, 89, 0.12);
        background: rgba(245, 247, 244, 0.8);
        flex-shrink: 0;
    }

    .controls input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid rgba(61, 107, 89, 0.18);
        border-radius: 12px;
        font-size: 14px;
        background: white;
    }

    .controls button {
        padding: 10px 14px;
        border: none;
        border-radius: 12px;
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
        padding: 18px;
    }

    /* Bottom-to-top spacing must live inside the measured root box; external vertical
       margins or wrapper gap create model-vs-DOM scroll height drift. */
    .message-slot {
        padding: 3px 8px 0;
        box-sizing: border-box;
        display: flex;
        width: 100%;
    }

    .message-slot.user {
        justify-content: flex-end;
    }

    .message-slot.assistant {
        justify-content: flex-start;
    }

    .message-card {
        margin: 0;
        padding: 10px 14px;
        border-radius: 12px;
        max-width: 500px;
        word-break: break-word;
        width: fit-content;
    }

    .message-slot.user .message-card {
        background: #dcf8c6;
        border-bottom-right-radius: 4px;
    }

    .message-slot.assistant .message-card {
        background: #f0f0f0;
        border-bottom-left-radius: 4px;
    }

    .message-card.optimistic {
        opacity: 0.6;
    }

    .message-card.streaming {
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

    @media (max-width: 900px) {
        .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .stats-item-wide {
            grid-column: span 2;
        }
    }

    @media (max-width: 640px) {
        .page {
            padding: 16px;
        }

        .stats-header {
            flex-direction: column;
        }

        .state-pill {
            white-space: normal;
        }

        .controls {
            flex-direction: column;
        }

        .stats-grid {
            grid-template-columns: 1fr;
        }

        .stats-item-wide {
            grid-column: auto;
        }
    }
</style>
