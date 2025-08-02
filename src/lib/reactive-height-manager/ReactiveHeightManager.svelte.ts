import type { HeightChange, HeightManagerConfig, HeightManagerDebugInfo } from './types.js'

/**
 * ReactiveHeightManager - A standalone reactive height calculation system
 *
 * Efficiently manages height calculations for virtualized lists by:
 * - Tracking measured vs unmeasured items incrementally
 * - Processing only dirty/changed items (O(dirty) instead of O(all))
 * - Providing reactive state updates using Svelte 5 runes
 * - Maintaining accurate total height calculations
 *
 * @example
 * ```typescript
 * const manager = new ReactiveHeightManager({ itemLength: 10000, estimatedHeight: 40 })
 *
 * // Process height changes incrementally
 * manager.processDirtyHeights(dirtyResults)
 *
 * // Update calculated item height
 * manager.calculatedItemHeight = 42
 *
 * // Get reactive total height (automatically updates)
 * const totalHeight = manager.totalHeight
 * ```
 */
export class ReactiveHeightManager {
    // Reactive state using Svelte 5 runes
    private _totalMeasuredHeight = $state(0)
    private _measuredCount = $state(0)
    private _itemLength = $state(0)
    private _itemHeight = $state(40)

    /**
     * Get total measured height of all measured items
     */
    get totalMeasuredHeight(): number {
        return this._totalMeasuredHeight
    }

    /**
     * Get count of items that have been measured
     */
    get measuredCount(): number {
        return this._measuredCount
    }

    /**
     * Get total number of items in the list
     */
    get itemLength(): number {
        return this._itemLength
    }

    /**
     * Get/Set the height to use for unmeasured items (reactive)
     */
    get itemHeight(): number {
        return this._itemHeight
    }

    set itemHeight(value: number) {
        this._itemHeight = value
    }

    /**
     * Get the reactive total height of all items (measured + estimated)
     * This automatically updates when any dependencies change
     */
    get totalHeight(): number {
        const unmeasuredCount = this._itemLength - this._measuredCount

        // Use the better of measured average or item height for estimation
        const averageOfMeasured =
            this._measuredCount > 0
                ? this._totalMeasuredHeight / this._measuredCount
                : this._itemHeight

        const estimatedHeight = unmeasuredCount * averageOfMeasured
        return this._totalMeasuredHeight + estimatedHeight
    }

    /**
     * Create a new ReactiveHeightManager instance
     *
     * @param config - Configuration object containing itemLength and itemHeight
     */
    constructor(config: HeightManagerConfig) {
        this._itemLength = config.itemLength
        this._itemHeight = config.itemHeight
    }

    /**
     * Process height changes incrementally - O(dirty items) instead of O(all items)
     *
     * This is the core optimization: instead of recalculating totals for all items,
     * we only process the items that have changed, maintaining running totals.
     *
     * Accepts any object that has index, oldHeight, and newHeight properties,
     * allowing consumers to pass objects with additional fields.
     *
     * @param dirtyResults - Array of height changes to process
     */
    processDirtyHeights(dirtyResults: HeightChange[]): void {
        // Batch calculate changes to trigger reactivity only once
        let heightDelta = 0
        let countDelta = 0

        for (const change of dirtyResults) {
            const { oldHeight, newHeight } = change

            // Remove old contribution if it existed
            if (oldHeight !== undefined) {
                heightDelta -= oldHeight
                countDelta -= 1
            }

            // Add new contribution
            if (newHeight !== undefined) {
                heightDelta += newHeight
                countDelta += 1
            }
        }

        // Apply all changes at once - triggers reactivity only once
        this._totalMeasuredHeight += heightDelta
        this._measuredCount += countDelta
    }

    /**
     * Update when items array length changes
     *
     * @param newLength - New total number of items
     */
    updateItemLength(newLength: number): void {
        this._itemLength = newLength
    }

    /**
     * Update estimated height for unmeasured items
     *
     * @param newEstimatedHeight - New estimated height
     */
    updateEstimatedHeight(newEstimatedHeight: number): void {
        this._estimatedHeight = newEstimatedHeight
    }

    /**
     * Reset all state to initial values
     *
     * Useful for testing or when completely reinitializing the list
     */
    reset(): void {
        this._totalMeasuredHeight = 0
        this._measuredCount = 0
        // Note: Don't reset _itemLength, _itemHeight as they represent configuration, not measured state
    }

    /**
     * Get comprehensive debug information
     *
     * @returns Debug information object
     */
    getDebugInfo(): HeightManagerDebugInfo {
        return {
            totalMeasuredHeight: this._totalMeasuredHeight,
            measuredCount: this._measuredCount,
            itemLength: this._itemLength,
            coveragePercent:
                this._itemLength > 0 ? (this._measuredCount / this._itemLength) * 100 : 0,
            itemHeight: this._itemHeight,
            totalHeight: this.totalHeight
        }
    }

    /**
     * Get the percentage of items that have been measured
     *
     * @returns Percentage (0-100) of measured items
     */
    getMeasurementCoverage(): number {
        return this.getDebugInfo().coveragePercent
    }

    /**
     * Check if the manager has sufficient measurement data
     *
     * @param threshold - Minimum percentage of items that should be measured (default: 10)
     * @returns true if coverage meets threshold
     */
    hasSufficientMeasurements(threshold: number = 10): boolean {
        return this.getMeasurementCoverage() >= threshold
    }
}
