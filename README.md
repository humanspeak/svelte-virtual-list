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

- `scroll(options: { index: number; smoothScroll?: boolean; shouldThrowOnBounds?: boolean; align?: 'auto' | 'top' | 'bottom' | 'nearest' })`
    - `index`: The item index to scroll to (0-based)
    - `smoothScroll`: If true, uses smooth scrolling (default: true)
    - `shouldThrowOnBounds`: If true, throws if index is out of bounds (default: true)
    - `align`: Where to align the item in the viewport:
        - `'auto'` (default): Only scroll if not visible, align to top or bottom as appropriate
        - `'top'`: Always align to the top
        - `'bottom'`: Always align to the bottom
        - `'nearest'`: Scroll as little as possible to bring the item into view (like native scrollIntoView({ block: 'nearest' }))

#### Usage Examples

```svelte
<button on:click={() => listRef.scroll({ index: 5000, align: 'nearest' })}>
    Scroll to item 5000 (nearest)
</button>
```

## Installation

```bash
# Using npm
npm install @humanspeak/svelte-virtual-list

# Using pnpm (recommended)
pnpm add @humanspeak/svelte-virtual-list

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

### Bottom-to-top mode

Use `mode="bottomToTop"` for chat-like lists anchored to the bottom. Programmatic scrolling uses the same API as top-to-bottom lists:

```svelte
<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list'
    let listRef
    const messages = Array.from({ length: 2000 }, (_, i) => ({ id: i, text: `Msg ${i}` }))
</script>

<SvelteVirtualList items={messages} mode="bottomToTop" bind:this={listRef} />
<button on:click={() => listRef.scroll({ index: messages.length - 1, align: 'bottom' })}>
    Jump to latest
</button>
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

### Development Commands

```bash
# Start development server
pnpm dev

# Start both package and docs
pnpm run dev:all

# Check TypeScript/Svelte
pnpm run check

# Build package
pnpm run build

# Format and lint code
pnpm run lint:fix
```

## Performance Considerations

- The `bufferSize` prop affects memory usage and scroll smoothness
- Items are measured and cached for optimal performance
- Dynamic height calculations happen automatically
- Resize observers handle container/content changes
- Virtual DOM updates are batched for efficiency

## Project Structure

This is a **PNPM workspace** with two packages:

1. **`./`** - Main Svelte Virtual List component package
2. **`./docs`** - Documentation site with live demos and examples

### Development Workflow

```bash
# Install dependencies for both packages
pnpm install

# Run development servers simultaneously
pnpm run dev:all

# Build both packages
pnpm run build

# Run tests across the workspace
pnpm test:all
```

## License

MIT © [Humanspeak, Inc.](LICENSE)

## Credits

Made with ♥ by [Humanspeak](https://humanspeak.com)
