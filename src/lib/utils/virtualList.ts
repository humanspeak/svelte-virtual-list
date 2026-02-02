import type { SvelteVirtualListMode, SvelteVirtualListPreviousVisibleRange } from '$lib/types.js'
import type { VirtualListSetters, VirtualListState } from '$lib/utils/types.js'

/**
 * Visible range cache for memoization.
 * Stores the last computed range along with the inputs used to compute it.
 */
interface VisibleRangeCache {
    scrollTop: number
    viewportHeight: number
    itemHeight: number
    totalItems: number
    mode: SvelteVirtualListMode
    result: SvelteVirtualListPreviousVisibleRange
}

/**
 * Cache holder for instance-scoped visible range caching.
 * Each virtual list instance should maintain its own cache holder to prevent
 * cross-instance cache pollution when multiple lists exist on the same page.
 *
 * @example
 * ```typescript
 * const cacheHolder: VisibleRangeCacheHolder = { current: null }
 * calculateVisibleRange(..., cacheHolder)
 * invalidateVisibleRangeCache(cacheHolder)
 * ```
 */
export interface VisibleRangeCacheHolder {
    current: VisibleRangeCache | null
}

/**
 * Creates a new visible range cache holder for instance-scoped caching.
 *
 * @returns A new cache holder with null initial state
 */
export const createVisibleRangeCacheHolder = (): VisibleRangeCacheHolder => ({
    current: null
})

/**
 * Threshold for scroll delta (in pixels) below which we skip recalculation.
 * Small scroll movements typically don't change the visible range.
 */
const SCROLL_DELTA_THRESHOLD = 8

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

/**
 * Determines the range of items that should be rendered in the virtual list.
 *
 * This function calculates which items should be visible based on the current scroll position,
 * viewport size, and scroll direction. It includes a buffer zone to enable smooth scrolling
 * and prevent visible gaps during rapid scroll movements.
 *
 * @param {number} scrollTop - Current scroll position in pixels
 * @param {number} viewportHeight - Height of the visible area in pixels
 * @param {number} itemHeight - Height of each list item in pixels
 * @param {number} totalItems - Total number of items in the list
 * @param {number} bufferSize - Number of items to render outside the visible area
 * @param {SvelteVirtualListMode} mode - Scroll direction mode
 * @param {boolean} atBottom - Whether currently at bottom of list
 * @param {boolean} wasAtBottomBeforeHeightChange - Whether was at bottom before height changed
 * @param {SvelteVirtualListPreviousVisibleRange | null} lastVisibleRange - Previous visible range
 * @param {number} totalContentHeight - Total content height (optional)
 * @param {Record<number, number>} heightCache - Cache of item heights (optional)
 * @param {VisibleRangeCacheHolder} cacheHolder - Instance-scoped cache holder (optional)
 * @returns {SvelteVirtualListPreviousVisibleRange} Range of indices to render
 */
