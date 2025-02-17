import { BROWSER } from 'esm-env'
import type { HeightCache } from './types.js'
import { calculateAverageHeight } from './virtualList.js'

/**
 * Calculates and updates the average height of visible items with debouncing.
 *
 * This function optimizes performance by:
 * - Debouncing calculations to prevent excessive DOM reads (200ms default)
 * - Caching item heights to minimize recalculations
 * - Only updating when significant changes are detected (>1px difference)
 * - Early returns to prevent unnecessary processing
 *
 * Implementation details:
 * - Uses a debounce timeout to batch height calculations
 * - Tracks calculation state to prevent concurrent updates
 * - Caches heights in heightCache for reuse
 * - Validates browser environment and calculation state
 * - Checks for meaningful height changes before updates
 *
 * State interactions:
 * - Updates calculatedItemHeight when significant changes occur
 * - Updates lastMeasuredIndex to track progress
 * - Modifies heightCache to store measured heights
 * - Uses isCalculatingHeight flag for concurrency control
 *
 * Guard clauses:
 * - Returns null if not in browser environment
 * - Returns null if calculation is already in progress
 * - Returns null if update timeout is pending
 * - Returns null if current index matches last measured
 *
 * @example
 * ```typescript
 * // Automatically called when items are rendered
 * $effect(() => {
 *     if (BROWSER && itemElements.length > 0 && !isCalculatingHeight) {
 *         calculateAverageHeightDebounced(
 *             false,
 *             null,
 *             () => getVisibleRange(),
 *             itemElements,
 *             heightCache,
 *             lastMeasuredIndex,
 *             currentHeight,
 *             handleUpdate
 *         )
 *     }
 * })
 * ```
 *
 * Change History:
 *
 * 2025-01-22
 * - Added comprehensive test coverage for all guard clauses
 * - Improved browser environment detection
 * - Enhanced debounce timing precision
 * - Added proper cleanup for timeouts
 * - Documented all edge cases and failure modes
 *
 *
 * @param isCalculatingHeight - Flag to prevent concurrent calculations
 * @param heightUpdateTimeout - Reference to existing update timeout
 * @param visibleItemsGetter - Function to get current visible range
 * @param itemElements - Array of DOM elements to measure
 * @param heightCache - Cache of previously measured heights
 * @param lastMeasuredIndex - Index of last measured element
 * @param calculatedItemHeight - Current average height
 * @param onUpdate - Callback for height updates
 * @param debounceTime - Time to wait between calculations (default: 200ms)
 * @returns Timeout object or null if calculation was skipped
 */
export const calculateAverageHeightDebounced = (
    isCalculatingHeight: boolean,
    heightUpdateTimeout: ReturnType<typeof setTimeout> | null,
    visibleItemsGetter: () => { start: number; end: number },
    itemElements: HTMLElement[],
    heightCache: HeightCache,
    lastMeasuredIndex: number,
    calculatedItemHeight: number,
    /* trunk-ignore(eslint/no-unused-vars) */
    onUpdate: (result: {
        newHeight: number
        newLastMeasuredIndex: number
        updatedHeightCache: HeightCache
    }) => void,
    debounceTime = 200
): NodeJS.Timeout | null => {
    if (!BROWSER || isCalculatingHeight || heightUpdateTimeout) return null

    const visibleRange = visibleItemsGetter()
    const currentIndex = visibleRange.start

    if (currentIndex === lastMeasuredIndex) return null

    return setTimeout(() => {
        const { newHeight, newLastMeasuredIndex, updatedHeightCache } = calculateAverageHeight(
            itemElements,
            visibleRange,
            heightCache,
            calculatedItemHeight
        )

        if (Math.abs(newHeight - calculatedItemHeight) > 1) {
            onUpdate({
                newHeight,
                newLastMeasuredIndex,
                updatedHeightCache
            })
        }
    }, debounceTime)
}
