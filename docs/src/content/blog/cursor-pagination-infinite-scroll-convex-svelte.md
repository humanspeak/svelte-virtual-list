---
title: 'Cursor Pagination and Infinite Scroll with Convex and Svelte'
date: 2026-03-29
description: 'Learn why cursor-based pagination outperforms offset pagination for real-time data, and how to build infinite scroll with Convex and Svelte Virtual List — including a chat UI with optimistic updates.'
tags:
    - cursor pagination
    - convex
    - infinite scroll
    - svelte
    - real-time
    - chat ui
author: Jason Kummerl
ogSlug: blog-cursor-pagination-convex
---

If you've ever built an infinite-scrolling list backed by a real-time database, you've hit the classic problem: **offset pagination breaks when the underlying data changes**. A new item arrives, every offset shifts by one, and your user sees duplicates or skipped rows.

Cursor-based pagination solves this entirely — and when you pair it with [Convex](https://convex.dev) and a virtualized list, you get a real-time infinite scroll that stays consistent no matter how fast the data moves.

This guide walks through the architecture, the tradeoffs, and a production-ready implementation using **Convex**, **Svelte 5**, and **[@humanspeak/svelte-virtual-list](/)**.

## What is Cursor-Based Pagination?

Cursor pagination uses a pointer — typically a timestamp or unique ID — to mark your position in a dataset. Instead of saying "give me page 3" (offset 60, limit 20), you say "give me 20 items older than this timestamp."

### Cursor Pagination vs Offset Pagination

|                        | Offset Pagination                       | Cursor Pagination                              |
| ---------------------- | --------------------------------------- | ---------------------------------------------- |
| **Stability**          | Breaks when rows are inserted/deleted   | Stable regardless of mutations                 |
| **Performance**        | O(n) — database must skip `offset` rows | O(1) — seeks directly to cursor position       |
| **Real-time friendly** | No — offsets shift as data changes      | Yes — cursor is an immutable reference         |
| **Implementation**     | Simple (`LIMIT` + `OFFSET`)             | Slightly more complex (needs a sortable field) |
| **Best for**           | Static data, admin dashboards           | Feeds, chat, real-time lists                   |

For any dataset where records are being added or removed while the user is scrolling, cursor pagination is the only correct choice.

### Why `_creationTime` Makes an Ideal Cursor

Convex automatically adds a `_creationTime` field to every document. This is an ideal cursor because it is:

- **Monotonically increasing** — new documents always have a higher value
- **Auto-indexed** — no need to define explicit indexes
- **Numeric** — no string parsing, simple `<` / `>` comparisons
- **Built-in** — zero setup required

## The Architecture: Real-Time + Pagination

The key insight is to **split your data into two layers**:

1. **Live layer** — The newest items, subscribed via Convex's WebSocket (`useQuery`). These update in real-time automatically.
2. **Historical layer** — Older items, fetched on-demand via one-time queries (`client.query`) using cursor pagination. No subscription needed for data the user has already scrolled past.

```text
┌─────────────────────────────────────────────┐
│              Virtual List                    │
│  ┌───────────────────────────────────────┐  │
│  │  Live Data (WebSocket subscription)   │  │
│  │  → First page, real-time updates      │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Paginated Data (cursor queries)      │  │
│  │  → Loaded on scroll, stable history   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

This dual approach gives you the best of both worlds: instant updates for new data and efficient, stable pagination for everything else.

## Building the Convex Backend

### The Real-Time Query

This query powers the live layer. Convex keeps it subscribed over WebSocket — any change to the result set is pushed to the client instantly.

```typescript
// convex/items.ts
import { query } from './_generated/server'
import { v } from 'convex/values'

export const listRecent = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50
        return await ctx.db.query('items').order('desc').take(limit)
    }
})
```

### The Paginated Query (Cursor-Based)

This query handles infinite scroll. It takes a cursor (a `_creationTime` value) and returns the next page of items older than that cursor.

```typescript
// convex/items.ts
export const listPaginated = query({
    args: {
        cursor: v.optional(v.number()),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50
        const cursor = args.cursor

        let queryBuilder = ctx.db.query('items')

        if (cursor !== undefined) {
            queryBuilder = queryBuilder.filter((q) => q.lt(q.field('_creationTime'), cursor))
        }

        const items = await queryBuilder.order('desc').take(limit + 1)

        const hasMore = items.length > limit
        const pageItems = hasMore ? items.slice(0, limit) : items

        return {
            items: pageItems,
            hasMore,
            nextCursor: pageItems.length > 0 ? pageItems[pageItems.length - 1]._creationTime : null
        }
    }
})
```

The `take(limit + 1)` trick is a standard pattern: fetch one extra item to determine if there are more pages, then slice it off before returning.

## The Svelte Frontend

Here's the complete implementation that merges the live and paginated layers into a single virtualized list:

```svelte
<script lang="ts">
    import { useQuery, useConvexClient } from 'convex-svelte'
    import { api } from '$lib/convex/api'
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type Item = {
        _id: string
        _creationTime: number
        name: string
    }

    let { data } = $props()

    // Live layer: real-time subscription for newest items
    const liveQuery = useQuery(api.items.listRecent, { limit: 50 }, { initialData: data.items })

    const client = useConvexClient()

    // Pagination state
    let olderItems = $state<Item[]>([])
    let cursor = $state<number | null>(null)
    let hasMore = $state(true)

    // Merge live + paginated data
    const items = $derived.by(() => {
        const live = (liveQuery.data ?? data.items) as Item[]
        return [...live, ...olderItems]
    })

    // Track cursor from live data
    $effect(() => {
        const live = liveQuery.data as Item[] | undefined
        if (live && live.length > 0) {
            cursor = live[live.length - 1]._creationTime
        }
    })

    // Infinite scroll handler
    async function loadMore() {
        if (!hasMore || !cursor || !client) return

        const result = await client.query(api.items.listPaginated, { cursor, limit: 50 })

        olderItems = [...olderItems, ...result.items]
        cursor = result.nextCursor
        hasMore = result.hasMore
    }