export const calculateVisibleRange = (
    scrollTop: number,
    viewportHeight: number,
    itemHeight: number,
    totalItems: number,
    bufferSize: number,
    mode: SvelteVirtualListMode,
    atBottom: boolean,
    wasAtBottomBeforeHeightChange: boolean,
    lastVisibleRange: SvelteVirtualListPreviousVisibleRange | null,
    totalContentHeight?: number,
    heightCache?: Record<number, number>,
    cacheHolder?: VisibleRangeCacheHolder
): SvelteVirtualListPreviousVisibleRange => {
    // Use instance-scoped cache if provided
    const cache = cacheHolder?.current ?? null

    // Early exit: if inputs haven't changed significantly, return cached result
    if (cache && lastVisibleRange) {
        const scrollDelta = Math.abs(scrollTop - cache.scrollTop)
        const sameInputs =
            cache.viewportHeight === viewportHeight &&
            cache.totalItems === totalItems &&
            cache.mode === mode &&
            Math.abs(cache.itemHeight - itemHeight) < 1

        // Skip recalculation for small scroll deltas when other inputs are unchanged
        if (sameInputs && scrollDelta < SCROLL_DELTA_THRESHOLD) {
            return cache.result
        }
    }

    // Helper to cache and return result
    const cacheAndReturn = (
        result: SvelteVirtualListPreviousVisibleRange
    ): SvelteVirtualListPreviousVisibleRange => {
        const newCache: VisibleRangeCache = {
            scrollTop,
            viewportHeight,
            itemHeight,
            totalItems,
            mode,
            result
        }
        if (cacheHolder) {
            cacheHolder.current = newCache
        }
        return result
    }

    if (mode === 'bottomToTop') {
        const visibleCount = Math.ceil(viewportHeight / itemHeight) + 1

        // In bottomToTop mode, scrollTop represents distance from the total content end
        // scrollTop = 0 means we're at the beginning (showing first items)
        // scrollTop = maxScrollTop means we're at the end (showing last items)
        const totalHeight = totalContentHeight ?? totalItems * itemHeight
        const maxScrollTop = Math.max(0, totalHeight - viewportHeight)

        // Convert scrollTop to "distance from start" for bottomToTop
        const distanceFromStart = maxScrollTop - scrollTop
        const startIndex = Math.floor(distanceFromStart / itemHeight)

        // Safeguard: handle edge cases
        if (startIndex < 0) {
            // We're scrolled beyond the maximum (showing first items)
            const start = 0
            const end = Math.min(totalItems, visibleCount + bufferSize * 2)

            return cacheAndReturn({ start, end } as SvelteVirtualListPreviousVisibleRange)
        }

        // Add buffer to both ends
        const start = Math.max(0, startIndex - bufferSize)
        const end = Math.min(totalItems, startIndex + visibleCount + bufferSize)

        return cacheAndReturn({ start, end } as SvelteVirtualListPreviousVisibleRange)
    } else {
        const start = Math.floor(scrollTop / itemHeight)
        const end = Math.min(totalItems, start + Math.ceil(viewportHeight / itemHeight) + 1)

        // Safeguard for topToBottom: ensure last item is fully visible when at max scroll
        const totalHeight = totalContentHeight ?? totalItems * itemHeight
        const maxScrollTop = Math.max(0, totalHeight - viewportHeight)
        // Use strict tolerance to avoid premature bottom anchoring that leaves a visible gap
        const tolerance = Math.max(1, Math.floor(itemHeight * 0.25)) // pixels, adaptive for wrong initial sizes
        const isAtBottom = Math.abs(scrollTop - maxScrollTop) <= tolerance

        if (isAtBottom) {
            // Pack from the end using measured heights when available: walk backward until viewport filled
            const adjustedEnd = totalItems
            let startCore = adjustedEnd
            let acc = 0
            const getH = (i: number) =>
                getValidHeight(heightCache ? heightCache[i] : undefined, itemHeight)
            while (startCore > 0 && acc < viewportHeight) {
                const h = getH(startCore - 1)
                acc += h
                startCore -= 1
            }
            return cacheAndReturn({
                start: Math.max(0, startCore - bufferSize),
                end: adjustedEnd
            } as SvelteVirtualListPreviousVisibleRange)
        }

        // Add buffer to both ends
        const finalStart = Math.max(0, start - bufferSize)
        const finalEnd = Math.min(totalItems, end + bufferSize)

        return cacheAndReturn({
            start: finalStart,
            end: finalEnd
        } as SvelteVirtualListPreviousVisibleRange)
    }
}

/**
 * Invalidates the visible range cache.
 * Call this when you know the cache needs to be cleared (e.g., items array changed).
 *
 * @param cacheHolder - The instance-scoped cache holder to invalidate
 *
 * @example
 * ```typescript
 * const cacheHolder = createVisibleRangeCacheHolder()
 * // ... use cache ...
 * invalidateVisibleRangeCache(cacheHolder)
 * ```
 */
export const invalidateVisibleRangeCache = (cacheHolder: VisibleRangeCacheHolder): void => {
    cacheHolder.current = null
}

/**
 * Calculates the CSS transform value for positioning the virtual list items.
 *
 * This function determines the vertical offset needed to position the visible items
 * correctly within the viewport, accounting for the scroll direction and current
 * visible range.
 *
 * @param {SvelteVirtualListMode} mode - Scroll direction mode
 * @param {number} totalItems - Total number of items in the list
 * @param {number} visibleEnd - Index of the last visible item
 * @param {number} visibleStart - Index of the first visible item
 * @param {number} itemHeight - Height of each list item in pixels
 * @param {number} viewportHeight - Height of the viewport in pixels
 * @returns {number} The calculated transform Y value in pixels
 */
