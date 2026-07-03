import type { SvelteVirtualListPreviousVisibleRange } from '$lib/types.js'
import type { VirtualListSetters, VirtualListState } from '$lib/utils/types.js'

/**
 * Validates a height value and returns it if valid, otherwise returns the fallback.
 *
 * A height is considered valid if it is a finite number greater than 0.
 * This utility consolidates the repeated pattern of height validation
 * found throughout the virtual list codebase.
 *
 * @param {unknown} height - The height value to validate
 * @param {number} fallback - The fallback value to use if height is invalid
 * @returns {number} The validated height or the fallback value
 *
 * @example
 * ```typescript
 * const height = getValidHeight(heightCache[i], calculatedItemHeight)
 * // Returns heightCache[i] if valid, otherwise calculatedItemHeight
 * ```
 */
export const getValidHeight = (height: unknown, fallback: number): number =>
    Number.isFinite(height) && (height as number) > 0 ? (height as number) : fallback

const BOTTOM_TOLERANCE_FACTOR = 0.25

/**
 * Clamps a numeric value to be within a specified range.
 *
 * This utility consolidates the repeated `Math.max(min, Math.min(max, value))`
 * pattern used throughout scroll calculations and positioning logic.
 *
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum allowed value
 * @param {number} max - The maximum allowed value
 * @returns {number} The clamped value
 *
 * @example
 * ```typescript
 * const scrollTop = clampValue(targetScrollTop, 0, maxScrollTop)
 * // Ensures scrollTop is between 0 and maxScrollTop
 * ```
 */
export const clampValue = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value))

/**
 * Calculates the maximum scroll position for a virtual list.
 *
 * This function determines the maximum scrollable distance by computing the difference
 * between the total content height and the visible container height. This is crucial
 * for maintaining proper scroll boundaries in virtual lists.
 *
 * @param {number} totalItems - The total number of items in the list
 * @param {number} itemHeight - The height of each individual item in pixels
 * @param {number} containerHeight - The visible height of the container in pixels
 * @returns {number} The maximum scroll position in pixels
 */
export const calculateScrollPosition = (
    totalItems: number,
    itemHeight: number,
    containerHeight: number
) => {
    if (totalItems === 0) return 0
    const totalHeight = totalItems * itemHeight
    return Math.max(0, totalHeight - containerHeight)
}

/** Options for {@link calculateVisibleRange}. */
export interface VisibleRangeOptions {
    scrollTop: number
    viewportHeight: number
    /** Estimated/average item height used as fallback for unmeasured items. */
    itemHeight: number
    totalItems: number
    /** Number of extra items to render outside the visible area. */
    bufferSize: number
    /** Pre-calculated total content height; defaults to `totalItems * itemHeight`. */
    totalContentHeight?: number
    /** Measured item heights keyed by index; used to walk actual heights instead of dividing by average. */
    heightCache?: Record<number, number>
}

/**
 * Determines the range of items that should be rendered in the virtual list.
 *
 * Calculates which items should be visible based on the current scroll position
 * and viewport size. Includes a buffer zone to enable smooth scrolling
 * and prevent visible gaps during rapid scroll movements.
 *
 * @param options - Inputs used to compute the visible range (see {@link VisibleRangeOptions}).
 * @returns Range of indices to render.
 *
 * @example
 * ```ts
 * const range = calculateVisibleRange({
 *     scrollTop: 200,
 *     viewportHeight: 400,
 *     itemHeight: 40,
 *     totalItems: 1000,
 *     bufferSize: 2
 * })
 * // range => { start: 3, end: 15 }
 * ```
 */
