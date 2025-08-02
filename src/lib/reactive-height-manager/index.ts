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
): ReactiveHeightManager {
    return new ReactiveHeightManager({ itemLength, itemHeight })
}

/**
 * Performance benchmarking utility
 */
export function benchmarkHeightManager(
    itemCount: number,
    dirtyCount: number,
    iterations: number = 100
): { avgTime: number; totalTime: number; opsPerSecond: number } {
    const manager = createHeightManager(itemCount)
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
        const dirtyResults = Array.from({ length: dirtyCount }, (_, idx) => ({
            index: idx,
            oldHeight: undefined,
            newHeight: 40 + Math.random() * 20
        }))

        const start = performance.now()
        manager.processDirtyHeights(dirtyResults)
        const end = performance.now()

        times.push(end - start)
        manager.reset() // Reset for next iteration
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const avgTime = totalTime / iterations
    const opsPerSecond = 1000 / avgTime // Convert ms to ops/second

    return {
        avgTime,
        totalTime,
        opsPerSecond
    }
}
