import { processChunked } from './virtualList.js'

/**
 * Configuration for virtual list initialization
 */
export interface InitializationConfig {
    /** Array of items to initialize */
    items: unknown[]
    /** Number of items to process in each chunk */
    chunkSize: number
    /** Threshold above which to use chunked initialization */
    chunkThreshold?: number
    /** Callback called with progress updates during chunked initialization */
    /* trunk-ignore(eslint/no-unused-vars) */
    onProgress?: (processedItems: number, totalItems: number) => void
    /** Callback called when initialization is complete */
    onComplete?: () => void
}

/**
 * Determines whether to use chunked initialization based on item count and threshold.
 *
 * @param itemCount - Number of items to initialize
 * @param threshold - Threshold above which chunked initialization is used (default: 1000)
 * @returns True if chunked initialization should be used
 *
 * @example
 * ```typescript
 * const useChunked = shouldUseChunkedInitialization(5000) // true
 * const useImmediate = shouldUseChunkedInitialization(500) // false
 * ```
 */
export const shouldUseChunkedInitialization = (itemCount: number, threshold = 1000): boolean => {
    return itemCount > threshold
}

/**
 * Initializes a virtual list with items, using chunked processing for large datasets.
 *
 * This function automatically determines whether to use immediate or chunked initialization
 * based on the number of items. For large datasets, it processes items in chunks to
 * prevent UI blocking, yielding to the main thread between chunks.
 *
 * @param config - Configuration object for initialization
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * ```typescript
 * import { initializeVirtualList } from '$lib/utils/initialization.js'
 *
 * // Initialize with progress tracking
 * await initializeVirtualList({
 *     items: largeDataset,
 *     chunkSize: 50,
 *     onProgress: (processed, total) => {
 *         console.log(`Progress: ${processed}/${total}`)
 *     },
 *     onComplete: () => {
 *         console.log('Initialization complete!')
 *     }
 * })
 * ```
 */
export const initializeVirtualList = async (config: InitializationConfig): Promise<void> => {
    const { items, chunkSize, chunkThreshold = 1000, onProgress, onComplete } = config

    if (!items.length) {
        onComplete?.()
        return
    }

    if (shouldUseChunkedInitialization(items.length, chunkThreshold)) {
        await processChunked(
            items,
            chunkSize,
            (processedItems) => onProgress?.(processedItems, items.length),
            () => onComplete?.()
        )
    } else {
        // Immediate initialization for small datasets
        onProgress?.(items.length, items.length)
        onComplete?.()
    }
}

/**
 * Calculates the optimal chunk size for initialization based on item count and device capabilities.
 *
 * This function provides a heuristic for determining an appropriate chunk size that balances
 * performance and responsiveness. It considers both the total number of items and the
 * estimated processing time per item.
 *
 * @param itemCount - Total number of items to process
 * @param baseChunkSize - Base chunk size to use as a starting point (default: 50)
 * @returns Recommended chunk size
 *
 * @example
 * ```typescript
 * const chunkSize = calculateOptimalChunkSize(10000) // Returns optimized chunk size
 * const smallChunkSize = calculateOptimalChunkSize(100) // Returns smaller chunk size
 * ```
 */
export const calculateOptimalChunkSize = (itemCount: number, baseChunkSize = 50): number => {
    // For very large datasets, use smaller chunks to maintain responsiveness
    if (itemCount > 50000) {
        return Math.max(25, baseChunkSize / 2)
    }

    // For medium datasets, use base chunk size
    if (itemCount > 5000) {
        return baseChunkSize
    }

    // For smaller datasets, we can use larger chunks
    if (itemCount > 1000) {
        return Math.min(100, baseChunkSize * 2)
    }

    // For very small datasets, process all at once
    return itemCount
}

/**
 * Progress information for initialization
 */
export interface InitializationProgress {
    /** Number of items processed */
    processed: number
    /** Total number of items */
    total: number
    /** Percentage complete (0-100) */
    percentage: number
    /** Whether initialization is complete */
    isComplete: boolean
}

/**
 * Creates a progress tracking object for initialization.
 *
 * @param processed - Number of items processed
 * @param total - Total number of items
 * @returns Progress information object
 *
 * @example
 * ```typescript
 * const progress = createProgressInfo(750, 1000)
 * console.log(progress.percentage) // 75
 * console.log(progress.isComplete) // false
 * ```
 */
export const createProgressInfo = (processed: number, total: number): InitializationProgress => {
    return {
        processed,
        total,
        percentage: total > 0 ? Math.round((processed / total) * 100) : 100,
        isComplete: processed >= total
    }
}