</script>

<VirtualList {items} defaultEstimatedItemHeight={60} onLoadMore={loadMore} {hasMore}>
    {#snippet renderItem(item: Item)}
        <div class="item">{item.name}</div>
    {/snippet}
</VirtualList>
```

The `VirtualList` component handles the scroll detection and calls `loadMore` when the user approaches the end. Only visible items are rendered in the DOM, so this scales to tens of thousands of items without performance degradation.

## Building a Svelte Chat Component with Convex

Chat interfaces are the most common use case for cursor pagination with real-time data. Here's how to build one with `bottomToTop` mode, where the newest message sits at the bottom and scrolling up loads history.

### Chat Schema with Composite Index

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
    messages: defineTable({
        conversation: v.id('conversations'),
        content: v.string(),
        isDeleted: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number()
    }).index('by_conversation', ['conversation', 'isDeleted'])
})
```

### Optimistic Updates for Instant Feedback

Chat UIs need to feel instant. Optimistic updates show the user's message immediately, then reconcile when the server confirms. This requires a three-layer data merge:

```svelte
<script lang="ts">
    import { useQuery, useConvexClient } from 'convex-svelte'
    import { api } from '$lib/convex/api'
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type Message = {
        _id: string
        _creationTime: number
        conversation: string
        content: string
        nonce?: string
    }

    let { conversationId } = $props()

    const liveQuery = useQuery(api.messages.listByConversation, {
        conversation: conversationId,
        limit: 50
    })

    const client = useConvexClient()

    let optimisticMessages = $state<Message[]>([])
    let olderMessages = $state<Message[]>([])
    let cursor = $state<number | null>(null)
    let hasMore = $state(true)

    // Reset pagination when conversation changes
    $effect(() => {
        void conversationId
        olderMessages = []
        cursor = null
        hasMore = true
    })

    const serverMessages = $derived(liveQuery.data ?? [])

    $effect(() => {
        if (serverMessages.length > 0) {
            cursor = serverMessages[serverMessages.length - 1]._creationTime
        }
    })

    // Three-layer merge: optimistic + live + historical
    const messages = $derived.by(() => {
        const serverNonces = new Set(serverMessages.filter((m) => m.nonce).map((m) => m.nonce))
        const pending = optimisticMessages.filter((om) => !serverNonces.has(om._id))
        return [...pending, ...serverMessages, ...olderMessages]
    })

    async function loadMore() {
        if (!hasMore || !cursor || !client) return

        const result = await client.query(api.messages.listByConversationPaginated, {
            conversation: conversationId,
            cursor,
            limit: 50
        })

        if (!result) return
        olderMessages = [...olderMessages, ...result.items]
        cursor = result.nextCursor
        hasMore = result.hasMore
    }

    function sendMessage(content: string) {
        const nonce = crypto.randomUUID()
        const now = Date.now()

        optimisticMessages = [
            { _id: nonce, _creationTime: now, conversation: conversationId, content, nonce },
            ...optimisticMessages
        ]
    }
</script>

<VirtualList
    items={messages}
    mode="bottomToTop"
    defaultEstimatedItemHeight={60}
    onLoadMore={loadMore}
    {hasMore}
>
    {#snippet renderItem(message: Message)}
        <div class="message">{message.content}</div>
    {/snippet}
</VirtualList>
```

## Bonus: Streaming AI Chat with Svelte Markdown

Building an LLM-powered chat? The chat pattern above pairs naturally with [`@humanspeak/svelte-markdown`](https://markdown.svelte.page) and its **streaming mode**. As your AI model streams tokens back, svelte-markdown renders the markdown incrementally — headings, code blocks, tables, and all — giving users the real-time "typing" experience they expect from tools like ChatGPT.

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    let { content, isStreaming } = $props()
</script>

<SvelteMarkdown source={content} streaming={isStreaming} />
```

When `streaming` is `true`, the renderer handles partial markdown gracefully — no flickering from incomplete fences or half-parsed tables. Combined with `bottomToTop` virtual scrolling, you get a production-grade AI chat UI: the virtual list manages the message history and infinite scroll, while svelte-markdown handles the live rendering of the latest response as it streams in.

## Frequently Asked Questions

### Why not use Convex's built-in `usePaginatedQuery`?

Convex provides `usePaginatedQuery` which handles pagination automatically. It works well for many cases, but the manual approach shown here gives you finer control over the live/historical split — particularly useful when you want the first page to update in real-time while keeping historical pages stable and unsubscribed.

### How do I handle cursor pagination when switching contexts?

When the user switches conversations, channels, or any filtered view, you must reset the pagination state. Otherwise, stale data from the previous context bleeds into the new one:

```typescript
$effect(() => {
    void conversationId // reactive dependency
    olderMessages = []
    cursor = null
    hasMore = true
})
```

### Can I use this with server-side rendering?

Yes. Use `ConvexHttpClient` in your SvelteKit `+page.server.ts` load function to fetch the initial page, then pass it as `initialData` to `useQuery` on the client. This gives you SSR content for SEO while the real-time subscription takes over on hydration.

```typescript
// +page.server.ts
import { ConvexHttpClient } from 'convex/browser'

export const load = async () => {
    const client = new ConvexHttpClient(env.PUBLIC_CONVEX_URL!)
    const items = await client.query(api.items.listRecent, { limit: 50 })
    return { items }
}
```

### What's the performance impact of virtualization?

Without virtualization, rendering 10,000 items creates 10,000 DOM nodes. With `@humanspeak/svelte-virtual-list`, only the visible items (typically 20–50) exist in the DOM at any time. This keeps memory usage flat and scroll performance at 60fps regardless of list size.

## Get Started

- **[Full integration guide](/docs/convex)** — Step-by-step setup with Convex and Svelte Virtual List
- **[Infinite scroll docs](/docs/infinite-scroll)** — Props, behavior, and examples
- **[Bottom-to-top mode](/docs/bottom-to-top)** — Chat-style scrolling
- **[API reference](/docs/api/props)** — All component props
- **[@humanspeak/svelte-markdown](https://markdown.svelte.page)** — Streaming markdown renderer for AI chat UIs
