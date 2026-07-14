import type { SvelteVirtualListScrollAlign } from '$lib/types.js'
import { clampValue, getScrollOffsetForIndex } from './virtualList.js'

/**
 * Calculates the scroll target for aligning an item to a specific edge.
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
/**
 * Per-keypress scroll distance for arrow keys, matching the fixed ~40px line
 * step browsers use for native keyboard scrolling. Deliberately NOT derived
 * from item heights: native scrolling does not know about rows either, and a
 * fixed step keeps arrow behavior predictable across lists.
 */
export const KEYBOARD_LINE_SCROLL_PX = 40

const KEYBOARD_SCROLL_KEYS = new Set([
    'ArrowDown',
    'ArrowUp',
    'PageDown',
    'PageUp',
    ' ',
    'Home',
    'End'
])

/**
 * Whether a KeyboardEvent.key is one of the standard scroll keys the
 * viewport handles. Callers should gate on this BEFORE reading viewport
 * layout (scrollTop/clientHeight/scrollHeight) so unhandled keys — the
 * common case while typing — never force a reflow.
 */
export const isKeyboardScrollKey = (key: string): boolean => KEYBOARD_SCROLL_KEYS.has(key)

export interface KeyboardScrollParams {
    /** KeyboardEvent.key */
    key: string
    /** KeyboardEvent.shiftKey (Shift+Space pages up) */
    shiftKey: boolean
    scrollTop: number
    clientHeight: number
    scrollHeight: number
}

/**
 * Pure key→scrollTop mapping for viewport keyboard scrolling (issue #414):
 * arrows move one line ({@link KEYBOARD_LINE_SCROLL_PX}), PageUp/PageDown and
 * Space/Shift+Space move one page (viewport height minus one line of
 * overlap), Home/End jump to the edges. Returns the clamped target, or null
 * for keys the viewport does not handle.
 */
export const calculateKeyboardScrollTarget = (params: KeyboardScrollParams): number | null => {
    const { key, shiftKey, scrollTop, clientHeight, scrollHeight } = params
    const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
    const page = Math.max(clientHeight - KEYBOARD_LINE_SCROLL_PX, KEYBOARD_LINE_SCROLL_PX)

    let target: number | null = null
    switch (key) {
        case 'ArrowDown':
            target = scrollTop + KEYBOARD_LINE_SCROLL_PX
            break
        case 'ArrowUp':
            target = scrollTop - KEYBOARD_LINE_SCROLL_PX
            break
        case 'PageDown':
            target = scrollTop + page
            break
        case 'PageUp':
            target = scrollTop - page
            break
        case ' ':
            target = scrollTop + (shiftKey ? -page : page)
            break
        case 'Home':
            target = 0
            break
        case 'End':
            target = maxScrollTop
            break
    }
    return target === null ? null : clampValue(target, 0, maxScrollTop)
}

/**
 * The scroll intent an anchor restore resolves against (#413): keep the view
 * pinned to the bottom, or keep an item's cache offset steady through a
 * measurement correction.
 */
export type AnchorScrollIntent =
    | { kind: 'bottom' }
    | { kind: 'item'; oldOffset: number; newOffset: number }

/**
 * Pure decision math for anchor restoration: given the anchor intent and the
 * current scroll geometry, returns the scrollTop to write — or null when no
 * write is warranted (sub-half-pixel offset drift, or a target within 1px of
 * where the viewport already is).
 */
export const resolveAnchorScrollTarget = (
    anchor: AnchorScrollIntent,
    scrollTop: number,
    maxScrollTop: number
): number | null => {
    let target: number
    if (anchor.kind === 'bottom') {
        // End-stable: the view was pinned to the bottom; keep it there
        // under the corrected totals.
        target = Math.round(maxScrollTop)
    } else {
        const drift = anchor.newOffset - anchor.oldOffset
        if (Math.abs(drift) <= 0.5) return null
        target = Math.round(clampValue(scrollTop + drift, 0, maxScrollTop))
    }
    return Math.abs(target - scrollTop) < 1 ? null : target
}

export interface ScrollTargetParams {
    align: SvelteVirtualListScrollAlign
    targetIndex: number
    itemsLength: number
    calculatedItemHeight: number
    height: number
    scrollTop: number
    firstVisibleIndex: number
    lastVisibleIndex: number
    heightCache: Record<number, number>
    /** Optional precomputed block sums for O(blockSize) offset lookup (see buildBlockSums). */
    blockSums?: number[]
}

/**
 * Calculates the target scroll position for scrolling to a specific item index.
 *
 * This function handles different alignment options (auto, top, bottom, nearest)
 * and calculates the optimal scroll position based on the current viewport state.
 *
 * @param params - Parameters for scroll target calculation
 * @returns The target scroll position in pixels, or null if no scroll is needed
 *
 * @example
 * ```typescript
 * const scrollTarget = calculateScrollTarget({
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
        align,
        targetIndex,
        calculatedItemHeight,
        height,
        scrollTop,
        firstVisibleIndex,
        lastVisibleIndex,
        heightCache,
        blockSums
    } = params

    return calculateTopToBottomScrollTarget({
        align,
        targetIndex,
        calculatedItemHeight,
        height,
        scrollTop,
        firstVisibleIndex,
        lastVisibleIndex,
        heightCache,
        blockSums
    })
}

/**
 * Parameters for scroll calculation.
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
    /** Optional precomputed block sums for O(blockSize) offset lookup (see buildBlockSums). */
    blockSums?: number[]
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
        heightCache,
        blockSums
    } = params

    // Calculate item boundaries
    const itemTop = getScrollOffsetForIndex(
        heightCache,
        calculatedItemHeight,
        targetIndex,
        blockSums
    )
    const itemBottom = getScrollOffsetForIndex(
        heightCache,
        calculatedItemHeight,
        targetIndex + 1,
        blockSums
    )

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
