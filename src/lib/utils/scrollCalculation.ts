import type { SvelteVirtualListMode, SvelteVirtualListScrollAlign } from '$lib/types.js'
import { clampValue, getScrollOffsetForIndex } from './virtualList.js'

/**
 * Calculates the scroll target for aligning an item to a specific edge.
 *
 * This helper consolidates the shared alignment logic between bottomToTop
 * and topToBottom scroll calculations, reducing code duplication.
 *
 * @param {number} itemTop - The top position of the item in pixels
 * @param {number} itemBottom - The bottom position of the item in pixels
 * @param {number} scrollTop - Current scroll position in pixels
 * @param {number} viewportHeight - Height of the viewport in pixels
 * @param {'top' | 'bottom' | 'nearest'} align - The alignment mode
 * @returns {number | null} The scroll target position, or null if item is already visible (for 'nearest')
 */
export const alignToEdge = (
    itemTop: number,
    itemBottom: number,
    scrollTop: number,
    viewportHeight: number,
    align: 'top' | 'bottom' | 'nearest'
): number | null => {
    if (align === 'top') {
        return itemTop
    }

    if (align === 'bottom') {
        return clampValue(itemBottom - viewportHeight, 0, Infinity)
    }

    // 'nearest' alignment
    const viewportBottom = scrollTop + viewportHeight
    const isVisible = itemTop < viewportBottom && itemBottom > scrollTop

    if (isVisible) {
        // Already visible, no scroll needed
        return null
    }

    // Not visible - align to nearest edge
    const distanceToTop = Math.abs(scrollTop - itemTop)
    const distanceToBottom = Math.abs(viewportBottom - itemBottom)

    return distanceToTop < distanceToBottom
        ? itemTop
        : clampValue(itemBottom - viewportHeight, 0, Infinity)
}

/**
 * Calculates the scroll target for aligning a visible item to its nearest edge.
 *
 * Unlike alignToEdge with 'nearest', this always returns a scroll position
 * even when the item is visible. Used for 'auto' alignment mode when item
 * is within the visible range.
 *
 * @param {number} itemTop - The top position of the item in pixels
 * @param {number} itemBottom - The bottom position of the item in pixels
 * @param {number} scrollTop - Current scroll position in pixels
 * @param {number} viewportHeight - Height of the viewport in pixels
 * @returns {number} The scroll target position aligned to nearest edge
 *
 * @example
 * ```typescript
 * // For a visible item, align to whichever edge is closer
 * const scrollTarget = alignVisibleToNearestEdge(400, 450, 200, 400)
 * viewportElement.scrollTo({ top: scrollTarget })
 * ```
 */
export const alignVisibleToNearestEdge = (
    itemTop: number,
    itemBottom: number,
    scrollTop: number,
    viewportHeight: number
): number => {
    const viewportBottom = scrollTop + viewportHeight
    const distanceToTop = Math.abs(scrollTop - itemTop)
    const distanceToBottom = Math.abs(viewportBottom - itemBottom)

    return distanceToTop < distanceToBottom
        ? itemTop
        : clampValue(itemBottom - viewportHeight, 0, Infinity)
}

/**
 * Parameters for calculating scroll target position
 */
export interface ScrollTargetParams {
    mode: SvelteVirtualListMode
    align: SvelteVirtualListScrollAlign
    targetIndex: number
    itemsLength: number
    calculatedItemHeight: number
    height: number
    scrollTop: number
    firstVisibleIndex: number
    lastVisibleIndex: number
    heightCache: Record<number, number>
}

/**
 * Calculates the target scroll position for scrolling to a specific item index.
 *
 * This function handles both topToBottom and bottomToTop scroll modes with different
 * alignment options (auto, top, bottom, nearest). It takes into account the current
 * viewport state and calculates the optimal scroll position.
 *
 * @param params - Parameters for scroll target calculation
 * @returns The target scroll position in pixels, or null if no scroll is needed
 *
 * @example
 * ```typescript
 * const scrollTarget = calculateScrollTarget({
 *     mode: 'topToBottom',
 *     align: 'auto',
 *     targetIndex: 100,
 *     itemsLength: 1000,
 *     calculatedItemHeight: 50,
 *     height: 400,
 *     scrollTop: 200,
 *     firstVisibleIndex: 4,
 *     lastVisibleIndex: 12,
 *     heightCache: {}
 * })
 *
 * if (scrollTarget !== null) {
 *     viewportElement.scrollTo({ top: scrollTarget })
 * }
 * ```
 */
export const calculateScrollTarget = (params: ScrollTargetParams): number | null => {
    const {
        mode,
        align,
        targetIndex,
        itemsLength,
        calculatedItemHeight,
        height,
        scrollTop,
        firstVisibleIndex,
        lastVisibleIndex,
        heightCache
    } = params

    if (mode === 'bottomToTop') {
        return calculateBottomToTopScrollTarget({
            align,
            targetIndex,
            itemsLength,
            calculatedItemHeight,
            height,
            scrollTop,
            firstVisibleIndex,
            lastVisibleIndex,
            heightCache
        })
    } else {
        return calculateTopToBottomScrollTarget({
            align,
            targetIndex,
            calculatedItemHeight,
            height,
            scrollTop,
            firstVisibleIndex,
            lastVisibleIndex,
            heightCache
        })
    }
}

