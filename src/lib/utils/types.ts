import type { SvelteVirtualListMode } from '$lib/types.js'

/**
 * Represents the internal state of a virtual list component.
 *
 * This type encapsulates all essential properties required to manage the virtual
 * scrolling behavior and rendering optimization of a list component. It tracks both
 * the DOM elements involved and the current scroll metrics.
 *
 * @property {boolean} initialized - Indicates whether the virtual list has completed its initial setup
 * @property {SvelteVirtualListMode} mode - Defines the scrolling behavior ('topToBottom' or 'bottomToTop')
 * @property {HTMLElement | null} containerElement - Reference to the outer container DOM element
 * @property {HTMLElement | null} viewportElement - Reference to the viewport DOM element that clips visible content
 * @property {number} calculatedItemHeight - The computed height of each list item in pixels
 * @property {number} height - Total height of the virtual list container in pixels
 * @property {number} scrollTop - Current vertical scroll position in pixels
 */
export type VirtualListState = {
    initialized: boolean
    mode: SvelteVirtualListMode
    containerElement: HTMLElement | null
    viewportElement: HTMLElement | null
    calculatedItemHeight: number
    height: number
    scrollTop: number
}

/**
 * Collection of setter functions for updating VirtualListState properties.
 *
 * These setters provide a controlled interface for modifying the virtual list's state,
 * ensuring that state updates are handled consistently throughout the component.
 * Each setter is designed to update a single specific aspect of the virtual list's state.
 *
 * @property {Function} setHeight - Updates the total height of the virtual list container
 * @property {Function} setScrollTop - Updates the current scroll position
 * @property {Function} setInitialized - Updates the initialization status of the virtual list
 */
export type VirtualListSetters = {
    setHeight: (height: number) => void // eslint-disable-line no-unused-vars
    setScrollTop: (scrollTop: number) => void // eslint-disable-line no-unused-vars
    setInitialized: (initialized: boolean) => void // eslint-disable-line no-unused-vars
}

/**
 * Represents a cached height entry for a virtual list item
 */
export type HeightCacheEntry = {
    currentHeight: number
    dirty: boolean
}

/**
 * Cache for storing measured item heights with dirty tracking
 * - Key: Item index in the list
 * - Value: Object containing current height and dirty flag
 */
export type HeightCache = Record<number, HeightCacheEntry>
