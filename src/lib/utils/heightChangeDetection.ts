/**
 * Utility functions for detecting significant height changes in virtual list items
 */

/**
 * Checks if a height change is significant enough to warrant marking an item as dirty
 * @param itemIndex - The index of the item
 * @param newHeight - The new measured height
 * @param heightCache - Existing height cache to compare against
 * @param marginOfError - Height difference threshold (default: 1px)
 * @returns true if the height change is significant
 */
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