export const calculateTransformY = (
    mode: SvelteVirtualListMode,
    totalItems: number,
    visibleEnd: number,
    visibleStart: number,
    itemHeight: number,
    viewportHeight: number,
    totalContentHeight?: number,
    heightCache?: Record<number, number>,
    measuredFallbackHeight?: number
) => {
    const effectiveViewport = viewportHeight || measuredFallbackHeight || 0
    if (mode === 'bottomToTop') {
        // In bottomToTop mode, position items so they stack from bottom up
        const actualTotalHeight = totalContentHeight ?? totalItems * itemHeight

        // Calculate transform to position visible items correctly
        const basicTransform = (totalItems - visibleEnd) * itemHeight

        // When content is smaller than viewport, push to bottom
        const bottomOffset = Math.max(0, effectiveViewport - actualTotalHeight)

        // Snap to integer pixels to avoid subpixel oscillation
        return Math.round(basicTransform + bottomOffset)
    } else {
        // For topToBottom, prefer precise offset using measured heights when available
        if (heightCache) {
            const offset = getScrollOffsetForIndex(heightCache, itemHeight, visibleStart)
            return Math.max(0, Math.round(offset))
        }
        return Math.round(visibleStart * itemHeight)
    }
}

/**
 * Updates the virtual list's height and scroll position when necessary.
 *
 * This function handles dynamic updates to the virtual list's dimensions and scroll
 * position, particularly important when the container size changes or when switching
 * scroll directions. When immediate is true, it forces an immediate update of the
 * height and scroll position.
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
    const {
        initialized,
        mode,
        containerElement,
        viewportElement,
        calculatedItemHeight,
        scrollTop
    } = state

    const { setHeight, setScrollTop } = setters

    if (immediate) {
        if (containerElement && viewportElement && initialized) {
            const newHeight = containerElement.getBoundingClientRect().height
            setHeight(newHeight)

            if (mode === 'bottomToTop') {
                const visibleIndex = Math.floor(scrollTop / calculatedItemHeight)
                const newScrollTop = visibleIndex * calculatedItemHeight
                viewportElement.scrollTop = newScrollTop
                setScrollTop(newScrollTop)
            }
        }
    }
}

/**
 * Calculates the average height of visible items in a virtual list.
 *
 * This function optimizes performance by:
 * 1. Using a height cache to store measured item heights with dirty tracking
 * 2. Only measuring new items not in the cache
 * 3. Calculating a running average of all measured heights
 *
 * @param {HTMLElement[]} itemElements - Array of currently rendered item elements
 * @param {{ start: number }} visibleRange - Object containing the start index of visible items
 * @param {HeightCache} heightCache - Cache of previously measured item heights with dirty tracking
 * @param {number} currentItemHeight - Current average item height being used
 *
 * @returns {{
 *   newHeight: number,
 *   newLastMeasuredIndex: number,
 *   updatedHeightCache: HeightCache
 * }} Object containing new calculated height, last measured index, and updated cache
 *
 * @example
 * const result = calculateAverageHeight(
 *   itemElements,
 *   { start: 0 },
 *   {},
 *   40
 * )
 */
