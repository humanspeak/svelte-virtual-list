import type { HeightChange, ListManagerConfig, ListManagerDebugInfo } from './types.js'

/**
 * ReactiveListManager - A standalone reactive height calculation system
 *
 * Efficiently manages height calculations for virtualized lists by:
 * - Tracking measured vs unmeasured items incrementally
 * - Processing only dirty/changed items (O(dirty) instead of O(all))
 * - Providing reactive state updates using Svelte 5 runes
 * - Maintaining accurate total height calculations
 *
 * @example
 * ```typescript
 * const manager = new ReactiveListManager({ itemLength: 10000, estimatedHeight: 40 })
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
export class ReactiveListManager {
    // Reactive state using Svelte 5 runes
    private _totalMeasuredHeight = $state(0)
    private _measuredCount = $state(0)
    private _itemLength = $state(0)
    private _itemHeight = $state(40)
    private _averageHeight = $state(40)
    private _totalHeight = $state(0)
    private _measuredFlags: Uint8Array | null = null
    private _initialized = $state(false)
    private _scrollTop = $state(0)
    private _containerElement: HTMLElement | null = $state(null)
    private _viewportElement: HTMLElement | null = $state(null)
    private _internalDebug = false
    private _isReady = $state(false)
    private _dynamicUpdateInProgress = $state(false)
    private _dynamicUpdateDepth = $state(0)
    // Internal cache of measured heights by index
    private _heightCache: Record<number, number> = {}

    private recomputeDerivedHeights(): void {
        const average =
            this._measuredCount > 0
                ? this._totalMeasuredHeight / this._measuredCount
                : this._itemHeight
        this._averageHeight = average
        const unmeasuredCount = this._itemLength - this._measuredCount
        this._totalHeight = this._totalMeasuredHeight + unmeasuredCount * average
    }

    private recomputeIsReady(): void {
        this._isReady = !!this._containerElement && !!this._viewportElement
    }

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
        this.recomputeDerivedHeights()
    }

    /**
     * Get/Set initialized flag
     */
    get initialized(): boolean {
        return this._initialized
    }

    set initialized(value: boolean) {
        if (this._initialized) {
            throw new Error(
                'ReactiveListManager: initialized flag cannot be set to true after it has been set to true'
            )
        }
        this._initialized = value
    }

    /**
     * Get/Set current scrollTop (reactive)
     */
    get scrollTop(): number {
        return this._scrollTop
    }

    set scrollTop(value: number) {
        // Debug: warn if the same value is set excessively within a short window
        if (this._internalDebug) {
            this.#debugCheckScrollTopRepeat(value)
        }
        this._scrollTop = value
    }

    /**
     * Container element reference (reactive, nullable)
     *
     * Why both `containerElement` and `container` exist:
     * - `containerElement` is a nullable, reactive reference intended for Svelte `bind:this` wiring
     *   from components. It may be temporarily null during mount/unmount and is safe to read as
     *   a possibly-null value. Setting it more than once is prohibited to catch wiring bugs early.
     * - `container` is the non-null accessor for internal consumers that require a definite
     *   HTMLElement once the manager is wired. It throws until the manager is `isReady === true`
     *   (i.e., both container and viewport are present). Use this when you want a guaranteed DOM node.
     */
    get containerElement(): HTMLElement | null {
        return this._containerElement
    }
    get container(): HTMLElement {
        if (!this._isReady) {
            throw new Error('ReactiveListManager: container is not ready')
        }
        return this._containerElement!
    }
    set containerElement(el: HTMLElement | null) {
        this._containerElement = el
        this.recomputeIsReady()
    }

    /**
     * Viewport element reference (reactive, nullable)
     *
     * Why both `viewportElement` and `viewport` exist:
     * - `viewportElement` is a nullable, reactive reference intended for Svelte `bind:this` wiring
     *   from components. It may be temporarily null during mount/unmount and is safe to read as
     *   a possibly-null value. Setting it more than once is prohibited to catch wiring bugs early.
     * - `viewport` is the non-null accessor for internal consumers that require a definite
     *   HTMLElement once the manager is wired. It throws until the manager is `isReady === true`
     *   (i.e., both container and viewport are present). Use this when you want a guaranteed DOM node.
     */
    get viewportElement(): HTMLElement | null {
        return this._viewportElement
    }
    get viewport(): HTMLElement {
        if (!this._isReady) {
            throw new Error('ReactiveListManager: viewport is not ready')
        }
        return this._viewportElement!
    }
    set viewportElement(el: HTMLElement | null) {
        this._viewportElement = el
        this.recomputeIsReady()
    }

    get isReady(): boolean {
        return this._isReady
    }

    /**
     * Whether a dynamic update is currently running.
     * Set to true while `runDynamicUpdate` is executing.
     */
    get isDynamicUpdateInProgress(): boolean {
        return this._dynamicUpdateDepth > 0
    }

    /**
     * Begin a dynamic update. Handles nested calls: the first call disables UA scroll anchoring,
     * subsequent calls just increment depth. Safe to call when not wired; styles are only toggled
     * when both container and viewport are ready.
     */
    startDynamicUpdate(): void {
        const isOuter = this._dynamicUpdateDepth === 0
        this._dynamicUpdateDepth += 1
        if (isOuter) {
            this._dynamicUpdateInProgress = true
            if (this._isReady && this._viewportElement) {
                this._viewportElement.style.setProperty('overflow-anchor', 'none')
            }
        }
    }

    /**
     * End a dynamic update started by `startDynamicUpdate`. Handles nesting: only the final
     * corresponding end call re-enables UA scroll anchoring. Guards against underflow.
     */
    endDynamicUpdate(): void {
        if (this._dynamicUpdateDepth <= 0) {
            return
        }
        this._dynamicUpdateDepth -= 1
        if (this._dynamicUpdateDepth === 0) {
            if (this._isReady && this._viewportElement) {
                this._viewportElement.style.setProperty('overflow-anchor', 'auto')
            }
            this._dynamicUpdateInProgress = false
        }
    }

    /**
     * Run a dynamic update with UA scroll anchoring disabled, then restore it.
     * Accepts a sync or async function and ensures `overflow-anchor` is toggled
     * around the operation. If the manager isn't ready yet, it simply executes `fn`.
     */
    async runDynamicUpdate<T>(fn: () => T | Promise<T>): Promise<T> {
        this.startDynamicUpdate()
        try {
            const result = fn()
            return (result instanceof Promise ? await result : result) as T
        } finally {
            this.endDynamicUpdate()
        }
    }

    // --- Internal debug helpers (non-exported) ---
    #debugLastScrollValue: number | null = null
    #debugWindowStartMs = 0
    #debugRepeatCount = 0
    #debugWarnedThisWindow = false
    #debugCheckScrollTopRepeat(value: number): void {
        const now =
            typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()

        if (this.#debugLastScrollValue === value) {
            if (now - this.#debugWindowStartMs <= 1000) {
                this.#debugRepeatCount += 1
                if (this.#debugRepeatCount > 10 && !this.#debugWarnedThisWindow) {
                    this.#debugWarnedThisWindow = true
                    console.warn(
                        '\n================ SvelteVirtualList DEBUG ================\n' +
                            `scrollTop assigned same value ${value} > 10 times within 1s\n` +
                            `count=${this.#debugRepeatCount}, windowStart=${Math.round(this.#debugWindowStartMs)}ms\n` +
                            'This may indicate redundant updates or feedback loops.\n' +
                            '========================================================\n'
                    )
                }
            } else {
                // New time window for the same value
                this.#debugWindowStartMs = now
                this.#debugRepeatCount = 1
                this.#debugWarnedThisWindow = false
            }
        } else {
            // Different value: reset tracking
            this.#debugLastScrollValue = value
            this.#debugWindowStartMs = now
            this.#debugRepeatCount = 1
            this.#debugWarnedThisWindow = false
        }
    }

    /**
     * Get the calculated average height of measured items
     * Falls back to itemHeight if no items have been measured yet
     */
    get averageHeight(): number {
        return this._averageHeight
    }

    /**
     * Get the reactive total height of all items (measured + estimated)
     * This automatically updates when any dependencies change
     */
    get totalHeight(): number {
        return this._totalHeight
    }

    /**
     * Read-only view of measured heights cache
     */
    getHeightCache(): Readonly<Record<number, number>> {
        return this._heightCache
    }

    /**
     * Create a new ReactiveListManager instance
     *
     * @param config - Configuration object containing itemLength and itemHeight
     */
    constructor(config: ListManagerConfig) {
        this._itemLength = config.itemLength
        this._itemHeight = config.itemHeight
        this._internalDebug = config.internalDebug ?? false
        this._measuredFlags = new Uint8Array(Math.max(0, this._itemLength))
        this.recomputeDerivedHeights()
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
        if (dirtyResults.length === 0) return
        // Batch calculate changes to trigger reactivity only once
        let heightDelta = 0
        let countDelta = 0

        for (const change of dirtyResults) {
            const { index, oldHeight, newHeight } = change

            // Remove old contribution if it existed
            if (oldHeight !== undefined) {
                heightDelta -= oldHeight
                countDelta -= 1
            }

            // Add new contribution
            if (newHeight !== undefined) {
                heightDelta += newHeight
                countDelta += 1
                this._heightCache[index] = newHeight
            } else {
                // Unset measurement
                delete this._heightCache[index]
            }

            // Track measured flag (best-effort; full coalescing handled separately)
            if (this._measuredFlags && index >= 0 && index < this._measuredFlags.length) {
                this._measuredFlags[index] = 1
            }
        }

        // IDK... no one can explain it to me,.. but its here like this... it cannot be:
        //  if (heightDelta === 0 && countDelta === 0) return
        if (countDelta === 0) return
        // Apply all changes at once - triggers reactivity only once
        this._totalMeasuredHeight += heightDelta
        this._measuredCount += countDelta
        this.recomputeDerivedHeights()
    }

    /**
     * Update when items array length changes
     *
     * @param newLength - New total number of items
     */
    updateItemLength(newLength: number): void {
        this._itemLength = newLength
        this._measuredFlags = new Uint8Array(Math.max(0, newLength))
        this.recomputeDerivedHeights()
    }

    /**
     * Update estimated height for unmeasured items
     *
     * @param newEstimatedHeight - New estimated height
     */
    updateEstimatedHeight(newEstimatedHeight: number): void {
        // Keep a single source of truth for the estimated height
        this._itemHeight = newEstimatedHeight
        this.recomputeDerivedHeights()
    }

    /**
     * Set a single measured height and update totals
     */
    setMeasuredHeight(index: number, height: number): void {
        if (index < 0 || index >= this._itemLength) return
        const prev = this._heightCache[index]
        if (Number.isFinite(prev) && (prev as number) > 0) {
            this._totalMeasuredHeight -= prev as number
        } else {
            this._measuredCount += 1
        }
        if (Number.isFinite(height) && height > 0) {
            this._heightCache[index] = height
            this._totalMeasuredHeight += height
            this.recomputeDerivedHeights()
        }
    }

    /**
     * Reset all state to initial values
     *
     * Useful for testing or when completely reinitializing the list
     */
    reset(): void {
        this._totalMeasuredHeight = 0
        this._measuredCount = 0
        this._measuredFlags = this._itemLength > 0 ? new Uint8Array(this._itemLength) : null
        // Note: Don't reset _itemLength, _itemHeight as they represent configuration, not measured state
        this.recomputeDerivedHeights()
    }

    /**
     * Get comprehensive debug information
     *
     * @returns Debug information object
     */
    getDebugInfo(): ListManagerDebugInfo {
        return {
            totalMeasuredHeight: this._totalMeasuredHeight,
            measuredCount: this._measuredCount,
            itemLength: this._itemLength,
            coveragePercent:
                this._itemLength > 0 ? (this._measuredCount / this._itemLength) * 100 : 0,
            itemHeight: this._itemHeight,
            averageHeight: this.averageHeight,
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
