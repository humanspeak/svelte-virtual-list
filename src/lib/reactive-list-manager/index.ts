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
 * import { ReactiveListManager } from './reactive-list-manager'
 *
 * const manager = new ReactiveListManager({
 *   itemLength: 10000,
 *   itemHeight: 40
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

// Export the main class under the new name; keep legacy name as alias
export { ReactiveListManager } from './ReactiveListManager.svelte.js'
import { ReactiveListManager as ReactiveListManagerType } from './ReactiveListManager.svelte.js'

// Export all types
export type { HeightChange, ListManagerConfig, ListManagerDebugInfo } from './types.js'

// Export version for potential npm package
export const VERSION = '1.0.0'

// Export utility constants
export const DEFAULT_ESTIMATED_HEIGHT = 40
export const DEFAULT_MEASUREMENT_THRESHOLD = 10 // percentage

// New factory alias with the renamed type
export function createListManager(
    itemLength: number,
    itemHeight: number = DEFAULT_ESTIMATED_HEIGHT
): ReactiveListManagerType {
    return new ReactiveListManagerType({ itemLength, itemHeight })
}

/**
 * Performance benchmarking utility
 */
// Moved out to keep index clean; re-exported from benchmark.ts
export { benchmarkListManager } from './benchmark.js'
