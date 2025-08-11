/**
 * Represents a height change for a specific item
 * This interface accepts any object with these minimum properties,
 * allowing for additional fields that consumers may include
 */
export interface HeightChange {
    /** The index of the item that changed */
    readonly index: number
    /** The previous height (undefined if first measurement) */
    readonly oldHeight: number | undefined
    /** The new height measurement (undefined represents removal/unset) */
    readonly newHeight: number | undefined
}

/**
 * Configuration options for ReactiveListManager (formerly ReactiveListManager)
 */
export interface ListManagerConfig {
    /** Total number of items in the list */
    itemLength: number
    /** Height to use for unmeasured items */
    itemHeight: number
    /** Whether to enable internal debug logging */
    internalDebug?: boolean
}

/**
 * Debug information about the height manager state
 */
export interface ListManagerDebugInfo {
    /** Total measured height of all measured items */
    totalMeasuredHeight: number
    /** Number of items that have been measured */
    measuredCount: number
    /** Total number of items in the list */
    itemLength: number
    /** Percentage of items that have been measured */
    coveragePercent: number
    /** Current height to use for unmeasured items */
    itemHeight: number
    /** Calculated average height of measured items */
    averageHeight: number
    /** Current total height (measured + estimated) */
    totalHeight: number
}