export const calculateAverageHeight = (
    itemElements: HTMLElement[],
    visibleRange: { start: number; end: number },
    heightCache: Record<number, number>,
    currentItemHeight: number,
    dirtyItems: Set<number>,
    currentTotalHeight: number = 0,
    currentValidCount: number = 0,
    mode: SvelteVirtualListMode = 'topToBottom'
): {
    newHeight: number
    newLastMeasuredIndex: number
    updatedHeightCache: Record<number, number>
    clearedDirtyItems: Set<number>
    newTotalHeight: number
    newValidCount: number
    heightChanges: Array<{ index: number; oldHeight: number; newHeight: number; delta: number }>
} => {
    const validElements = itemElements.filter((el) => el)
    if (validElements.length === 0) {
        return {
            newHeight: currentItemHeight,
            newLastMeasuredIndex: visibleRange.start,
            updatedHeightCache: heightCache,
            clearedDirtyItems: new Set(),
            newTotalHeight: currentTotalHeight,
            newValidCount: currentValidCount,
            heightChanges: []
        }
    }

    const newHeightCache = { ...heightCache }
    const clearedDirtyItems = new Set<number>()
    const heightChanges: Array<{
        index: number
        oldHeight: number
        newHeight: number
        delta: number
    }> = []

    // Start with current running totals (O(1) instead of O(n))
    let totalValidHeight = currentTotalHeight
    let validHeightCount = currentValidCount

    // Process only dirty items if they exist, otherwise process all visible items
    if (dirtyItems.size > 0) {
        // Process only dirty items
        dirtyItems.forEach((itemIndex) => {
            // Map original item index to position in itemElements array
            let elementIndex: number
            if (mode === 'bottomToTop') {
                // In bottomToTop, itemElements is reversed relative to the visible range
                // elementIndex should be based on position within the actual array, not theoretical end
                elementIndex = validElements.length - 1 - (itemIndex - visibleRange.start)
            } else {
                // In topToBottom, itemElements is normal: [item0, item1, ..., item44, item45]
                elementIndex = itemIndex - visibleRange.start
            }
            const element = validElements[elementIndex]
            if (element && elementIndex >= 0 && elementIndex < validElements.length) {
                try {
                    // await tick()
                    void element.offsetHeight
                    const height = element.getBoundingClientRect().height
                    const oldHeight = newHeightCache[itemIndex]
                    if (Number.isFinite(height) && height > 0) {
                        // Only update if height actually changed (use smaller tolerance for precision)
                        if (!oldHeight || Math.abs(oldHeight - height) >= 0.1) {
                            // Track the height change for scroll correction
                            const actualOldHeight = oldHeight || currentItemHeight
                            const delta = height - actualOldHeight

                            heightChanges.push({
                                index: itemIndex,
                                oldHeight: actualOldHeight,
                                newHeight: height,
                                delta
                            })

                            // Update running totals
                            if (oldHeight && Number.isFinite(oldHeight) && oldHeight > 0) {
                                // Replace old height with new height in running total
                                totalValidHeight = totalValidHeight - oldHeight + height
                            } else {
                                // Add new height to running total
                                totalValidHeight += height
                                validHeightCount++
                            }
                            newHeightCache[itemIndex] = height
                        }
                    }
                    clearedDirtyItems.add(itemIndex)
                } catch {
                    // Skip invalid measurements but still clear from dirty
                    clearedDirtyItems.add(itemIndex)
                }
            } else {
                clearedDirtyItems.add(itemIndex) // Still clear it from dirty items
            }
        })
    } else {
        // Original behavior: process all visible items
        validElements.forEach((el, i) => {
            const itemIndex =
                mode === 'bottomToTop'
                    ? Math.max(
                          0,
                          (visibleRange.end ?? visibleRange.start + validElements.length) - 1 - i
                      )
                    : visibleRange.start + i
            if (!newHeightCache[itemIndex]) {
                try {
                    const height = el.getBoundingClientRect().height
                    if (Number.isFinite(height) && height > 0) {
                        // Add new height to running totals
                        totalValidHeight += height
                        validHeightCount++
                        newHeightCache[itemIndex] = height
                    }
                } catch {
                    // Skip invalid measurements
                }
            }
        })
    }

    // O(1) average calculation using running totals!
    return {
        newHeight: validHeightCount > 0 ? totalValidHeight / validHeightCount : currentItemHeight,
        newLastMeasuredIndex: visibleRange.start,
        updatedHeightCache: newHeightCache,
        clearedDirtyItems,
        newTotalHeight: totalValidHeight,
        newValidCount: validHeightCount,
        heightChanges
    }
}

/**
 * Processes large arrays in chunks to prevent UI blocking.
 *
 * This function implements a progressive processing strategy that:
 * 1. Breaks down large arrays into manageable chunks
 * 2. Processes each chunk asynchronously
 * 3. Reports progress after each chunk
 * 4. Yields to the main thread between chunks
 *
 * @param {any[]} items - Array of items to process
 * @param {number} chunkSize - Number of items to process in each chunk
 * @param {(processed: number) => void} onProgress - Callback for progress updates
 * @param {() => void} onComplete - Callback when all processing is complete
 *
 * @returns {Promise<void>} Resolves when all chunks have been processed
 *
 * @example
 * await processChunked(
 *   largeArray,
 *   50,
 *   (processed) => console.log(`Processed ${processed} items`),
 *   () => console.log('All items processed')
 * )
 */
