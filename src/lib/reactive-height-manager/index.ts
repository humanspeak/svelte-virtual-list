/**
 * Reactive Height Manager
 *
 * A standalone, high-performance reactive height calculation system for virtualized lists.
 *
 * Features:
 * - Incremental height processing (O(dirty items) instead of O(all items))
 * - Reactive state management using Svelte 5 runes
 * - Comprehensive performance testing
 * - Framework-agnostic types and interfaces
 * - Memory-efficient measurement tracking
 *
 * @example Basic Usage
 * ```typescript
 * import { ReactiveHeightManager } from './reactive-height-manager'
 *
 * const manager = new ReactiveHeightManager({
 *   itemLength: 10000,
 *   estimatedHeight: 40
 * })
 *
 * // Process height changes incrementally
 * manager.processDirtyHeights(heightChanges)
 *
 * // Get reactive total height
 * const totalHeight = manager.getDerivedTotalHeight(calculatedItemHeight)
 * ```
 *
 * @example Performance Monitoring
 * ```typescript
 * const debugInfo = manager.getDebugInfo()
 * console.log(`Coverage: ${debugInfo.coveragePercent}%`)
 * console.log(`Measured: ${debugInfo.measuredCount}/${debugInfo.itemLength}`)
 * ```
 */

// Export the main class
export { ReactiveHeightManager } from './ReactiveHeightManager.svelte.js'
import { ReactiveHeightManager as ReactiveHeightManagerType } from './ReactiveHeightManager.svelte.js'

// Export all types
export type { HeightChange, HeightManagerConfig, HeightManagerDebugInfo } from './types.js'

// Export version for potential npm package
export const VERSION = '1.0.0'

// Export utility constants
export const DEFAULT_ESTIMATED_HEIGHT = 40
export const DEFAULT_MEASUREMENT_THRESHOLD = 10 // percentage

/**
 * Factory function for creating ReactiveHeightManager instances
 * with common configurations
 */
export function createHeightManager(
    itemLength: number,
    itemHeight: number = DEFAULT_ESTIMATED_HEIGHT
): ReactiveHeightManagerType {
    return new ReactiveHeightManagerType({ itemLength, itemHeight })
}

/**
 * Performance benchmarking utility
 */
// Moved out to keep index clean; re-exported from benchmark.ts
export { benchmarkHeightManager } from './benchmark.js'