export const calculateVisibleRange = ({
    scrollTop,
    viewportHeight,
    itemHeight,
    totalItems,
    bufferSize,
    totalContentHeight,
    heightCache
}: VisibleRangeOptions): SvelteVirtualListPreviousVisibleRange => {
    // Walk forward through measured heights to find the correct start index
    // instead of dividing by average height (which is wrong for variable-height items).
    let start = 0
    let acc = 0
    while (start < totalItems) {
        const h = getValidHeight(heightCache?.[start], itemHeight)
        if (acc + h > scrollTop) break
        acc += h
        start++
    }

    // Walk forward from start to find end
    let end = start
    let viewAcc = 0
    while (end < totalItems && viewAcc < viewportHeight) {
        viewAcc += getValidHeight(heightCache?.[end], itemHeight)
        end++
    }
    end = Math.min(totalItems, end + 1) // +1 to ensure partial items are visible

    // Safeguard: ensure last item is fully visible when at max scroll
    const totalHeight = totalContentHeight ?? totalItems * itemHeight
    const maxScrollTop = Math.max(0, totalHeight - viewportHeight)
    // Use strict tolerance to avoid prematurely treating the list as scrolled to the end.
    const tolerance = Math.max(1, Math.floor(itemHeight * BOTTOM_TOLERANCE_FACTOR))
    const isAtBottom = Math.abs(scrollTop - maxScrollTop) <= tolerance

    if (isAtBottom) {
        // Pack from the end using measured heights when available: walk backward until viewport filled
        const adjustedEnd = totalItems
        let startCore = adjustedEnd
        let backAcc = 0
        while (startCore > 0 && backAcc < viewportHeight) {
            backAcc += getValidHeight(heightCache?.[startCore - 1], itemHeight)
            startCore -= 1
        }
        return {
            start: Math.max(0, startCore - bufferSize),
            end: adjustedEnd
        } as SvelteVirtualListPreviousVisibleRange
    }

    // Add buffer to both ends
    const finalStart = Math.max(0, start - bufferSize)
    const finalEnd = Math.min(totalItems, end + bufferSize)

    return {
        start: finalStart,
        end: finalEnd
    } as SvelteVirtualListPreviousVisibleRange
}

/**
 * Calculates the CSS transform value for positioning the virtual list items.
 *
 * This function determines the vertical offset needed to position the visible items
 * correctly within the viewport.
 *
 * @param {number} totalItems - Total number of items in the list
 * @param {number} visibleStart - Index of the first visible item
 * @param {number} itemHeight - Height of each list item in pixels
 * @param {Record<number, number>} [heightCache] - Cache of measured item heights
 * @returns {number} The calculated transform Y value in pixels
 */
export const calculateTransformY = (
    totalItems: number,
    visibleStart: number,
    itemHeight: number,
    heightCache?: Record<number, number>
) => {
    // Prefer precise offset using measured heights when available
    if (heightCache) {
        const offset = getScrollOffsetForIndex(heightCache, itemHeight, visibleStart)
        return Math.max(0, Math.round(offset))
    }
    return Math.round(visibleStart * itemHeight)
}

/**
 * Updates the virtual list's height and scroll position when necessary.
 *
 * This function handles dynamic updates to the virtual list's dimensions and scroll
 * position, particularly important when the container size changes. When immediate
 * is true, it forces an immediate update of the height and scroll position.
 *
 * @param {VirtualListState} state - Current state of the virtual list
 * @param {VirtualListSetters} setters - State setters for updating list properties
 * @param {boolean} immediate - Whether to perform the update immediately
 */
export const updateHeightAndScroll = (
    state: VirtualListState,
    setters: VirtualListSetters,
    immediate = false
) => {
    const { initialized, containerElement, viewportElement } = state

    const { setHeight } = setters

    if (immediate) {
        if (containerElement && viewportElement && initialized) {
            const newHeight = containerElement.getBoundingClientRect().height
            setHeight(newHeight)
        }
    }
}

/**
 * Measures an item's layout pitch: the vertical space it actually occupies in
 * the items container, including any margins that collapse through the
 * component's unstyled item wrappers.
 *
 * A border-box measurement (`getBoundingClientRect().height`) excludes
 * margins, and chat-bubble-style CSS (`margin: 12px 0` on rendered content)
 * collapses through the wrapper — permanently under-counting every item and
 * running totalHeight short (issue #412). Layout offsets are ground truth:
 * the delta from this wrapper's top to the next sibling's top includes
 * collapsed margins by construction. The last rendered wrapper is closed by
 * the items container's bottom edge — the container is absolutely positioned
 * (a block formatting context), so its auto height includes the last child's
 * bottom margin.
 *
 * Known bounded residual: the leading collapsed margin above the first item
 * belongs to no pitch — a constant ≤ one margin across the whole list,
 * invisible to scrolling.
 *
 * Falls back to the border-box height when the element is not laid out
 * (detached, display: none, or non-browser test environments where offsets
 * read 0).
 *
 * @param {HTMLElement} element - The item wrapper element to measure.
 * @returns {number} The item's layout pitch in pixels.
 */
