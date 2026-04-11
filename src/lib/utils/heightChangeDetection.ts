/**
 * Utility functions for detecting significant height changes in virtual list items.
 *
 * @fileoverview Provides height change detection utilities for virtual list optimization.
 * These functions help determine when item height changes are significant enough to
 * trigger recalculations, preventing unnecessary updates for sub-pixel variations.
 */

/**
 * Checks if a height change is significant enough to warrant marking an item as dirty.
 *
 * This function compares the new measured height against the cached height for an item
 * and determines if the difference exceeds the specified margin of error. Items with
 * no previous measurement are always considered significant.
 *
 * @param {number} itemIndex - The index of the item in the virtual list.
 * @param {number} newHeight - The new measured height in pixels.
 * @param {Record<number, number>} heightCache - Cache of previously measured item heights.
 * @param {number} [marginOfError=1] - Height difference threshold in pixels. Changes
 *     smaller than this value are considered insignificant.
 * @returns {boolean} Returns true if the height change exceeds the margin of error
 *     or if this is the first measurement for the item.
 *
 * @example
 * ```typescript
 * const heightCache = { 0: 40, 1: 50 };
 *
 * // First-time measurement (no cache entry)
 * isSignificantHeightChange(2, 45, heightCache); // true
 *
 * // Significant change (exceeds 1px threshold)
 * isSignificantHeightChange(0, 45, heightCache); // true
 *
 * // Insignificant change (within 1px threshold)
 * isSignificantHeightChange(0, 40.5, heightCache); // false
 * ```
 */
/**
 * Normalizes a raw measured height for the dedicated bottom-to-top engine.
 * Returns 0 for non-finite or non-positive values, otherwise rounds to the nearest integer
 * with a minimum of 1px.
 */
export const normalizeDedicatedMeasuredHeight = (heightValue: number): number => {
    if (!Number.isFinite(heightValue) || heightValue <= 0) return 0
    return Math.max(1, Math.round(heightValue))
}

/**
 * Checks whether two height values are within a tolerance threshold of each other.
 * Used by the dedicated bottom-to-top engine to avoid unnecessary updates for
 * sub-pixel or rounding-level height variations.
 */
export const isDedicatedHeightWithinTolerance = (
    previous: number | undefined,
    next: number,
    tolerance: number = 1
): boolean =>
    Number.isFinite(previous) &&
    Number.isFinite(next) &&
    Math.abs((previous as number) - next) < tolerance

export const isSignificantHeightChange = (
    itemIndex: number,
    newHeight: number,
    heightCache: Record<number, number>,
    marginOfError: number = 1
): boolean => {
    const previousHeight = heightCache[itemIndex]

    if (previousHeight === undefined) {
        // First time seeing this item, mark as significant
        return true
    }

    const heightDifference = Math.abs(newHeight - previousHeight)
    return heightDifference > marginOfError
}
