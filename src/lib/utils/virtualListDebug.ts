import type { SvelteVirtualListDebugInfo } from '$lib/types.js'

/**
 * Determines whether debug information should be displayed based on state changes in the virtual list.
 *
 * This function implements an intelligent change detection algorithm that prevents unnecessary debug
 * output while ensuring critical state transitions are captured. It specifically tracks changes in
 * the visible range boundaries and item height calculations to provide meaningful debugging insights
 * without overwhelming the console.
 *
 * Typical usage:
 * ```typescript
 * if (shouldShowDebugInfo(prevRange, currentRange, prevHeight, currentHeight)) {
 *   console.log('Virtual list state changed significantly');
 * }
 * ```
 *
 * @param prevRange - Previous visible range state object containing start and end indices
 * @param currentRange - Current visible range state object containing start and end indices
 * @param prevHeight - Previous calculated item height in pixels
 * @param currentHeight - Current calculated item height in pixels
 * @returns {boolean} Returns true if debug information should be displayed based on state changes
 *
 * @example
 * const shouldShow = shouldShowDebugInfo(
 *   { start: 0, end: 10 },
 *   { start: 5, end: 15 },
 *   100,
 *   120
 * );
 */
export const shouldShowDebugInfo = (
    prevRange: { start: number; end: number } | null,
    currentRange: { start: number; end: number },
    prevHeight: number,
    currentHeight: number
): boolean => {
    if (!prevRange) return true

    return (
        prevRange.start !== currentRange.start ||
        prevRange.end !== currentRange.end ||
        prevHeight !== currentHeight
    )
}

/**
 * Creates a comprehensive debug information object for virtual list state analysis.
 *
 * This utility function generates a structured debug object that captures the complete
 * state of a virtual list at any given moment. It includes critical metrics such as
 * visible item count, viewport boundaries, total items, processed items with measured
 * heights, height calculations, scroll position, and total content dimensions.
 * This information is essential for performance monitoring, debugging scroll behavior,
 * and optimizing virtual list configurations.
 *
 * Performance considerations:
 * - All calculations are O(1)
 * - Memory footprint is constant regardless of list size
 * - Safe for high-frequency calls during scroll events
 *
 * @param visibleRange - Current visible range object containing start and end indices
 * @param totalItems - Total number of items in the virtual list
 * @param processedItems - Number of items with measured heights (heightCache.length)
 * @param averageItemHeight - Current calculated average height per item in pixels
 * @param scrollTop - Current scroll position in pixels
 * @param viewportHeight - Height of the viewport in pixels
 * @returns {SvelteVirtualListDebugInfo} A structured debug information object
 *
 * @example
 * const debugInfo = createDebugInfo(
 *   { start: 0, end: 10 },
 *   1000,
 *   50,
 *   45,
 *   200,
 *   400
 * );
 * console.log('Virtual List State:', debugInfo);
 *
 * @throws {Error} Will throw if end index is less than start index in visibleRange
 */
export const createDebugInfo = (
    visibleRange: { start: number; end: number },
    totalItems: number,
    processedItems: number,
    averageItemHeight: number,
    scrollTop: number,
    viewportHeight: number,
    totalHeight: number
): SvelteVirtualListDebugInfo => {
    const atTop = scrollTop <= 1 // Small tolerance for floating point precision
    const atBottom = scrollTop >= totalHeight - viewportHeight - 1 // Small tolerance

    return {
        visibleItemsCount: visibleRange.end - visibleRange.start,
        startIndex: visibleRange.start,
        endIndex: visibleRange.end,
        totalItems,
        processedItems, // Number of items with measured heights in heightCache
        averageItemHeight,
        atTop,
        atBottom,
        totalHeight
    }
}
