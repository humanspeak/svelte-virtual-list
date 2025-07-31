/**
 * Configuration for item resize observation
 */
export interface ItemResizeConfig {
    /** Debug mode for logging resize events */
    debug?: boolean
    /** Callback when items are marked as dirty */
    /* trunk-ignore(eslint/no-unused-vars) */
    onItemsDirty?: (dirtyIndices: Set<number>) => void
}

/**
 * Creates a ResizeObserver for monitoring individual item size changes.
 *
 * This function creates a ResizeObserver that watches for size changes in list items
 * and maintains a dirty set of items that need height recalculation. It's designed
 * specifically for virtual list components where item heights may change dynamically.
 *
 * @param itemElements - Array of item elements to watch
 * @param getVisibleRange - Function to get current visible range
 * @param dirtyItems - Set to track items that need recalculation
 * @param config - Configuration options
 * @returns ResizeObserver instance
 *
 * @example
 * ```typescript
 * const itemElements = $state<HTMLElement[]>([])
 * const dirtyItems = $state(new Set<number>())
 *
 * const resizeObserver = createItemResizeObserver(
 *     itemElements,
 *     () => ({ start: 0, end: 10 }),
 *     dirtyItems,
 *     {
 *         debug: true,
 *         onItemsDirty: (indices) => console.log('Items dirty:', indices)
 *     }
 * )
 * ```
 */
export const createItemResizeObserver = (
    itemElements: HTMLElement[],
    getVisibleRange: () => { start: number; end: number },
    dirtyItems: Set<number>,
    config: ItemResizeConfig = {}
): ResizeObserver => {
    const { debug = false, onItemsDirty } = config

    return new ResizeObserver((entries) => {
        let shouldRecalculate = false
        const newDirtyItems = new Set<number>()

        if (debug) {
            console.log(`ResizeObserver fired for ${entries.length} entries`)
        }

        for (const entry of entries) {
            const element = entry.target as HTMLElement
            const elementIndex = itemElements.indexOf(element)

            if (elementIndex !== -1) {
                const visibleRange = getVisibleRange()
                const actualIndex = visibleRange.start + elementIndex

                // ResizeObserver fired = element resized, so add to dirty queue
                dirtyItems.add(actualIndex)
                newDirtyItems.add(actualIndex)
                shouldRecalculate = true

                if (debug) {
                    console.log(
                        `Item ${actualIndex} marked dirty (resized), queue size: ${dirtyItems.size}`
                    )
                }
            }
        }

        if (shouldRecalculate && onItemsDirty) {
            onItemsDirty(newDirtyItems)
        }
    })
}

/**
 * Configuration for container resize observation
 */
export interface ContainerResizeConfig {
    /** Debug mode for logging resize events */
    debug?: boolean
    /** Callback when container is resized */
    /* trunk-ignore(eslint/no-unused-vars) */
    onResize?: (entry: ResizeObserverEntry) => void
}

/**
 * Creates a ResizeObserver for monitoring container size changes.
 *
 * This function creates a ResizeObserver that watches for size changes in the
 * virtual list container and triggers appropriate updates to height and scroll position.
 *
 * @param config - Configuration options
 * @returns ResizeObserver instance
 *
 * @example
 * ```typescript
 * const containerResizeObserver = createContainerResizeObserver({
 *     debug: true,
 *     onResize: (entry) => {
 *         const newHeight = entry.contentRect.height
 *         updateHeightAndScroll(true)
 *     }
 * })
 *
 * if (containerElement) {
 *     containerResizeObserver.observe(containerElement)
 * }
 * ```
 */
export const createContainerResizeObserver = (
    config: ContainerResizeConfig = {}
): ResizeObserver => {
    const { debug = false, onResize } = config

    return new ResizeObserver((entries) => {
        for (const entry of entries) {
            if (debug) {
                console.log('Container resized:', entry.contentRect)
            }

            onResize?.(entry)
        }
    })
}

/**
 * Utility to safely observe elements with automatic cleanup.
 *
 * This function provides a safe way to observe elements with a ResizeObserver,
 * handling cases where the observer might not be available or elements might be null.
 *
 * @param observer - ResizeObserver instance
 * @param element - Element to observe
 * @param debug - Whether to log debug information
 * @returns Cleanup function to stop observing
 *
 * @example
 * ```typescript
 * const cleanup = safeObserve(resizeObserver, element, true)
 *
 * // Later, stop observing
 * cleanup()
 * ```
 */
export const safeObserve = (
    observer: ResizeObserver | null,
    element: HTMLElement | null,
    debug = false
): (() => void) => {
    if (observer && element) {
        observer.observe(element)
        if (debug) {
            console.log('Started observing element:', element)
        }

        return () => {
            if (observer && element) {
                observer.unobserve(element)
                if (debug) {
                    console.log('Stopped observing element:', element)
                }
            }
        }
    }

    if (debug && !observer) {
        console.log('ResizeObserver not available for element:', element)
    }

    return () => {} // No-op cleanup function
}

/**
 * Manages multiple ResizeObserver instances with automatic cleanup.
 *
 * This class provides a convenient way to manage multiple ResizeObserver instances
 * and ensures proper cleanup when the component is destroyed.
 */
export class ResizeObserverManager {
    private observers: ResizeObserver[] = []
    private cleanupFunctions: (() => void)[] = []

    /**
     * Adds a ResizeObserver to the manager
     */
    addObserver(observer: ResizeObserver): void {
        this.observers.push(observer)
    }

    /**
     * Adds a cleanup function to be called during cleanup
     */
    addCleanup(cleanup: () => void): void {
        this.cleanupFunctions.push(cleanup)
    }

    /**
     * Observes an element with automatic cleanup tracking
     */
    observe(observer: ResizeObserver, element: HTMLElement, debug = false): void {
        const cleanup = safeObserve(observer, element, debug)
        this.addCleanup(cleanup)
    }

    /**
     * Disconnects all observers and runs cleanup functions
     */
    cleanup(): void {
        // Disconnect all observers
        for (const observer of this.observers) {
            observer.disconnect()
        }

        // Run all cleanup functions
        for (const cleanup of this.cleanupFunctions) {
            cleanup()
        }

        // Clear arrays
        this.observers.length = 0
        this.cleanupFunctions.length = 0
    }
}