export const measureItemPitch = (element: HTMLElement): number => {
    const rect = element.getBoundingClientRect()
    const parent = element.parentElement
    if (!parent) return rect.height

    const next = element.nextElementSibling
    const pitch = next
        ? next.getBoundingClientRect().top - rect.top
        : parent.getBoundingClientRect().bottom - rect.top

    return pitch > 0 ? pitch : rect.height
}

/**
 * Calculates the scroll offset (in pixels) needed to bring a specific item into view in a virtual list.
 *
 * Uses block memoization for efficient O(b) offset calculation, where b = block size (default 1000).
 * For very large lists, this avoids O(n) iteration for every scroll.
 *
 * - For indices >= blockSize, sums the block prefix, then only iterates the tail within the block.
 * - For small indices, falls back to the original logic.
 *
 * @param {HeightCache} heightCache - Map of measured item heights with dirty tracking
 * @param {number} calculatedItemHeight - Estimated height for unmeasured items
 * @param {number} idx - The index to scroll to (exclusive)
 * @param {number[]} [blockSums] - Optional precomputed block sums (for repeated queries)
 * @param {number} [blockSize=1000] - Block size for memoization
 * @returns {number} The total offset in pixels from the top of the list to the start of the item at idx.
 *
 * @example
 * // For best performance with repeated queries:
 * const blockSums = buildBlockSums(heightCache, calculatedItemHeight, items.length);
 * const offset = getScrollOffsetForIndex(heightCache, calculatedItemHeight, 12345, blockSums);
 */
export const getScrollOffsetForIndex = (
    heightCache: Record<number, number>,
    calculatedItemHeight: number,
    idx: number,
    blockSums?: number[],
    blockSize = 1000
): number => {
    // normalize and clamp index
    const safeIdx = Math.max(0, Math.floor(idx))
    if (safeIdx <= 0) return 0
    if (!blockSums) {
        // Fallback: O(n) for a single query
        let offset = 0

        for (let i = 0; i < safeIdx; i++) {
            offset += getValidHeight(heightCache[i], calculatedItemHeight)
        }

        return offset
    }
    const blockIdx = Math.floor(safeIdx / blockSize)
    let offsetBase = 0
    if (blockIdx > 0) {
        const base = blockSums[blockIdx - 1]
        offsetBase = Number.isFinite(base) ? (base as number) : 0
    }
    let offset = offsetBase
    const start = blockIdx * blockSize
    for (let i = start; i < safeIdx; i++) {
        offset += getValidHeight(heightCache[i], calculatedItemHeight)
    }
    return offset
}

/**
 * Builds block prefix sums for heightCache to accelerate offset queries.
 *
 * This function precomputes cumulative height sums for blocks of items, enabling
 * O(blockSize) offset calculations instead of O(n). The returned array contains
 * the total height of all items up to and including each completed block.
 *
 * For example, with blockSize=1000:
 * - Entry 0: sum of heights for items 0-999
 * - Entry 1: sum of heights for items 0-1999
 * - Entry 2: sum of heights for items 0-2999
 *
 * @param {Record<number, number>} heightCache - Cache of measured item heights.
 * @param {number} calculatedItemHeight - Estimated height for unmeasured items.
 * @param {number} totalItems - Total number of items in the list.
 * @param {number} [blockSize=1000] - Number of items per block for memoization.
 * @returns {number[]} Array of cumulative height sums for each completed block.
 *
 * @example
 * ```typescript
 * const heightCache = { 0: 40, 1: 50, 2: 45 };
 * const blockSums = buildBlockSums(heightCache, 40, 5000, 1000);
 *
 * // Use with getScrollOffsetForIndex for efficient lookups
 * const offset = getScrollOffsetForIndex(heightCache, 40, 2500, blockSums);
 * ```
 */
export const buildBlockSums = (
    heightCache: Record<number, number>,
    calculatedItemHeight: number,
    totalItems: number,
    blockSize = 1000
): number[] => {
    const blocks = Math.ceil(totalItems / blockSize)
    const sums: number[] = new Array(Math.max(0, blocks - 1))
    let running = 0
    for (let b = 0; b < blocks - 1; b++) {
        const start = b * blockSize
        const end = start + blockSize
        for (let i = start; i < end; i++) {
            running += getValidHeight(heightCache[i], calculatedItemHeight)
        }
        sums[b] = running
    }
    return sums
}
