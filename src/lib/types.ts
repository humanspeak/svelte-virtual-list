import type { Snippet } from 'svelte'

/**
 * Defines the scroll direction and rendering mode for the virtual list.
 *
 * @typedef {'topToBottom' | 'bottomToTop'} SvelteVirtualListMode
 */
export type SvelteVirtualListMode = 'topToBottom' | 'bottomToTop'

/**
 * Configuration properties for the SvelteVirtualList component.
 *
 * @typedef {Object} SvelteVirtualListProps
 */
export type SvelteVirtualListProps = {
    /**
     * Number of items to render outside the visible viewport for smooth scrolling.
     * @default 20
     */
    bufferSize?: number
    /**
     * CSS class to apply to the outer container element.
     */
    containerClass?: string
    /**
     * CSS class to apply to the content wrapper element.
     */
    contentClass?: string
    /**
     * Initial height estimate for each item in pixels. Used for optimization before actual measurements are available.
     * @default 40
     */
    defaultEstimatedItemHeight?: number
    /**
     * When true, enables debug mode with additional logging and information.
     * @default false
     */
    debug?: boolean
    /**
     * Custom callback to handle debug information. Receives a SvelteVirtualListDebugInfo object.
     */
    debugFunction?: (_info: SvelteVirtualListDebugInfo) => void
    /**
     * The complete array of items to be virtualized.
     */
    items: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    /**
     * CSS class to apply to individual item containers.
     */
    itemsClass?: string
    /**
     * Determines the scroll and render direction.
     * @default 'topToBottom'
     */
    mode?: SvelteVirtualListMode
    /**
     * Svelte snippet function that defines how each item should be rendered. Receives the item and its index as arguments.
     */
    renderItem: Snippet<[item: any, index: number]> // eslint-disable-line @typescript-eslint/no-explicit-any
    /**
     * Base test ID for component elements to facilitate testing.
     */
    testId?: string
    /**
     * CSS class to apply to the scrollable viewport element.
     */
    viewportClass?: string
}

/**
 * Debug information provided by the virtual list during rendering.
 *
 * @typedef {Object} SvelteVirtualListDebugInfo
 * @property {number} endIndex - Index of the last rendered item in the viewport.
 * @property {number} startIndex - Index of the first rendered item in the viewport.
 * @property {number} totalItems - Total number of items in the list.
 * @property {number} visibleItemsCount - Number of items currently visible in the viewport.
 * @property {number} processedItems - Number of items processed in the viewport.
 */
export type SvelteVirtualListDebugInfo = {
    endIndex: number
    startIndex: number
    totalItems: number
    visibleItemsCount: number
    processedItems: number
    averageItemHeight: number
}

/**
 * Alignment options for programmatic scrolling.
 */
export type SvelteVirtualListScrollAlign = 'auto' | 'top' | 'bottom' | 'nearest'

/**
 * Options for scrolling to a specific index in the virtual list.
 */
export interface SvelteVirtualListScrollOptions {
    /** The index of the item to scroll to. */
    index: number
    /** Whether to use smooth scrolling animation. Default: true */
    smoothScroll?: boolean
    /** Whether to throw an error if the index is out of bounds. Default: true */
    shouldThrowOnBounds?: boolean
    /** Alignment for the scrolled item: 'auto', 'top', or 'bottom'. Default: 'auto' */
    align?: SvelteVirtualListScrollAlign
}

/**
 * Default options for scrolling.
 */
export const DEFAULT_SCROLL_OPTIONS: Partial<SvelteVirtualListScrollOptions> = {
    smoothScroll: true,
    shouldThrowOnBounds: true,
    align: 'auto' as SvelteVirtualListScrollAlign
}
