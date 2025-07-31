import type { Snippet } from 'svelte'
import { describe, expect, test } from 'vitest'
import SvelteVirtualListDefault, {
    type SvelteVirtualListDebugInfo,
    type SvelteVirtualListMode,
    type SvelteVirtualListProps,
    type SvelteVirtualListScrollAlign,
    type SvelteVirtualListScrollOptions
} from './index.js'
import SvelteVirtualListDirect from './SvelteVirtualList.svelte'

describe('index.ts exports', () => {
    test('should export SvelteVirtualList as default', () => {
        expect(SvelteVirtualListDefault).toBeDefined()
        expect(SvelteVirtualListDefault).toBe(SvelteVirtualListDirect)
    })

    test('should export correct types', () => {
        // Create objects that match the exported types to verify type exports
        const debugInfo: SvelteVirtualListDebugInfo = {
            visibleItemsCount: 10,
            startIndex: 0,
            endIndex: 10,
            totalItems: 100,
            estimatedItemHeight: 30
        }

        const mode: SvelteVirtualListMode = 'topToBottom'

        // Use a mock Snippet for renderItem
        const mockSnippet: Snippet = (() => {}) as unknown as Snippet
        const props: SvelteVirtualListProps<any> = {
            items: [],
            renderItem: mockSnippet
        }

        // Test scroll options and align types if exported
        const scrollOptions: SvelteVirtualListScrollOptions = {
            index: 0,
            smoothScroll: true,
            shouldThrowOnBounds: true,
            align: 'auto'
        }
        const align: SvelteVirtualListScrollAlign = 'bottom'

        expect(debugInfo).toBeDefined()
        expect(mode).toBeDefined()
        expect(props).toBeDefined()
        expect(scrollOptions).toBeDefined()
        expect(align).toBeDefined()
    })
})