export const processChunked = async (
    items: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
    chunkSize: number,
    onProgress: (processed: number) => void, // eslint-disable-line no-unused-vars
    onComplete: () => void
) => {
    if (!items.length) {
        onComplete()
        return
    }

    const processChunk = async (startIdx: number) => {
        const endIdx = Math.min(startIdx + chunkSize, items.length)
        onProgress(endIdx)

        if (endIdx < items.length) {
            setTimeout(() => processChunk(endIdx), 0)
        } else {
            onComplete()
        }
    }

    await processChunk(0)
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

/**
 * BlockSumCache - Incremental block sum management for efficient offset calculations.
 *
 * Instead of rebuilding all block sums on every height change, this class:
 * - Tracks which blocks have been invalidated by height changes
 * - Only recomputes affected blocks when needed (lazy evaluation)
 * - Supports incremental updates via delta application
 *
 * @example
 * ```typescript
 * const cache = new BlockSumCache(1000) // block size 1000
 * cache.invalidateForIndex(1500) // marks block 1 as dirty
 * const sums = cache.getBlockSums(heightCache, estimatedHeight, totalItems)
 * ```
 */
export class BlockSumCache {
    private _blockSize: number
    private _sums: number[] = []
    private _dirtyBlocks: Set<number> = new Set()
    private _lastTotalItems = 0
    private _lastEstimatedHeight = 0

    constructor(blockSize = 1000) {
        this._blockSize = blockSize
    }

    /**
     * Mark the block containing the given index as dirty.
     * Also marks all subsequent blocks as dirty since they depend on cumulative sums.
     */
    invalidateForIndex(index: number): void {
        const blockIdx = Math.floor(index / this._blockSize)
        // Mark this block and all following blocks as dirty
        for (let b = blockIdx; b < this._sums.length; b++) {
            this._dirtyBlocks.add(b)
        }
    }

    /**
     * Invalidate all cached block sums. Use when items array changes significantly.
     */
    invalidateAll(): void {
        this._sums = []
        this._dirtyBlocks.clear()
        this._lastTotalItems = 0
    }

    /**
     * Get block sums, recomputing only dirty blocks.
     * Uses lazy evaluation - blocks are only recomputed when accessed.
     */
    getBlockSums(
        heightCache: Record<number, number>,
        calculatedItemHeight: number,
        totalItems: number
    ): number[] {
        const blocks = Math.ceil(totalItems / this._blockSize)
        const numSums = Math.max(0, blocks - 1)

        // If configuration changed significantly, rebuild entirely
        if (
            totalItems !== this._lastTotalItems ||
            Math.abs(calculatedItemHeight - this._lastEstimatedHeight) > 0.5
        ) {
            this._sums = []
            this._dirtyBlocks.clear()
            this._lastTotalItems = totalItems
            this._lastEstimatedHeight = calculatedItemHeight
        }

        // Resize array if needed
        if (this._sums.length !== numSums) {
            const oldLength = this._sums.length
            const newSums: number[] = new Array(numSums)
            // Copy existing valid sums
            for (let i = 0; i < Math.min(oldLength, numSums); i++) {
                if (!this._dirtyBlocks.has(i)) {
                    newSums[i] = this._sums[i]
                } else {
                    // Mark as dirty in new array context
                    this._dirtyBlocks.add(i)
                }
            }
            // Mark new blocks as dirty
            for (let i = oldLength; i < numSums; i++) {
                this._dirtyBlocks.add(i)
            }
            this._sums = newSums
        }

        // Recompute dirty blocks incrementally
        if (this._dirtyBlocks.size > 0) {
            // Find minimum dirty block index to start recomputation
            let minDirty = Infinity
            this._dirtyBlocks.forEach((b) => {
                if (b < minDirty) minDirty = b
            })

            // Recompute from minDirty onward
            let running = minDirty > 0 ? this._sums[minDirty - 1] || 0 : 0
            for (let b = minDirty; b < numSums; b++) {
                const start = b * this._blockSize
                const end = Math.min(start + this._blockSize, totalItems)
                // Compute this block's sum
                let blockSum = 0
                for (let i = start; i < end; i++) {
                    blockSum += getValidHeight(heightCache[i], calculatedItemHeight)
                }
                running += blockSum
                this._sums[b] = running
            }
            this._dirtyBlocks.clear()
        }

        return this._sums
    }

    /**
     * Check if any blocks are dirty and need recomputation.
     */
    get hasDirtyBlocks(): boolean {
        return this._dirtyBlocks.size > 0
    }

    /**
     * Get the current block size.
     */
    get blockSize(): number {
        return this._blockSize
    }
}
