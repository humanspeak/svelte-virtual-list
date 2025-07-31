import type { SvelteVirtualListMode, SvelteVirtualListScrollAlignment } from '$lib/types.js'
import { getScrollOffsetForIndex } from './virtualList.js'

/**
 * Parameters for calculating scroll target position
 */
export interface ScrollTargetParams {
    mode: SvelteVirtualListMode
    align: SvelteVirtualListScrollAlignment
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
            lastVisibleIndex
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
 * Parameters for bottom-to-top scroll calculation
 */
interface BottomToTopScrollParams {
    align: SvelteVirtualListScrollAlignment
    targetIndex: number
    itemsLength: number
    calculatedItemHeight: number
    height: number
    scrollTop: number
    firstVisibleIndex: number
    lastVisibleIndex: number
}

/**
 * Calculates scroll target for bottom-to-top mode
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
        lastVisibleIndex
    } = params

    const totalHeight = itemsLength * calculatedItemHeight
    const itemOffset = targetIndex * calculatedItemHeight
    const itemHeight = calculatedItemHeight

    if (align === 'auto') {
        // If item is above the viewport, align to top
        if (targetIndex < firstVisibleIndex) {
            return Math.max(0, totalHeight - (itemOffset + itemHeight))
        }
        // If item is below the viewport, align to bottom
        else if (targetIndex > lastVisibleIndex - 1) {
            return Math.max(0, totalHeight - itemOffset - height)
        } else {
            // Item is visible but not aligned: align to nearest edge
            const itemTop = totalHeight - (itemOffset + itemHeight)
            const itemBottom = totalHeight - itemOffset
            const distanceToTop = Math.abs(scrollTop - itemTop)
            const distanceToBottom = Math.abs(scrollTop + height - itemBottom)

            if (distanceToTop < distanceToBottom) {
                return itemTop
            } else {
                return Math.max(0, itemBottom - height)
            }
        }
    } else if (align === 'top') {
        return Math.max(0, totalHeight - (itemOffset + itemHeight))
    } else if (align === 'bottom') {
        return Math.max(0, totalHeight - itemOffset - height)
    } else if (align === 'nearest') {
        const itemTop = totalHeight - (itemOffset + itemHeight)
        const itemBottom = totalHeight - itemOffset

        if (itemBottom <= scrollTop || itemTop >= scrollTop + height) {
            // Not visible, align to nearest edge
            const distanceToTop = Math.abs(scrollTop - itemTop)
            const distanceToBottom = Math.abs(scrollTop + height - itemBottom)

            if (distanceToTop < distanceToBottom) {
                return itemTop
            } else {
                return Math.max(0, itemBottom - height)
            }
        } else {
            // Already visible, do nothing
            return null
        }
    }

    return null
}

/**
 * Parameters for top-to-bottom scroll calculation
 */
interface TopToBottomScrollParams {
    align: SvelteVirtualListScrollAlignment
    targetIndex: number
    calculatedItemHeight: number
    height: number
    scrollTop: number
    firstVisibleIndex: number
    lastVisibleIndex: number
    heightCache: Record<number, number>
}

/**
 * Calculates scroll target for top-to-bottom mode
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

    if (align === 'auto') {
        // If item is above the viewport, align to top
        if (targetIndex < firstVisibleIndex) {
            return getScrollOffsetForIndex(heightCache, calculatedItemHeight, targetIndex)
        }
        // If item is below the viewport, align to bottom
        else if (targetIndex > lastVisibleIndex - 1) {
            const itemBottom = getScrollOffsetForIndex(
                heightCache,
                calculatedItemHeight,
                targetIndex + 1
            )
            return Math.max(0, itemBottom - height)
        } else {
            // Item is visible but not aligned: align to nearest edge
            const itemTop = getScrollOffsetForIndex(heightCache, calculatedItemHeight, targetIndex)
            const itemBottom = getScrollOffsetForIndex(
                heightCache,
                calculatedItemHeight,
                targetIndex + 1
            )
            const distanceToTop = Math.abs(scrollTop - itemTop)
            const distanceToBottom = Math.abs(scrollTop + height - itemBottom)

            if (distanceToTop < distanceToBottom) {
                return itemTop
            } else {
                return Math.max(0, itemBottom - height)
            }
        }
    } else if (align === 'top') {
        return getScrollOffsetForIndex(heightCache, calculatedItemHeight, targetIndex)
    } else if (align === 'bottom') {
        const itemBottom = getScrollOffsetForIndex(
            heightCache,
            calculatedItemHeight,
            targetIndex + 1
        )
        return Math.max(0, itemBottom - height)
    } else if (align === 'nearest') {
        const itemTop = getScrollOffsetForIndex(heightCache, calculatedItemHeight, targetIndex)
        const itemBottom = getScrollOffsetForIndex(
            heightCache,
            calculatedItemHeight,
            targetIndex + 1
        )

        if (itemBottom <= scrollTop || itemTop >= scrollTop + height) {
            // Not visible, align to nearest edge
            const distanceToTop = Math.abs(scrollTop - itemTop)
            const distanceToBottom = Math.abs(scrollTop + height - itemBottom)

            if (distanceToTop < distanceToBottom) {
                return itemTop
            } else {
                return Math.max(0, itemBottom - height)
            }
        } else {
            // Already visible, do nothing
            return null
        }
    }

    return null
}
