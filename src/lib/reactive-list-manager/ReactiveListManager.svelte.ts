import { RecomputeScheduler } from './RecomputeScheduler.js'
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
 * const manager = new ReactiveListManager({ itemLength: 10000, itemHeight: 40 })
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
    // Grid detection (CSS-first)
    private _itemsWrapperElement: HTMLElement | null = $state(null)
    private _gridDetected = $state(false)
    private _gridColumns = $state(1)
    private _gridObserver: ResizeObserver | null = null
    private _mutationObserver: MutationObserver | null = null
    // Internal cache of measured heights by index
    private _heightCache: Record<number, number> = {}
    // Recompute scheduling
    private _scheduler = new RecomputeScheduler(() => this.recomputeDerivedHeights())
    // Block sum caching for O(blockSize) offset calculations instead of O(n)
    private _blockSums: number[] = []
    private _blockSumsValid = false
    private _blockSize = 1000

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

    private scheduleRecomputeDerivedHeights(): void {
        // In jsdom/unit tests, recompute synchronously for determinism
        const isJsdom =
            typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
                ? /jsdom/i.test(navigator.userAgent)
                : false
        if (typeof window === 'undefined' || isJsdom) {
            this.recomputeDerivedHeights()
            return
        }
        if (this._dynamicUpdateDepth > 0) {
            this._scheduler.block()
            return
        }
        this._scheduler.schedule()
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
        this.scheduleRecomputeDerivedHeights()
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

    /**
     * Items wrapper element reference (reactive, nullable)
     *
     * Used for CSS-based grid detection. When set, the manager will auto-detect
     * whether the items container is a grid and how many columns it defines.
     */
    get itemsWrapperElement(): HTMLElement | null {
        return this._itemsWrapperElement
    }
    set itemsWrapperElement(el: HTMLElement | null) {
        // Detach previous observer if element changed
        if (this._itemsWrapperElement !== el) {
            if (this._gridObserver) {
                try {
                    this._gridObserver.disconnect()
                } catch {
                    // no-op
                }
                this._gridObserver = null
            }
            if (this._mutationObserver) {
                try {
                    this._mutationObserver.disconnect()
                } catch {
                    // no-op
                }
                this._mutationObserver = null
            }
        }
        this._itemsWrapperElement = el
        if (!el) {
            this._gridDetected = false
            this._gridColumns = 1
            return
        }
        // Attach new observer and detect immediately
        this.#attachGridObserver()
        this.#attachMutationObserver()
        this.#detectGridColumns()
    }

    /** Whether a CSS grid was detected on the items wrapper */
    get gridDetected(): boolean {
        return this._gridDetected
    }
    /** Number of columns when a grid is detected; 1 when not a grid */
    get gridColumns(): number {
        return this._gridColumns
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
     * Begin a dynamic update. Handles nested calls: the first call ensures UA scroll anchoring
     * is disabled, subsequent calls just increment depth. Safe to call when not wired; styles
     * are only set when both container and viewport are ready.
     *
     * Note: overflow-anchor is kept permanently as 'none' to prevent browser scroll anchoring
     * from interfering with the virtual list's own scroll correction logic.
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
     * corresponding end call completes the update. overflow-anchor remains 'none' permanently.
     * Guards against underflow.
     */
    endDynamicUpdate(): void {
        if (this._dynamicUpdateDepth <= 0) {
            return
        }
        this._dynamicUpdateDepth -= 1
        if (this._dynamicUpdateDepth === 0) {
            if (this._isReady && this._viewportElement) {
                this._viewportElement.style.setProperty('overflow-anchor', 'none')
            }
            this._dynamicUpdateInProgress = false
            this._scheduler.unblock()
        }
    }

    /**
     * Run a dynamic update with UA scroll anchoring disabled.
     * Accepts a sync or async function and ensures `overflow-anchor` stays 'none'
     * throughout. If the manager isn't ready yet, it simply executes `fn`.
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
     * Test helper: force a recompute immediately (bypasses scheduler).
     */
    flushRecompute = (): void => {
        this.recomputeDerivedHeights()
    }

    /**
     * Read-only view of measured heights cache
     */
    getHeightCache(): Readonly<Record<number, number>> {
        return this._heightCache
    }

    /**
     * Invalidate block sums from a given index onwards.
     * Call this when item heights change to ensure block sums are recalculated.
     *
     * @param index - The index from which to invalidate block sums
     */
    invalidateBlockSumsFrom(index: number): void {
        const blockIndex = Math.floor(index / this._blockSize)
        // Truncate to remove invalidated blocks
        if (blockIndex < this._blockSums.length) {
            this._blockSums.length = blockIndex
        }
        this._blockSumsValid = false
    }

    /**
     * Get the block sums array, rebuilding if necessary.
     * Block sums enable O(blockSize) offset calculations instead of O(n).
     *
     * Each entry contains the cumulative height sum up to and including that block.
     * For example, with blockSize=1000:
     * - Entry 0: sum of heights for items 0-999
     * - Entry 1: sum of heights for items 0-1999
     *
     * @returns Array of cumulative block sums
     */
    getBlockSums(): number[] {
        if (!this._blockSumsValid || this._blockSums.length === 0) {
            this._blockSums = this.buildBlockSums()
            this._blockSumsValid = true
        }
        return this._blockSums
    }

    /**
     * Build block prefix sums for efficient offset calculations.
     * Uses the same algorithm as the utility function but leverages internal state.
     */
    private buildBlockSums(): number[] {
        const blocks = Math.ceil(this._itemLength / this._blockSize)
        const sums: number[] = new Array(Math.max(0, blocks - 1))
        let running = 0

        for (let b = 0; b < blocks - 1; b++) {
            const start = b * this._blockSize
            const end = start + this._blockSize
            for (let i = start; i < end; i++) {
                const height = this._heightCache[i]
                running += Number.isFinite(height) && height > 0 ? height : this._averageHeight
            }
            sums[b] = running
        }
        return sums
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
        let minChangedIndex = Infinity

        for (const change of dirtyResults) {
            const { index, oldHeight, newHeight } = change

            // Track minimum changed index for block sum invalidation
            if (index < minChangedIndex) {
                minChangedIndex = index
            }

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

        // Invalidate block sums from the minimum changed index
        if (minChangedIndex < Infinity) {
            this.invalidateBlockSumsFrom(minChangedIndex)
        }

        // IDK... no one can explain it to me,.. but its here like this... it cannot be:
        //  if (heightDelta === 0 && countDelta === 0) return
        const isJsdom =
            typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
                ? /jsdom/i.test(navigator.userAgent)
                : false
        const isNonBrowser = typeof window === 'undefined' || isJsdom
        if (isNonBrowser) {
            if (heightDelta === 0 && countDelta === 0) return
        } else {
            if (countDelta === 0) return
        }
        // Apply all changes at once - triggers reactivity only once
        this._totalMeasuredHeight += heightDelta
        this._measuredCount += countDelta
        this.scheduleRecomputeDerivedHeights()
    }

    /**
     * Update when items array length changes
     *
     * @param newLength - New total number of items
     */
    updateItemLength(newLength: number): void {
        this._itemLength = newLength
        this._measuredFlags = new Uint8Array(Math.max(0, newLength))
        // Reset block sums since length changed
        this._blockSums = []
        this._blockSumsValid = false
        // Immediate recompute so new items become visible without delay
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
        this.scheduleRecomputeDerivedHeights()
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
            // Invalidate block sums from this index
            this.invalidateBlockSumsFrom(index)
            this.scheduleRecomputeDerivedHeights()
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
        // Reset block sums
        this._blockSums = []
        this._blockSumsValid = false
        // Note: Don't reset _itemLength, _itemHeight as they represent configuration, not measured state
        this.scheduleRecomputeDerivedHeights()
    }

    /**
     * Get comprehensive debug information
     *
     * @returns Debug information object
     */
    getDebugInfo(): ListManagerDebugInfo {
        const info: ListManagerDebugInfo = {
            totalMeasuredHeight: this._totalMeasuredHeight,
            measuredCount: this._measuredCount,
            itemLength: this._itemLength,
            coveragePercent:
                this._itemLength > 0 ? (this._measuredCount / this._itemLength) * 100 : 0,
            itemHeight: this._itemHeight,
            averageHeight: this.averageHeight,
            totalHeight: this.totalHeight,
            gridDetected: this._gridDetected,
            gridColumns: this._gridColumns
        }
        return info
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

    /** Public: Re-run CSS grid detection immediately */
    recomputeGridDetection(): void {
        this.#detectGridColumns()
    }

    // --- Grid detection helpers ---
    #attachGridObserver(): void {
        const el = this._itemsWrapperElement
        if (typeof window === 'undefined' || !el) return
        // Observe size changes to recompute column count responsively
        try {
            this._gridObserver = new ResizeObserver(() => {
                this.#detectGridColumns()
            })
            this._gridObserver.observe(el)
        } catch {
            // Ignore observer failures in non-browser environments
            this._gridObserver = null
        }
    }

    #attachMutationObserver(): void {
        const el = this._itemsWrapperElement
        if (typeof window === 'undefined' || !el) return
        try {
            this._mutationObserver = new MutationObserver((records) => {
                for (const rec of records) {
                    if (
                        rec.type === 'attributes' &&
                        (rec.attributeName === 'class' || rec.attributeName === 'style')
                    ) {
                        this.#detectGridColumns()
                        break
                    }
                }
            })
            this._mutationObserver.observe(el, {
                attributes: true,
                attributeFilter: ['class', 'style']
            })
        } catch {
            this._mutationObserver = null
        }
    }

    #detectGridColumns(): void {
        const el = this._itemsWrapperElement
        if (!el) {
            this._gridDetected = false
            this._gridColumns = 1
            return
        }

        // getComputedStyle based detection
        let detected = false
        let columns = 1
        try {
            const style = getComputedStyle(el)
            if (style.display === 'grid') {
                const template = style.gridTemplateColumns
                const repeatMatch = /repeat\(\s*(\d+)\s*,/i.exec(template)
                if (repeatMatch && repeatMatch[1]) {
                    columns = Math.max(1, parseInt(repeatMatch[1], 10))
                    detected = true
                } else if (template && template !== 'none') {
                    const count = this.#countTracksFromTemplate(template)
                    if (Number.isFinite(count) && count > 0) {
                        columns = count
                        detected = true
                    }
                }
            }
        } catch {
            // Ignore and fall back to geometry detection
        }

        // Fallback: infer from first row geometry if style approach failed
        if (!detected) {
            const children = el.children
            if (children && children.length > 0) {
                const firstTop = (children[0] as HTMLElement).getBoundingClientRect().top
                let countSameRow = 0
                for (let i = 0; i < children.length; i += 1) {
                    const top = (children[i] as HTMLElement).getBoundingClientRect().top
                    if (Math.abs(top - firstTop) <= 1) {
                        countSameRow += 1
                    } else {
                        break
                    }
                }
                if (countSameRow > 0) {
                    columns = countSameRow
                    detected = countSameRow > 1
                }
            }
        }
        // Assign reactive state
        this._gridDetected = detected
        this._gridColumns = Math.max(1, columns)

        if (this._internalDebug) {
            console.info('[ReactiveListManager] grid detection:', {
                detected: this._gridDetected,
                columns: this._gridColumns
            })
        }
    }

    #countTracksFromTemplate(template: string): number {
        // Count top-level tokens in grid-template-columns
        let depth = 0
        let tokens = 0
        let inToken = false
        for (let i = 0; i < template.length; i += 1) {
            const ch = template[i]
            if (ch === '(') depth += 1
            else if (ch === ')') depth = Math.max(0, depth - 1)
            if (depth === 0 && /\s/.test(ch)) {
                if (inToken) {
                    tokens += 1
                    inToken = false
                }
            } else if (ch !== ' ') {
                inToken = true
            }
        }
        if (inToken) tokens += 1
        return tokens
    }
}