/**
 * Parameters for bottom-to-top scroll calculation.
 *
 * @interface BottomToTopScrollParams
 */
interface BottomToTopScrollParams {
    /** Alignment mode for the target item. */
    align: SvelteVirtualListScrollAlign
    /** Index of the item to scroll to. */
    targetIndex: number
    /** Total number of items in the list. */
    itemsLength: number
    /** Calculated average height of items in pixels. */
    calculatedItemHeight: number
    /** Height of the viewport in pixels. */
    height: number
    /** Current scroll position in pixels. */
    scrollTop: number
    /** Index of the first visible item. */
    firstVisibleIndex: number
    /** Index of the last visible item. */
    lastVisibleIndex: number
    /** Cache of measured item heights. */
    heightCache: Record<number, number>
}

/**
 * Calculates the target scroll position for bottom-to-top mode.
 *
 * In bottom-to-top mode, items are rendered from the bottom of the viewport upward,
 * which requires different scroll calculations than the standard top-to-bottom mode.
 * This function handles the coordinate system translation and alignment logic.
 *
 * @param {BottomToTopScrollParams} params - Parameters for scroll calculation.
 * @returns {number | null} The target scroll position in pixels, or null if no
 *     scroll is needed (item already visible with 'nearest' alignment).
 */
const calculateBottomToTopScrollTarget = (params: BottomToTopScrollParams): number | null => {
    const {
        align,
        targetIndex,
        itemsLength,
        calculatedItemHeight,
        height,
        scrollTop,
        firstVisibleIndex,
        lastVisibleIndex,
        heightCache
    } = params

    // Use getScrollOffsetForIndex for accurate positioning with height cache
    const totalHeight = getScrollOffsetForIndex(heightCache, calculatedItemHeight, itemsLength)
    const itemOffset = getScrollOffsetForIndex(heightCache, calculatedItemHeight, targetIndex)
    const itemHeight = calculatedItemHeight

    // Calculate item boundaries in bottomToTop coordinate space
    const itemTop = totalHeight - (itemOffset + itemHeight)
    const itemBottom = totalHeight - itemOffset

    if (align === 'auto') {
        // If item is above the viewport, align to top
        if (targetIndex < firstVisibleIndex) {
            return alignToEdge(itemTop, itemBottom, scrollTop, height, 'top')
        } else if (targetIndex > lastVisibleIndex - 1) {
            // In bottomToTop, "below" means higher indices that need HIGHER scrollTop
            return alignToEdge(itemTop, itemBottom, scrollTop, height, 'bottom')
        } else {
            // Item is visible - align to nearest edge (always returns a value)
            return alignVisibleToNearestEdge(itemTop, itemBottom, scrollTop, height)
        }
    }

    if (align === 'top' || align === 'bottom' || align === 'nearest') {
        return alignToEdge(itemTop, itemBottom, scrollTop, height, align)
    }

    return null
}

/**
 * Parameters for top-to-bottom scroll calculation.
 *
 * @interface TopToBottomScrollParams
 */
interface TopToBottomScrollParams {
    /** Alignment mode for the target item. */
    align: SvelteVirtualListScrollAlign
    /** Index of the item to scroll to. */
    targetIndex: number
    /** Calculated average height of items in pixels. */
    calculatedItemHeight: number
    /** Height of the viewport in pixels. */
    height: number
    /** Current scroll position in pixels. */
    scrollTop: number
    /** Index of the first visible item. */
    firstVisibleIndex: number
    /** Index of the last visible item. */
    lastVisibleIndex: number
    /** Cache of measured item heights. */
    heightCache: Record<number, number>
}

/**
 * Calculates the target scroll position for top-to-bottom mode.
 *
 * This is the standard scroll mode where items are rendered from the top of the
 * viewport downward. The function calculates the optimal scroll position based
 * on the alignment option and current viewport state.
 *
 * @param {TopToBottomScrollParams} params - Parameters for scroll calculation.
 * @returns {number | null} The target scroll position in pixels, or null if no
 *     scroll is needed (item already visible with 'nearest' alignment).
 */
const calculateTopToBottomScrollTarget = (params: TopToBottomScrollParams): number | null => {
    const {
        align,
        targetIndex,
        calculatedItemHeight,
        height,
        scrollTop,
        firstVisibleIndex,
        lastVisibleIndex,
        heightCache
    } = params

    // Calculate item boundaries
    const itemTop = getScrollOffsetForIndex(heightCache, calculatedItemHeight, targetIndex)
    const itemBottom = getScrollOffsetForIndex(heightCache, calculatedItemHeight, targetIndex + 1)

    if (align === 'auto') {
        // If item is above the viewport, align to top
        if (targetIndex < firstVisibleIndex) {
            return alignToEdge(itemTop, itemBottom, scrollTop, height, 'top')
        }
        // If item is below the viewport, align to bottom
        else if (targetIndex > lastVisibleIndex - 1) {
            return alignToEdge(itemTop, itemBottom, scrollTop, height, 'bottom')
        } else {
            // Item is visible - align to nearest edge (always returns a value)
            return alignVisibleToNearestEdge(itemTop, itemBottom, scrollTop, height)
        }
    }

    if (align === 'top' || align === 'bottom' || align === 'nearest') {
        return alignToEdge(itemTop, itemBottom, scrollTop, height, align)
    }

    return null
}
