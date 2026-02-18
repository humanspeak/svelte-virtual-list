# @humanspeak/svelte-virtual-list

[![NPM version](https://img.shields.io/npm/v/@humanspeak/svelte-virtual-list.svg)](https://www.npmjs.com/package/@humanspeak/svelte-virtual-list)
[![Build Status](https://github.com/humanspeak/svelte-virtual-list/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/humanspeak/svelte-virtual-list/actions/workflows/npm-publish.yml)
[![Coverage Status](https://coveralls.io/repos/github/humanspeak/svelte-virtual-list/badge.svg?branch=main)](https://coveralls.io/github/humanspeak/svelte-virtual-list?branch=main)
[![License](https://img.shields.io/npm/l/@humanspeak/svelte-virtual-list.svg)](https://github.com/humanspeak/svelte-virtual-list/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/@humanspeak/svelte-virtual-list.svg)](https://www.npmjs.com/package/@humanspeak/svelte-virtual-list)
[![CodeQL](https://github.com/humanspeak/svelte-virtual-list/actions/workflows/codeql.yml/badge.svg)](https://github.com/humanspeak/svelte-virtual-list/actions/workflows/codeql.yml)
[![Install size](https://packagephobia.com/badge?p=@humanspeak/svelte-virtual-list)](https://packagephobia.com/result?p=@humanspeak/svelte-virtual-list)
[![Code Style: Trunk](https://img.shields.io/badge/code%20style-trunk-blue.svg)](https://trunk.io)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Types](https://img.shields.io/npm/types/@humanspeak/svelte-virtual-list.svg)](https://www.npmjs.com/package/@humanspeak/svelte-virtual-list)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/humanspeak/svelte-virtual-list/graphs/commit-activity)

A high-performance virtual list component for Svelte 5 applications that efficiently renders large datasets with minimal memory usage.

## Features

- 📏 Dynamic item height handling - no fixed height required
- 🔄 Bi-directional scrolling support (top-to-bottom and bottom-to-top)
- 🔄 Automatic resize handling for dynamic content
- 📝 TypeScript support with full type safety
- 🚀 SSR compatible with hydration support
- ✨ Svelte 5 runes and snippets support
- 🎨 Customizable styling with class props
- 🐛 Debug mode for development
- 🎯 Smooth scrolling with configurable buffer zones
- 🧠 Memory-optimized for 10k+ items
- 🧪 Comprehensive test coverage (vitest and playwright)
- 🚀 Progressive initialization for large datasets
- 🕹️ Programmatic scrolling with `scroll`
- ♾️ Infinite scroll support with `onLoadMore`

## Requirements

- Svelte 5
- Node.js 18+

## Installation

```bash
# Using pnpm (recommended)
pnpm add @humanspeak/svelte-virtual-list

# Using npm
npm install @humanspeak/svelte-virtual-list

# Using yarn
yarn add @humanspeak/svelte-virtual-list
```

## Basic Usage

```svelte
<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list'

    const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))
</script>

<SvelteVirtualList {items}>
    {#snippet renderItem(item)}
        <div>{item.text}</div>
    {/snippet}
</SvelteVirtualList>
```

## Props

| Prop                         | Type                             | Default         | Description                                                                   |
| ---------------------------- | -------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| `items`                      | `T[]`                            | Required        | Array of items to render                                                      |
| `defaultEstimatedItemHeight` | `number`                         | `40`            | Initial height estimate used until items are measured                         |
| `mode`                       | `'topToBottom' \| 'bottomToTop'` | `'topToBottom'` | Scroll direction and anchoring behavior                                       |
| `bufferSize`                 | `number`                         | `20`            | Number of items rendered outside the viewport                                 |
| `debug`                      | `boolean`                        | `false`         | Enable debug logging and visualizations                                       |
| `containerClass`             | `string`                         | `''`            | Class for outer container                                                     |
| `viewportClass`              | `string`                         | `''`            | Class for scrollable viewport                                                 |
| `contentClass`               | `string`                         | `''`            | Class for content wrapper                                                     |
| `itemsClass`                 | `string`                         | `''`            | Class for items container                                                     |
| `testId`                     | `string`                         | `''`            | Base test id used in internal test hooks (useful for E2E/tests and debugging) |
| `onLoadMore`                 | `() => void \| Promise<void>`    | -               | Callback when more data is needed for infinite scroll                         |
| `loadMoreThreshold`          | `number`                         | `20`            | Items from end to trigger `onLoadMore`                                        |
| `hasMore`                    | `boolean`                        | `true`          | Set to `false` when all data has been loaded                                  |

## Bottom-to-Top Mode

Use `mode="bottomToTop"` for chat-like lists anchored to the bottom:

```svelte
<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list'

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
    <SvelteVirtualList items={messages} mode="bottomToTop">
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
```

## Programmatic Scrolling

Scroll to any item in the list using the `scroll` method. Useful for chat apps, jump-to-item navigation, and more.

```svelte
<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list'
    let listRef
    const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }))

    function goToItem5000() {
        listRef.scroll({ index: 5000, smoothScroll: true, align: 'auto' })
    }
</script>

<button onclick={goToItem5000}> Scroll to item 5000 </button>
<SvelteVirtualList {items} bind:this={listRef}>
    {#snippet renderItem(item)}
        <div>{item.text}</div>
    {/snippet}
</SvelteVirtualList>
```

### scroll() Options

| Option                | Type                                       | Default  | Description                             |
| --------------------- | ------------------------------------------ | -------- | --------------------------------------- |
| `index`               | `number`                                   | Required | The item index to scroll to (0-based)   |
| `smoothScroll`        | `boolean`                                  | `true`   | Use smooth scrolling animation          |
| `shouldThrowOnBounds` | `boolean`                                  | `true`   | Throw if index is out of bounds         |
| `align`               | `'auto' \| 'top' \| 'bottom' \| 'nearest'` | `'auto'` | Where to align the item in the viewport |

Alignment options:

- `'auto'` - Only scroll if not visible, align to nearest edge
- `'top'` - Always align to the top
- `'bottom'` - Always align to the bottom
- `'nearest'` - Scroll as little as possible to bring the item into view

Works with both `topToBottom` and `bottomToTop` modes:

```svelte
<SvelteVirtualList items={messages} mode="bottomToTop" bind:this={listRef} />
<button onclick={() => listRef.scroll({ index: messages.length - 1, align: 'bottom' })}>
    Jump to latest
</button>
```

## Infinite Scroll

Load more data automatically as users scroll near the end of the list. Perfect for paginated APIs, infinite feeds, and chat applications.

```svelte
<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list'

    let items = $state([...initialItems])
    let hasMore = $state(true)

    async function loadMore() {
        const newItems = await fetchMoreItems()
        items = [...items, ...newItems]
        if (newItems.length === 0) {
            hasMore = false
        }
    }
</script>

<SvelteVirtualList {items} onLoadMore={loadMore} loadMoreThreshold={20} {hasMore}>
    {#snippet renderItem(item)}
        <div>{item.text}</div>
    {/snippet}
</SvelteVirtualList>
```

### Infinite Scroll Behavior

- Triggers when scrolling near the end of the list
- Automatically triggers on mount if initial items are below threshold
- Prevents concurrent `onLoadMore` calls while loading
- Works with both sync and async callbacks
- Supports both `topToBottom` and `bottomToTop` modes

### Integration Guides

- [Infinite Scroll with Convex](documentation/CONVEX_INFINITE_SCROLL.md) - Real-time data + pagination with Convex backend

## Performance Considerations

- The `bufferSize` prop affects memory usage and scroll smoothness
- Items are measured and cached for optimal performance
- Dynamic height calculations happen automatically
- Resize observers handle container/content changes
- Virtual DOM updates are batched for efficiency

## Testing

### Unit Tests (Vitest)

```bash
# Run unit tests with coverage
pnpm test

# Run specific test files
pnpm vitest src/lib/utils/throttle.test.ts
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (one-time setup)
npx playwright install

# Run all e2e tests
pnpm run test:e2e

# Run specific e2e test
npx playwright test tests/docs-visit.spec.ts --project=chromium

# Debug mode
npx playwright test --debug
```

## Project Structure

This is a **PNPM workspace** with two packages:

1. **`./`** - Main Svelte Virtual List component package
2. **`./docs`** - Documentation site with live demos and examples

### Development Commands

```bash
# Install dependencies for both packages
pnpm install

# Start development server
pnpm dev

# Start both package and docs
pnpm run dev:all

# Build package
pnpm run build

# Check TypeScript/Svelte
pnpm run check

# Format and lint code (uses Trunk)
trunk fmt
trunk check

# Run all tests
pnpm test:all
```

This project uses [Trunk](https://trunk.io) for formatting and linting. Trunk manages tool versions and runs checks automatically via pre-commit hooks.

## License

MIT © [Humanspeak, Inc.](LICENSE)

## Credits

Made with ❤️ by [Humanspeak](https://humanspeak.com)
