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

## scroll: Programmatic Scrolling

You can now programmatically scroll to any item in the list using the `scroll` method. This is useful for chat apps, jump-to-item navigation, and more. You can check the usage in `src/routes/tests/scroll`. Thank you for the feature request!

### Usage Example

```svelte
<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list'
    let listRef
    const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }))

    function goToItem5000() {
        // Scroll to item 5000 with smooth scrolling and auto alignment
        listRef.scroll({ index: 5000, smoothScroll: true, align: 'auto' })
    }
</script>

<button on:click={goToItem5000}> Scroll to item 5000 </button>
<SvelteVirtualList {items} bind:this={listRef}>
    {#snippet renderItem(item)}
        <div>{item.text}</div>
    {/snippet}
</SvelteVirtualList>
```

### API

- `scroll(options: { index: number; smoothScroll?: boolean; shouldThrowOnBounds?: boolean; align?: 'auto' | 'top' | 'bottom' })`
    - `index`: The item index to scroll to (0-based)
    - `smoothScroll`: If true, uses smooth scrolling (default: true)
    - `shouldThrowOnBounds`: If true, throws if index is out of bounds (default: true)
    - `align`: Where to align the item in the viewport. `'auto'` (default) scrolls only if the item is out of view, aligning to top or bottom as needed. `'top'` always aligns to the top, `'bottom'` always aligns to the bottom.

## Installation

```bash
npm install @humanspeak/svelte-virtual-list
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

## Advanced Features

### Chat Application Example

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
    <SvelteVirtualList items={messages} mode="bottomToTop" debug>
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

## Props

| Prop                | Type                             | Default         | Description                                 |
| ------------------- | -------------------------------- | --------------- | ------------------------------------------- |
| `items`             | `T[]`                            | Required        | Array of items to render                    |
| `defaultItemHeight` | `number`                         | `40`            | Initial height for items before measurement |
| `mode`              | `'topToBottom' \| 'bottomToTop'` | `'topToBottom'` | Scroll direction                            |
| `bufferSize`        | `number`                         | `20`            | Number of items to render outside viewport  |
| `debug`             | `boolean`                        | `false`         | Enable debug logging and visualizations     |
| `containerClass`    | `string`                         | `''`            | Class for outer container                   |
| `viewportClass`     | `string`                         | `''`            | Class for scrollable viewport               |
| `contentClass`      | `string`                         | `''`            | Class for content wrapper                   |
| `itemsClass`        | `string`                         | `''`            | Class for items container                   |

## Performance Considerations

- The `bufferSize` prop affects memory usage and scroll smoothness
- Items are measured and cached for optimal performance
- Dynamic height calculations happen automatically
- Resize observers handle container/content changes
- Virtual DOM updates are batched for efficiency

## License

MIT © [Humanspeak, Inc.](LICENSE)

## Credits

Made with ♥ by [Humanspeak](https://humanspeak.com)
