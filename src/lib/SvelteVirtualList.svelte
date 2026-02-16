<!--
    @component SvelteVirtualList

    A high-performance, memory-efficient virtualized list component for Svelte 5.
    Renders only visible items plus a buffer, supporting dynamic item heights,
    bi-directional (top-to-bottom and bottom-to-top) scrolling, and programmatic control.

    =============================
    ==  Key Features           ==
    =============================
    - Dynamic item height support (no fixed height required)
    - Top-to-bottom and bottom-to-top (chat-style) scrolling
    - Programmatic scrolling with flexible alignment (top, bottom, auto)
    - Smooth scrolling and buffer size configuration
    - SSR compatible and hydration-friendly
    - TypeScript and Svelte 5 runes/snippets support
    - Customizable styling via class props
    - Debug mode for development and testing
    - Optimized for large lists (10k+ items)
    - Comprehensive test coverage (unit and E2E)

    =============================
    ==  Usage Example          ==
    =============================
    ```svelte
    <SvelteVirtualList
        items={data}
        mode="bottomToTop"
        bind:this={listRef}
    >
        {#snippet renderItem(item)}
            <div>{item.text}</div>
        {/snippet}
    </SvelteVirtualList>
    ```

    =============================
    ==  Architecture Notes      ==
    =============================
    - Uses a four-layer DOM structure for optimal performance
    - Only visible items + buffer are mounted in the DOM
    - Height caching and estimation for dynamic content
    - Handles resize events and dynamic content changes
    - Optimized for very large lists through virtualization
    - Modular architecture with extracted utility functions
    - Bi-directional support: mode="topToBottom" or "bottomToTop"
    - Designed for extensibility and easy debugging

    =============================
    ==  For Contributors        ==
    =============================
    - Complex logic is extracted to dedicated utility files in src/lib/utils/
    - Scroll positioning logic is in scrollCalculation.ts (well-tested)
    - Add new features behind feature flags or as optional props
    - Write tests for all new features (see /test and /tests/scroll)
    - Use TypeScript and Svelte 5 runes for all new code
    - Document all exported functions and props with JSDoc
    - See README.md for API and usage details
    - For questions, open an issue or discussion on GitHub

    MIT License © Humanspeak, Inc.
-->

<script lang="ts" generics="TItem = unknown">
    /**
     * SvelteVirtualList Implementation Journey
     *
     * Evolution & Architecture:
     * 1. Initial Implementation ✓
     *    - Basic virtual scrolling with fixed height items
     *    - Single direction scrolling (top-to-bottom)
     *    - Simple viewport calculations
     *
     * 2. Dynamic Height Enhancement ✓
     *    - Added dynamic height calculation system
     *    - Implemented debounced measurements
     *    - Created height averaging mechanism for performance
     *
     * 3. Bidirectional Scrolling ✓
     *    - Added bottomToTop mode
     *    - Solved complex initialization issues with flexbox
     *    - Implemented careful scroll position management
     *
     * 4. Performance Optimizations ✓
     *    - Added element recycling through keyed each blocks
     *    - Implemented RAF for smooth animations
     *    - Optimized DOM updates with transform translations
     *
     * 5. Stability Improvements ✓
     *    - Added ResizeObserver for responsive updates
     *    - Implemented proper cleanup on component destruction
     *    - Added debug mode for development assistance
     *
     * 6. Large Dataset Optimizations ✓
     *    - Implemented chunked processing for 10k+ items
     *    - Added progressive initialization system
     *    - Deferred height calculations for better initial load
     *    - Optimized memory usage for large lists
     *    - Added progress tracking for initialization
     *
     * 7. Size Management Improvements ✓
     *    - Implemented height caching system for measured items
     *    - Added smart height estimation for unmeasured items
     *    - Optimized resize handling with debouncing
     *    - Added height recalculation on content changes
     *    - Implemented progressive height adjustments
     *
     * 8. Code Quality & Maintainability ✓
     *    - Extracted debug utilities for better testing
     *    - Improved type safety throughout
     *    - Added comprehensive documentation
     *    - Optimized debug output to reduce noise
     *
     * 9. Architecture Refactoring ✓
     *    - Extracted scroll calculation logic to scrollCalculation.ts utility
     *    - Extracted ResizeObserver utilities to resizeObserver.ts
     *    - Added comprehensive test coverage for extracted utilities
     *    - Improved separation of concerns and maintainability
     *    - Simplified initialization (removed unnecessary chunked processing)
     *
     * 10. Future Improvements (Planned)
     *    - Add horizontal scrolling support
     *    - Implement variable-sized item caching
     *    - Add keyboard navigation support
     *    - Support for dynamic item updates
     *    - Add accessibility enhancements
     *
     * Technical Challenges Solved:
     * - Bottom-to-top scrolling in flexbox layouts
     * - Dynamic height calculations without layout thrashing
     * - Smooth scrolling on various devices
     * - Memory management for large lists
     * - Browser compatibility issues
     * - Performance optimization for 10k+ items
     * - Progressive initialization for large datasets
     * - Debug output optimization
     * - Accurate size calculations with caching
     * - Responsive size adjustments
     * - Modular architecture with testable utility functions
     *
     * Current Architecture:
     * - Four-layer DOM structure for optimal performance
     * - State management using Svelte 5's $state
     * - Reactive height and scroll calculations
     * - Configurable buffer zones for smooth scrolling
     * - Modular utility system with dedicated helper files:
     *   * scrollCalculation.ts: Complex scroll positioning logic
     *   * resizeObserver.ts: ResizeObserver management utilities
     *   * heightCalculation.ts: Debounced height measurement
     *   * virtualList.ts: Core virtual list calculations
     *   * virtualListDebug.ts: Debug information utilities
     * - Height caching and estimation system
     * - Progressive size adjustment system
     */

    import {
        DEFAULT_SCROLL_OPTIONS,
        type SvelteVirtualListPreviousVisibleRange,
        type SvelteVirtualListProps,
        type SvelteVirtualListScrollOptions
    } from '$lib/types.js'
    import { calculateAverageHeightDebounced } from '$lib/utils/heightCalculation.js'
    import { createRafScheduler } from '$lib/utils/raf.js'
    import { isSignificantHeightChange } from '$lib/utils/heightChangeDetection.js'
    import {
        calculateTransformY,
        calculateVisibleRange,
        clampValue,
        updateHeightAndScroll as utilsUpdateHeightAndScroll,
        getScrollOffsetForIndex,
        buildBlockSums
    } from '$lib/utils/virtualList.js'
    import { createDebugInfo, shouldShowDebugInfo } from '$lib/utils/virtualListDebug.js'
    import { calculateScrollTarget } from '$lib/utils/scrollCalculation.js'
    import { createAdvancedThrottledCallback } from '$lib/utils/throttle.js'
    import { ReactiveListManager } from '$lib/index.js'
    import { BROWSER } from 'esm-env'
    import { onMount, tick, untrack } from 'svelte'

    const rafSchedule = createRafScheduler()
    // Per-instance correction guard to avoid same-frame tug-of-war per viewport
    const GLOBAL_CORRECTION_COOLDOWN = 16
    const lastCorrectionTimestampByViewport = new WeakMap<HTMLElement, number>()
    // Package-specific debug flag - safe for library distribution
    // Enable with: PUBLIC_SVELTE_VIRTUAL_LIST_DEBUG=true (preferred) or SVELTE_VIRTUAL_LIST_DEBUG=true
    // Avoid SvelteKit-only $env imports so library works in non-Kit/Vitest contexts
    const INTERNAL_DEBUG = Boolean(
        typeof process !== 'undefined' &&
        (process?.env?.PUBLIC_SVELTE_VIRTUAL_LIST_DEBUG === 'true' ||
            process?.env?.SVELTE_VIRTUAL_LIST_DEBUG === 'true')
    )
    // Feature flags - default off; enable via env for incremental rollout
    const anchorModeEnabled = Boolean(
        typeof process !== 'undefined' &&
        (process?.env?.PUBLIC_SVL_ANCHOR_MODE === 'true' ||
            process?.env?.SVL_ANCHOR_MODE === 'true')
    )
    const idleCorrectionsOnly = Boolean(
        typeof process !== 'undefined' &&
        (process?.env?.PUBLIC_SVL_IDLE_ONLY === 'true' || process?.env?.SVL_IDLE_ONLY === 'true')
    )
    const batchUpdatesEnabled = Boolean(
        typeof process !== 'undefined' &&
        (process?.env?.PUBLIC_SVL_BATCH === 'true' || process?.env?.SVL_BATCH === 'true')
    )
    /**
     * Core configuration props with default values
     * @type {SvelteVirtualListProps<TItem>}
     */
    const {
        items = [], // Array of items to be rendered in the virtual list
        defaultEstimatedItemHeight = 40, // Initial height estimate for items before measurement
        debug = false, // Enable debug logging
        renderItem, // Function to render each item
        containerClass, // Custom class for the container element
        viewportClass, // Custom class for the viewport element
        contentClass, // Custom class for the content wrapper
        itemsClass, // Custom class for the items wrapper
        debugFunction, // Custom debug logging function
        mode = 'topToBottom', // Scroll direction mode
        bufferSize = 20, // Number of items to render outside visible area
        testId, // Base test ID for component elements (undefined = no data-testid attributes)
        onLoadMore, // Callback when more data needed (supports sync and async)
        loadMoreThreshold = 20, // Items from end to trigger load
        hasMore = true // Set false when all data loaded
    }: SvelteVirtualListProps<TItem> = $props()

    /**
     * DOM References and Core State
     */
    const itemElements = $state<HTMLElement[]>([]) // Array of rendered item element references

    /**
     * Scroll and Height Management
     */
    let height = $state(0) // Container height

    /**
     * State Flags and Control
     */

    const isCalculatingHeight = $state(false) // Prevents concurrent height calculations
    let isLoadingMore = $state(false) // Prevents concurrent onLoadMore calls
    let isScrolling = $state(false) // Tracks active scrolling state
    let scrollIdleTimer: number | null = null
    // Anchor state (read-only capture; used when anchorModeEnabled)
    let lastAnchorIndex = $state(0)
    let lastAnchorOffset = $state(0) // offset within anchored item (px)
    let pendingAnchorReconcile = $state(false)
    let batchDepth = $state(0)

    const captureAnchor = () => {
        if (!heightManager.viewportElement) return
        const vr = visibleItems()
        const anchorIndex = Math.max(0, vr.start)
        const cache = heightManager.getHeightCache()
        const est = heightManager.averageHeight
        const maxScrollTop = Math.max(0, totalHeight() - (height || 0))
        // Offset from start to anchored item
        const blockSums = buildBlockSums(cache, est, items.length)
        const offsetToIndex = getScrollOffsetForIndex(cache, est, anchorIndex, blockSums)
        const currentTop = heightManager.viewport.scrollTop
        let offsetWithin = 0
        if (mode === 'bottomToTop') {
            // Convert distance-from-end to distance-from-start
            const distanceFromStart = maxScrollTop - currentTop
            offsetWithin = distanceFromStart - offsetToIndex
        } else {
            offsetWithin = currentTop - offsetToIndex
        }
        lastAnchorIndex = anchorIndex
        lastAnchorOffset = Math.max(0, Math.round(offsetWithin))
        // Expose for tests
        ;(heightManager.viewport as unknown as Record<string, unknown>).__svlAnchor = {
            index: lastAnchorIndex,
            offset: lastAnchorOffset
        }
        pendingAnchorReconcile = true
    }

    const reconcileToAnchorIfEnabled = () => {
        if (!anchorModeEnabled || !heightManager.viewportElement) return
        if (!pendingAnchorReconcile) return
        const cache = heightManager.getHeightCache()
        const est = heightManager.averageHeight
        const blockSums = buildBlockSums(cache, est, items.length)
        const offsetToIndex = getScrollOffsetForIndex(
            cache,
            est,
            Math.max(0, lastAnchorIndex),
            blockSums
        )
        const maxScrollTop = clampValue(totalHeight() - (height || 0), 0, Infinity)
        let targetTop: number
        if (mode === 'bottomToTop') {
            const distanceFromStart = clampValue(offsetToIndex + lastAnchorOffset, 0, Infinity)
            targetTop = clampValue(Math.round(maxScrollTop - distanceFromStart), 0, maxScrollTop)
        } else {
            targetTop = clampValue(Math.round(offsetToIndex + lastAnchorOffset), 0, maxScrollTop)
        }
        if (Math.abs(heightManager.viewport.scrollTop - targetTop) >= 2) {
            syncScrollTop(targetTop)
        }
        pendingAnchorReconcile = false
    }

    /**
     * Runs a batch of updates with scroll corrections coalesced until the batch completes.
     *
     * Use this method when making multiple changes to the items array to prevent
     * intermediate scroll corrections. The scroll position reconciliation is deferred
     * until the batch exits, ensuring smooth visual updates.
     *
     * @param {() => void} fn - The function containing batch updates to execute.
     * @returns {void}
     *
     * @example
     * ```typescript
     * // Add multiple items without intermediate scroll corrections
     * list.runInBatch(() => {
     *     items.push(newItem1);
     *     items.push(newItem2);
     *     items.push(newItem3);
     * });
     * ```
     */
    export const runInBatch = (fn: () => void): void => {
        batchDepth += 1
        try {
            fn()
        } finally {
            batchDepth = Math.max(0, batchDepth - 1)
            if (batchUpdatesEnabled && batchDepth === 0) {
                reconcileToAnchorIfEnabled()
            }
        }
    }
    let lastMeasuredIndex = $state(-1) // Index of last measured item
    let lastScrollTopSnapshot = $state(0) // Previous scroll position snapshot

    /**
     * Timers and Observers
     */
    let heightUpdateTimeout: ReturnType<typeof setTimeout> | null = null // Debounce timer for height updates
    let resizeObserver: ResizeObserver | null = null // Watches for container size changes
    let itemResizeObserver: ResizeObserver | null = null // Watches for individual item size changes

    /**
     * Performance Optimization State
     */
    const dirtyItems = $state(new Set<number>()) // Set of item indices that need height recalculation
    let dirtyItemsCount = $state(0) // Reactive count of dirty items
    // Fallback measurement used only when height has not been established yet
    let measuredFallbackHeight = $state(0)
    // Scroll delta threshold optimization - track last scroll position used for range calculation
    let lastProcessedScrollTop = $state(0)

    let prevVisibleRange = $state<SvelteVirtualListPreviousVisibleRange | null>(null)
    let prevHeight = $state<number>(0)
    let prevTotalHeightForScrollCorrection = $state<number>(0)
    let lastBottomDistance = $state<number | null>(null)

    /**
     * Reactive Height Manager - O(1) height calculation system
     * Replaces O(n) totalHeight loop with incremental updates
     */
    const heightManager = new ReactiveListManager({
        itemLength: items.length,
        itemHeight: defaultEstimatedItemHeight,
        internalDebug: INTERNAL_DEBUG
    })
    const instanceId = Math.random().toString(36).slice(2, 7)

    // Centralized debug logger gated by flags
    const log = (tag: string, payload?: unknown) => {
        if (!debug && !INTERNAL_DEBUG) return
        try {
            const ts = new Date().toISOString().split('T')[1]?.replace('Z', '')
            console.info(`[SVL][${instanceId}] ${ts} ${tag}`, payload ?? '')
        } catch {
            // no-op
        }
    }

    /**
     * Synchronizes the scroll position between the viewport element and internal state.
     *
     * This helper consolidates the repeated pattern of updating both
     * heightManager.viewport.scrollTop and heightManager.scrollTop together,
     * ensuring they stay in sync.
     *
     * @param {number} value - The scroll position to set
     * @param {boolean} round - Whether to round the value to the nearest integer (default: false)
     */
    const syncScrollTop = (value: number, round = false) => {
        if (!heightManager.viewportElement) return
        const scrollValue = round ? Math.round(value) : value
        heightManager.viewport.scrollTop = scrollValue
        heightManager.scrollTop = scrollValue
    }

    // Dynamic update coordination to avoid UA scroll anchoring interference
    let suppressBottomAnchoringUntilMs = $state(0)

    const displayItems = $derived(() => {
        const visibleRange = visibleItems()
        const slice =
            mode === 'bottomToTop'
                ? items.slice(visibleRange.start, visibleRange.end).reverse()
                : items.slice(visibleRange.start, visibleRange.end)

        return slice.map((item, sliceIndex) => ({
            item,
            originalIndex:
                mode === 'bottomToTop'
                    ? visibleRange.end - 1 - sliceIndex
                    : visibleRange.start + sliceIndex,
            sliceIndex
        }))
    })

    /**
     * Handles scroll position corrections when item heights change, ensuring proper positioning
     * relative to the user's scroll context. This function calculates the cumulative impact of
     * height changes above the current viewport and adjusts the scroll position accordingly.
     *
     * The correction logic considers:
     * - Height changes occurring above the visible area (which would shift content)
     * - The current scroll position and visible range
     * - Whether height changes warrant a scroll adjustment
     *
     * This prevents jarring jumps when items resize, maintaining the user's visual context
     * and where they are positioned relative to the current scroll position.
     */
    const handleHeightChangesScrollCorrection = (
        heightChanges: Array<{ index: number; oldHeight: number; newHeight: number; delta: number }>
    ) => {
        if (!heightManager.viewportElement || !heightManager.initialized || userHasScrolledAway) {
            return
        }
        // Coalesce adjustments during active scroll; apply on idle
        if (isScrolling) {
            // Accumulate net change above viewport and defer application
            let pending = 0
            const currentVisibleRange = visibleItems()
            for (const change of heightChanges) {
                if (change.index < currentVisibleRange.start) pending += change.delta
            }
            if (pending !== 0) {
                // Store on the viewport element to avoid extra module globals
                const key = '__svl_pendingHeightAdj__' as unknown as keyof HTMLElement
                const prev = (heightManager.viewport as unknown as Record<string, number>)[
                    key as string
                ] as number | undefined
                ;(heightManager.viewport as unknown as Record<string, number>)[key as string] =
                    (prev ?? 0) + pending
            }
            return
        }

        /**
         * CRITICAL: BottomToTop Mode Height Change Fix
         * ============================================
         *
         * Problem: In bottomToTop mode, when items change height while user is at bottom,
         * the list would jump to middle positions (e.g. items 1032-1096) instead of
         * staying anchored at bottom showing Item 0.
         *
         * Root Cause: Height calculations using simple averages (items.length * calculatedItemHeight)
         * were drastically skewed by single item changes. Example:
         * - 1 item changes from 20px to 100px (+80px actual change)
         * - Average jumps from 20px to 22.35px (+2.35px per item)
         * - Across 10,000 items: 2.35px × 10,000 = 23,500px total height error!
         * - This caused massive scroll position overshoots and incorrect positioning
         *
         * Solution: Two-step native scrollIntoView approach
         * 1. Fixed skewed height calculations using actual heightCache measurements (see totalHeight)
         * 2. When wasAtBottomBeforeHeightChange=true (captured before any height processing):
         *    a) First scroll to approximate bottom position to render Item 0 in virtual viewport
         *    b) Use native scrollIntoView() with block:'end' for precise bottom alignment
         *
         * Why This Works:
         * - Uses browser's native scroll logic instead of error-prone manual calculations
         * - Two-step ensures Item 0 exists in DOM before attempting to scroll to it
         * - Native scrollIntoView handles all edge cases (subpixel precision, browser differences)
         * - Eliminates complex math that was accumulating rounding errors
         * - Smooth behavior provides better UX than instant jumps
         *
         * Dependencies:
         * - wasAtBottomBeforeHeightChange: Set to true when first item marked dirty, prevents cascading corrections
         * - totalHeight(): Uses actual heightCache measurements instead of skewed averages
         * - Aggressive scroll correction: Blocked when wasAtBottomBeforeHeightChange=true
         *
         * ⚠️  DO NOT MODIFY WITHOUT EXTENSIVE TESTING ⚠️
         * This fix resolves a complex interaction between:
         * - Virtual list rendering (only ~20 items visible, rest virtualized)
         * - Height change calculations (prone to average skewing with large datasets)
         * - Multiple scroll correction mechanisms (specific vs aggressive)
         * - Bottom anchor positioning in reversed list mode (bottomToTop)
         *
         * Test coverage: tests/bottomToTop/firstItemHeightChange.spec.ts (45 comprehensive tests)
         * Related fixes: See aggressive scroll correction logic ~line 410 with !wasAtBottomBeforeHeightChange
         */
        if (
            mode === 'bottomToTop' &&
            wasAtBottomBeforeHeightChange &&
            !programmaticScrollInProgress &&
            performance.now() >= suppressBottomAnchoringUntilMs
        ) {
            // Prevent same-frame corrections; defer if this viewport just corrected
            const now = performance.now()
            const viewportEl = heightManager.viewport
            const lastCorrectionMs = lastCorrectionTimestampByViewport.get(viewportEl) ?? 0
            if (now - lastCorrectionMs < GLOBAL_CORRECTION_COOLDOWN) {
                suppressBottomAnchoringUntilMs = now + 50
                return
            }
            lastCorrectionTimestampByViewport.set(viewportEl, now)

            // Step 1: Scroll to approximate position to ensure Item 0 gets rendered in virtual viewport
            const approximateScrollTop = Math.max(0, totalHeight() - height)
            log('[SVL] b2t-correction-approx', { approximateScrollTop })
            syncScrollTop(approximateScrollTop)

            // Step 2: Use native scrollIntoView for precise bottom-edge positioning after DOM updates
            tick().then(() => {
                const item0Element = heightManager.viewport.querySelector(
                    '[data-original-index="0"]'
                )
                if (item0Element) {
                    // Verify alignment via rects; if off, perform one-time scrollIntoView
                    const contRect = heightManager.viewport.getBoundingClientRect()
                    const itemRect = (item0Element as HTMLElement).getBoundingClientRect()
                    const tol = 4
                    const aligned =
                        Math.abs(contRect.y + contRect.height - (itemRect.y + itemRect.height)) <=
                        tol
                    if (!aligned) {
                        // Use manual scrollTop instead of scrollIntoView to prevent parent scroll
                        // (scrollIntoView scrolls all ancestor containers, not just the viewport)
                        // Note: `container: 'nearest'` option could replace this once browser support improves
                        const currentScrollTop = heightManager.viewport.scrollTop
                        const offset = itemRect.bottom - contRect.bottom
                        heightManager.viewport.scrollTop = currentScrollTop + offset
                        log('[SVL] b2t-correction-manual', { offset })
                    }
                    // Sync our internal scroll state with actual DOM position
                    heightManager.scrollTop = heightManager.viewport.scrollTop
                    // After peer correction, delay further corrections briefly
                    suppressBottomAnchoringUntilMs = performance.now() + 200
                }
            })

            return // Skip remaining scroll correction logic - we've handled bottomToTop case
        }

        const currentScrollTop = heightManager.viewport.scrollTop
        const maxScrollTop = Math.max(0, totalHeight() - height)

        // Calculate total height change impact above current visible area
        let heightChangeAboveViewport = 0
        const currentVisibleRange = visibleItems()

        for (const change of heightChanges) {
            // Only consider items that are above the current visible range
            if (change.index < currentVisibleRange.start) {
                heightChangeAboveViewport += change.delta
            }
        }

        // If there are height changes above the viewport, adjust scroll to maintain position
        // Include any pending coalesced delta (when scrolling)
        {
            const key = '__svl_pendingHeightAdj__' as unknown as keyof HTMLElement
            const pending =
                (heightManager.viewport as unknown as Record<string, number>)[key as string] ?? 0
            if (pending) {
                heightChangeAboveViewport += pending
                ;(heightManager.viewport as unknown as Record<string, number>)[key as string] = 0
            }
        }
        if (Math.abs(heightChangeAboveViewport) > 2) {
            const newScrollTop = clampValue(
                currentScrollTop + heightChangeAboveViewport,
                0,
                maxScrollTop
            )
            syncScrollTop(newScrollTop)
        }
    }

    // Height update function - removed throttling to fix race condition on initial load
    // Create throttled height update function with trailing execution to ensure measurement always happens
    const triggerHeightUpdate = createAdvancedThrottledCallback(
        () => {
            if (BROWSER && dirtyItemsCount > 0) {
                // Capture bottom state before any height processing to prevent cascading corrections
                wasAtBottomBeforeHeightChange = atBottom
                heightManager.startDynamicUpdate()
                updateHeight()
            }
        },
        16,
        {
            leading: true, // Execute immediately for responsiveness
            trailing: true // CRUCIAL: Execute the last call after delay to ensure measurement always happens
        }
    )

    // Trigger height calculation when dirty items are added
    $effect(() => {
        triggerHeightUpdate()
    })

    // Keep height manager synchronized with items length
    $effect(() => {
        heightManager.updateItemLength(items.length)
    })

    // Infinite scroll: trigger onLoadMore when approaching end of list
    $effect(() => {
        if (!BROWSER || !onLoadMore || !hasMore || isLoadingMore) return
        // Skip loading during bottomToTop initialization (init path renders all items artificially)
        if (mode === 'bottomToTop' && !bottomToTopScrollComplete) return

        const range = visibleItems()
        const atLoadingEdge = range.end >= items.length - loadMoreThreshold
        const insufficientItems = items.length < loadMoreThreshold && heightManager.initialized

        if (atLoadingEdge || insufficientItems) {
            isLoadingMore = true
            Promise.resolve(onLoadMore()).finally(() => {
                isLoadingMore = false
            })
        }
    })

    const updateHeight = () => {
        // Capture previous total height for scroll correction (topToBottom anchoring)
        prevTotalHeightForScrollCorrection = heightManager.totalHeight
        heightUpdateTimeout = calculateAverageHeightDebounced(
            isCalculatingHeight,
            heightUpdateTimeout,
            visibleItems,
            itemElements,
            heightManager.getHeightCache(),
            lastMeasuredIndex,
            heightManager.averageHeight,
            (result) => {
                // Only update the estimated item height from statistically meaningful
                // samples. With _measuredCount === 0 (browser path), the formula
                // _totalHeight = _itemLength × _itemHeight means a single expanded
                // accordion item (e.g., 117px) would balloon _totalHeight from
                // 49,000 to 117,000px — a visible flash. Requiring ≥ 2 valid
                // measurements prevents single-item outliers from swinging the estimate.
                if (result.newValidCount !== 1) {
                    heightManager.itemHeight = result.newHeight
                }
                lastMeasuredIndex = result.newLastMeasuredIndex

                // Update manager totals/cache before any scroll correction logic relies on them
                if (result.heightChanges.length > 0) {
                    heightManager.processDirtyHeights(result.heightChanges)
                }

                // Handle height changes for scroll correction (manager totals already updated)
                if (result.heightChanges.length > 0 && mode === 'bottomToTop') {
                    // Run correction after dynamic update finishes to avoid blocking conditions
                    const changes = result.heightChanges
                    queueMicrotask(() => handleHeightChangesScrollCorrection(changes))
                }

                // TopToBottom: maintain bottom anchoring when total height changes
                if (mode === 'topToBottom' && heightManager.isReady && heightManager.initialized) {
                    const oldTotal = prevTotalHeightForScrollCorrection
                    const newTotal = heightManager.totalHeight
                    const deltaTotal = newTotal - oldTotal
                    // Ignore micro deltas to prevent oscillation
                    if (Math.abs(deltaTotal) > 1) {
                        const maxScrollTop = Math.max(0, newTotal - (height || 0))
                        const tolerance = Math.max(heightManager.averageHeight, 10)
                        const currentScrollTop = heightManager.viewport.scrollTop
                        const isAtBottom = Math.abs(currentScrollTop - maxScrollTop) <= tolerance
                        if (isAtBottom) {
                            // Adjust scrollTop by total height delta to hold bottom anchor
                            const adjusted = clampValue(
                                currentScrollTop + deltaTotal,
                                0,
                                maxScrollTop
                            )
                            syncScrollTop(adjusted, true)
                        }
                    }
                }

                // Non-critical updates wrapped in untrack to prevent reactive cascades
                untrack(() => {
                    // Clear processed dirty items (all dirty items were processed)
                    dirtyItems.clear()
                    dirtyItemsCount = 0

                    // Reset bottom state flag
                    wasAtBottomBeforeHeightChange = false
                })
                heightManager.endDynamicUpdate()
            },
            lastMeasuredIndex < 0 ? 0 : 100, // debounceTime (no debounce on first pass)
            dirtyItems, // Pass dirty items for processing
            0, // Don't pass ReactiveListManager state - let each system manage its own totals
            0, // Don't pass ReactiveListManager state - let each system manage its own totals
            mode // Pass mode for correct element indexing
        )
    }

    // Add new effect to handle height changes
    // Track if user has scrolled away from bottom to prevent snap-back
    let userHasScrolledAway = $state(false)
    let programmaticScrollInProgress = $state(false) // Prevent bottom-anchoring during programmatic scrolls
    let lastCalculatedHeight = $state(0)
    let lastItemsLength = $state(0)
    // Track last observed total height to compute precise deltas on item count changes
    let lastTotalHeightObserved = $state(0)
    // For bottomToTop mode: keep init path active until scroll positioning is complete
    // This ensures Item 0 stays in the DOM throughout initialization
    let bottomToTopScrollComplete = $state(false)

    /**
     * CRITICAL: O(1) Reactive Total Height Calculation
     * ===============================================
     *
     * Uses ReactiveListManager for O(1) height calculations instead of O(n) loops.
     * This fixes the root cause of massive scroll jumps in bottomToTop mode.
     *
     * Problem with Previous O(n) Approach:
     * - Looped through ALL items on every reactive update
     * - Used simple: items.length * calculatedItemHeight
     * - When 1 item changes from 20px to 100px in 10,000 items:
     *   - calculatedItemHeight jumps from 20 to 22.35 (+2.35px)
     *   - Total height jumps from 200,000px to 223,500px (+23,500px!)
     *   - This 23,500px error caused massive scroll position overshoots
     *
     * Solution with ReactiveListManager:
     * - O(1) reactive calculations using incremental updates
     * - Uses actual measured heights from heightCache where available
     * - Only estimates heights for items that haven't been measured yet
     * - Processes only dirty/changed heights instead of all items
     *
     * Example with O(1) Approach:
     * - 20 items measured: 19 × 20px + 1 × 100px = 460px measured
     * - 9,980 unmeasured: 9,980 × 23px (avg of measured) = 229,540px estimated
     * - Total: 460px + 229,540px = 230,000px (only +30,000px vs +23,500px error)
     * - Much smaller error that doesn't cause massive scroll jumps
     * - Updates incrementally using processDirtyHeights() instead of recalculating all
     *
     * This getter is reactive and updates whenever heightManager's internal state changes.
     * Used by: atBottom calculation, scroll corrections, maxScrollTop calculations
     */
    const totalHeight = $derived(() => heightManager.totalHeight)

    const atBottom = $derived(heightManager.scrollTop >= totalHeight() - height - 1)
    let wasAtBottomBeforeHeightChange = false
    let lastVisibleRange: SvelteVirtualListPreviousVisibleRange | null = null

    function updateDebugTailDistance() {
        if (!heightManager.viewportElement) return
        const last = heightManager.viewport.querySelector(
            `[data-original-index="${items.length - 1}"]`
        ) as HTMLElement | null
        if (!last) return
        const v = heightManager.viewport.getBoundingClientRect()
        const r = last.getBoundingClientRect()
        lastBottomDistance = Math.round(Math.abs(r.bottom - v.bottom))
        if (INTERNAL_DEBUG) {
            console.info('[SVL] bottomDistance(px):', lastBottomDistance)
        }
    }

    // no UI export; rely on console logs when debug=true

    // $inspect('scrollState: atTop', atTop)
    // $inspect('scrollState: atBottom', atBottom)

    $effect(() => {
        if (
            BROWSER &&
            heightManager.initialized &&
            mode === 'bottomToTop' &&
            heightManager.viewportElement
        ) {
            const targetScrollTop = Math.max(0, totalHeight() - height)
            const currentScrollTop = heightManager.viewport.scrollTop
            const scrollDifference = Math.abs(currentScrollTop - targetScrollTop)

            // Only correct scroll if:
            // 1. Item height changed significantly (not just user scrolling)
            // 2. User hasn't intentionally scrolled away from bottom
            // 3. We're significantly off target
            // 4. We're not at the bottom (where height changes should be handled more carefully)
            const heightChanged = Math.abs(heightManager.averageHeight - lastCalculatedHeight) > 1
            const maxScrollTop = Math.max(0, totalHeight() - height)

            // In bottomToTop mode, we're "at bottom" when scroll is at max position
            const isAtBottom =
                Math.abs(currentScrollTop - maxScrollTop) < heightManager.averageHeight
            const shouldCorrect =
                heightChanged &&
                !userHasScrolledAway &&
                !isAtBottom && // Don't apply aggressive correction when at bottom
                !isScrolling && // Skip aggressive corrections during active scroll
                !programmaticScrollInProgress && // Don't interfere with programmatic scrolls
                performance.now() >= suppressBottomAnchoringUntilMs &&
                !heightManager.isDynamicUpdateInProgress &&
                scrollDifference > heightManager.averageHeight * 3

            if (shouldCorrect) {
                // Round to avoid subpixel positioning issues in bottomToTop mode
                syncScrollTop(targetScrollTop, true)
            }

            // Track if user has scrolled significantly away from bottom
            if (scrollDifference > heightManager.averageHeight * 5) {
                userHasScrolledAway = true
            }

            lastCalculatedHeight = heightManager.averageHeight
        }
    })

    // Handle items being added/removed in bottomToTop mode
    $effect(() => {
        // Only track items.length to prevent re-runs on other reactive changes
        const currentItemsLength = items.length

        if (
            BROWSER &&
            heightManager.initialized &&
            mode === 'bottomToTop' &&
            heightManager.isReady &&
            lastItemsLength > 0
        ) {
            const itemsAdded = currentItemsLength - lastItemsLength

            if (itemsAdded !== 0) {
                // Capture all reactive values immediately to prevent re-triggering
                const currentScrollTop = heightManager.viewport.scrollTop
                const currentCalculatedItemHeight = heightManager.averageHeight
                const currentHeight = height
                const currentTotalHeight = totalHeight()
                const prevTotalHeight =
                    lastTotalHeightObserved ||
                    currentTotalHeight - itemsAdded * currentCalculatedItemHeight
                const prevMaxScrollTop = Math.max(0, prevTotalHeight - currentHeight)
                const nextMaxScrollTop = Math.max(0, currentTotalHeight - currentHeight)
                const deltaMax = nextMaxScrollTop - prevMaxScrollTop
                log('[SVL] items-length-change:before', {
                    instanceId,
                    itemsAdded,
                    lastItemsLength,
                    currentItemsLength,
                    currentScrollTop,
                    prevTotalHeight,
                    currentTotalHeight,
                    prevMaxScrollTop,
                    nextMaxScrollTop,
                    deltaMax,
                    averageItemHeight: currentCalculatedItemHeight
                })

                // Maintain visual position for ALL cases by advancing scrollTop by deltaMax.
                // If near the bottom, this naturally pins to the new max; otherwise it preserves the current content.
                programmaticScrollInProgress = true
                void heightManager.runDynamicUpdate(() => {
                    const newScrollTop = clampValue(
                        currentScrollTop + deltaMax,
                        0,
                        nextMaxScrollTop
                    )
                    syncScrollTop(newScrollTop)
                    log('[SVL] items-length-change:applied', {
                        instanceId,
                        previousScrollTop: currentScrollTop,
                        appliedScrollTop: newScrollTop,
                        prevMaxScrollTop,
                        nextMaxScrollTop,
                        deltaMax
                    })

                    // We are explicitly managing position; consider this a programmatic action.
                    // Do not flip userHasScrolledAway here; it should reflect user intent only.

                    // Reconcile on next frame in case measured heights adjust totals
                    requestAnimationFrame(() => {
                        const beforeReconcileScrollTop = heightManager.viewport.scrollTop
                        const reconciledNextMax = clampValue(totalHeight() - height, 0, Infinity)
                        const reconciledDeltaMaxChange = reconciledNextMax - nextMaxScrollTop
                        // Desired position is to maintain distance-from-end; equivalently keep (max - scrollTop) constant.
                        const desiredScrollTop = clampValue(
                            newScrollTop + reconciledDeltaMaxChange,
                            0,
                            reconciledNextMax
                        )
                        // Snap to integer pixels to prevent oscillation due to subpixel rounding
                        const desiredRounded = Math.round(desiredScrollTop)
                        const diffToDesired = desiredRounded - heightManager.viewport.scrollTop
                        if (Math.abs(diffToDesired) >= 2) {
                            const adjusted = clampValue(desiredRounded, 0, reconciledNextMax)
                            syncScrollTop(adjusted)
                            log('[SVL] items-length-change:reconciled', {
                                instanceId,
                                beforeReconcileScrollTop,
                                adjustedScrollTop: adjusted,
                                reconciledNextMax,
                                reconciledDeltaMaxChange,
                                desiredScrollTop,
                                desiredRounded,
                                diffToDesired
                            })
                        } else {
                            log('[SVL] items-length-change:reconciled-skip', {
                                instanceId,
                                beforeReconcileScrollTop,
                                reconciledNextMax,
                                reconciledDeltaMaxChange,
                                desiredScrollTop,
                                desiredRounded,
                                diffToDesired
                            })
                        }
                        programmaticScrollInProgress = false
                    })
                })
            }
        }

        lastItemsLength = currentItemsLength
        // Update last observed total height at the end of the effect
        lastTotalHeightObserved = totalHeight()
    })

    // Update container height continuously to reflect layout changes that
    // may occur outside ResizeObserver timing (keeps buffers correct across engines)
    $effect(() => {
        if (BROWSER && heightManager.isReady) {
            const h = heightManager.container.getBoundingClientRect().height
            if (Number.isFinite(h) && h > 0) height = h
        }
    })

    // One-time fallback measurement when height hasn't been established yet

    // Provide a one-time synchronous measurement only when height is still 0,
    // to avoid DOM reads inside render-time expressions.
    $effect(() => {
        if (BROWSER && height === 0 && heightManager.isReady) {
            const h = heightManager.container.getBoundingClientRect().height
            if (Number.isFinite(h) && h > 0) measuredFallbackHeight = h
        }
    })

    /**
     * Calculates the range of items that should be rendered based on current scroll position.
     *
     * This derived calculation determines which items should be visible in the viewport,
     * including the buffer zone. It takes into account:
     * - Current scroll position
     * - Viewport height
     * - Item height estimates
     * - Buffer size
     * - Scroll direction mode
     *
     * @example
     * ```typescript
     * const range = visibleItems()
     * console.info(`Rendering items from ${range.start} to ${range.end}`)
     * ```
     *
     * @returns {SvelteVirtualListPreviousVisibleRange} Object containing start and end indices of visible items
     */
    const visibleItems = $derived((): SvelteVirtualListPreviousVisibleRange => {
        if (!items.length) return { start: 0, end: 0 } as SvelteVirtualListPreviousVisibleRange
        const viewportHeight = height || 0

        // For bottomToTop mode, always render items starting from index 0 during initialization
        // This ensures Item 0 is in the DOM so we can use scrollIntoView for precise positioning
        // The scrollIntoView in updateHeightAndScroll will handle correct alignment after heights are measured
        // Use bottomToTopScrollComplete (not just initialized) to keep init path active until scroll is done
        if (mode === 'bottomToTop' && !bottomToTopScrollComplete) {
            // Use a reasonable default if viewport height isn't measured yet
            const effectiveViewport = viewportHeight || 400
            const visibleCount = Math.ceil(effectiveViewport / heightManager.averageHeight) + 1
            lastVisibleRange = {
                start: 0,
                end: Math.min(items.length, visibleCount + bufferSize * 2)
            } as SvelteVirtualListPreviousVisibleRange

            return lastVisibleRange
        }

        // Scroll delta threshold optimization: skip recalculation if scroll delta is less than
        // half the average item height and we have a cached range. This reduces unnecessary
        // calculations during smooth scrolling.
        // Note: Only applied in topToBottom mode - bottomToTop has complex scroll correction
        // logic that requires precise visible range calculations.
        // Note: We use lastProcessedScrollTop read-only here; it's updated in the scroll handler
        if (mode === 'topToBottom') {
            const scrollDelta = Math.abs(heightManager.scrollTop - lastProcessedScrollTop)
            const threshold = heightManager.averageHeight * 0.5
            if (lastVisibleRange && scrollDelta < threshold && scrollDelta > 0) {
                // Reuse cached range for small scroll movements
                return lastVisibleRange
            }
        }

        lastVisibleRange = calculateVisibleRange(
            heightManager.scrollTop,
            viewportHeight,
            heightManager.averageHeight,
            items.length,
            bufferSize,
            mode,
            atBottom,
            wasAtBottomBeforeHeightChange,
            lastVisibleRange,
            totalHeight(),
            heightManager.getHeightCache()
        )

        return lastVisibleRange
    })

    /**
     * Computed content height for the virtual list.
     * Uses the maximum of container height and total content height to ensure
     * proper scrolling behavior.
     */
    const contentHeight = $derived(() => Math.max(height, totalHeight()))

    /**
     * Computed transform Y value for positioning the visible items.
     * Extracted from inline IIFE for better performance and readability.
     */
    const transformY = $derived(() => {
        const viewportHeight = height || measuredFallbackHeight || 0
        const visibleRange = visibleItems()

        // Avoid synchronous DOM reads here; fall back once if height is 0
        const effectiveHeight = viewportHeight === 0 ? 400 : viewportHeight

        // Use precise offset for topToBottom using measured heights when available
        return Math.round(
            calculateTransformY(
                mode,
                items.length,
                visibleRange.end,
                visibleRange.start,
                heightManager.averageHeight,
                effectiveHeight,
                totalHeight(),
                heightManager.getHeightCache(),
                measuredFallbackHeight
            )
        )
    })

    /**
     * Handles scroll events in the viewport using requestAnimationFrame for performance.
     *
     * This function debounces scroll events and updates the scrollTop state only when
     * necessary to prevent excessive re-renders. It uses RAF scheduling to ensure
     * smooth scrolling performance.
     *
     * Implementation details:
     * - Uses isScrolling flag to prevent multiple RAF calls
     * - Updates scrollTop state only when scrolling has settled
     * - Browser-only functionality
     *
     * @example
     * ```svelte
     * <div onscroll={handleScroll}>
     *   <!-- scrollable content -->
     * </div>
     * ```
     *
     * @returns {void}
     */
    const handleScroll = () => {
        if (!BROWSER || !heightManager.viewportElement) return

        // Mark active scrolling and debounce idle transition (~120ms)
        isScrolling = true
        if (scrollIdleTimer) {
            clearTimeout(scrollIdleTimer)
            scrollIdleTimer = null
        }
        scrollIdleTimer = window.setTimeout(() => {
            isScrolling = false
            // Apply deferred anchor correction on idle
            if (idleCorrectionsOnly || anchorModeEnabled) {
                reconcileToAnchorIfEnabled()
            }
        }, 250)

        rafSchedule(() => {
            const current = heightManager.viewport.scrollTop
            if (mode === 'bottomToTop') {
                const delta = lastScrollTopSnapshot - current
                if (delta > 0.5) {
                    // Widen suppression to avoid fighting peer instance corrections
                    suppressBottomAnchoringUntilMs = performance.now() + 450
                    userHasScrolledAway = true
                }
            }
            lastScrollTopSnapshot = current
            heightManager.scrollTop = current
            // Update last processed scroll position for delta threshold optimization
            // Only update when we actually process a scroll (i.e., recalculate visible range)
            const scrollDelta = Math.abs(current - lastProcessedScrollTop)
            const threshold = heightManager.averageHeight * 0.5
            if (scrollDelta >= threshold || lastVisibleRange === null) {
                lastProcessedScrollTop = current
            }
            updateDebugTailDistance()
            if (anchorModeEnabled) {
                captureAnchor()
            }
            if (INTERNAL_DEBUG) {
                const vr = visibleItems()
                log('[SVL] scroll', {
                    mode,
                    scrollTop: heightManager.scrollTop,
                    height,
                    totalHeight: totalHeight(),
                    averageItemHeight: heightManager.averageHeight,
                    visibleRange: vr
                })
            }
            // isScrolling cleared by idle timer
        })
    }

    /**
     * Updates the height and scroll position of the virtual list.
     *
     * This function handles two scenarios:
     * 1. Initial setup (critical for bottomToTop mode in flexbox layouts)
     * 2. Subsequent resize events
     *
     * For bottomToTop mode, we need to ensure:
     * - The flexbox layout is fully calculated
     * - The height measurements are accurate
     * - The scroll position starts at the bottom
     *
     * @param immediate - Whether to skip the delay (used for resize events)
     */
    const updateHeightAndScroll = (immediate = false) => {
        log('updateHeightAndScroll-enter', {
            immediate,
            initialized: heightManager.initialized,
            mode
        })
        if (!heightManager.initialized && mode === 'bottomToTop') {
            // bottomToTop initialization: use scrollIntoView on Item 0 for precise positioning
            // visibleItems() guarantees Item 0 is rendered during initialization
            tick().then(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (!heightManager.isReady) return
                        const measuredHeight =
                            heightManager.container.getBoundingClientRect().height
                        height = measuredHeight

                        // Instance jitter to avoid same-frame collisions when two lists init together
                        const cleanedId = String(instanceId)
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, '')
                        const suffix = cleanedId.slice(-4)
                        const parsed = parseInt(suffix, 36)
                        const jitterMs = Number.isNaN(parsed)
                            ? Math.floor(Math.random() * 3)
                            : parsed % 3

                        setTimeout(() => {
                            // Step 1: Set initialized (for other purposes like scroll event handling)
                            // The init path in visibleItems() stays active until bottomToTopScrollComplete
                            if (!heightManager.initialized) {
                                heightManager.initialized = true
                            }

                            // Step 2: Use scrollIntoView on Item 0 for precise positioning
                            // Use double RAF to ensure heights are measured and layout is stable
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    // Item 0 is guaranteed to be in DOM due to init path
                                    // Skip if user has already scrolled (scrollTop significantly != 0)
                                    const currentScroll = heightManager.viewport.scrollTop
                                    const userHasScrolled =
                                        currentScroll > heightManager.averageHeight
                                    const el = heightManager.viewport.querySelector(
                                        '[data-original-index="0"]'
                                    ) as HTMLElement | null

                                    if (el && !userHasScrolled) {
                                        // Use manual scrollTop instead of scrollIntoView to prevent parent scroll
                                        // (scrollIntoView scrolls all ancestor containers, not just the viewport)
                                        // Note: `container: 'nearest'` option could replace this once browser support improves
                                        const viewportRect =
                                            heightManager.viewport.getBoundingClientRect()
                                        const elRect = el.getBoundingClientRect()
                                        const offset = elRect.bottom - viewportRect.bottom
                                        heightManager.viewport.scrollTop += offset
                                        heightManager.scrollTop = heightManager.viewport.scrollTop
                                    } else if (userHasScrolled) {
                                        // Sync internal state with current scroll
                                        heightManager.scrollTop = currentScroll
                                    }

                                    // Step 3: Mark scroll complete - switches visibleItems to normal mode
                                    requestAnimationFrame(() => {
                                        bottomToTopScrollComplete = true
                                        // Reset bottom-anchoring flag to prevent stale state from init
                                        // affecting later operations (e.g., adding items while scrolled away)
                                        wasAtBottomBeforeHeightChange = false
                                        // Suppress bottom-anchoring briefly to let heights stabilize
                                        // after switching to normal mode
                                        suppressBottomAnchoringUntilMs = performance.now() + 200
                                    })
                                })
                            })
                        }, jitterMs)
                    })
                })
            })
            return
        }

        utilsUpdateHeightAndScroll(
            {
                initialized: heightManager.initialized,
                mode,
                containerElement: heightManager.containerElement,
                viewportElement: heightManager.viewportElement,
                calculatedItemHeight: heightManager.averageHeight,
                height,
                scrollTop: heightManager.scrollTop
            },
            {
                setHeight: (h) => (height = h),
                setScrollTop: (st) => (heightManager.scrollTop = st),
                // Guard: respect invariant in ReactiveListManager; avoid re-setting true
                setInitialized: (i) => {
                    if (i && heightManager.initialized) return
                    heightManager.initialized = i
                }
            },
            immediate
        )
        log('updateHeightAndScroll-exit', { immediate })
    }

    // Create itemResizeObserver immediately when in browser
    if (BROWSER) {
        // Watch for individual item size changes
        itemResizeObserver = new ResizeObserver((entries) => {
            // Batch via RAF to avoid thrash across instances
            rafSchedule(() => {
                log('item-resize-observer', { entries: entries.length })
                let shouldRecalculate = false
                void visibleItems() // Cache once to avoid reactive loops

                for (const entry of entries) {
                    const element = entry.target as HTMLElement
                    const elementIndex = itemElements.indexOf(element)
                    const actualIndex = parseInt(element.dataset.originalIndex || '-1', 10)

                    if (elementIndex !== -1) {
                        if (actualIndex >= 0) {
                            const currentHeight = element.getBoundingClientRect().height
                            const isSignificant = isSignificantHeightChange(
                                actualIndex,
                                currentHeight,
                                heightManager.getHeightCache()
                            )

                            // Only mark as dirty if height change is significant
                            if (isSignificant) {
                                // Capture bottom state when FIRST item gets marked dirty
                                if (dirtyItemsCount === 0) {
                                    wasAtBottomBeforeHeightChange = atBottom
                                }

                                dirtyItems.add(actualIndex)
                                dirtyItemsCount = dirtyItems.size
                                shouldRecalculate = true
                            }
                        }
                    }
                }

                if (shouldRecalculate) {
                    log('item-resize-recalc')
                    updateHeight()
                }
            })
        })
    }

    // Setup and cleanup
    onMount(() => {
        if (BROWSER) {
            // Initial setup of heights and scroll position
            log('onMount-enter', { mode, items: items.length })
            updateHeightAndScroll()
            // Ensure one initial measurement pass even if no ResizeObserver fires
            tick().then(() =>
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => {
                        log('post-hydration-measure')
                        updateHeight()
                    })
                )
            )

            // Watch for container size changes
            resizeObserver = new ResizeObserver(() => {
                if (!heightManager.initialized) {
                    log('container-resize-ignored', 'not-initialized')
                    return
                }
                log('container-resize')
                updateHeightAndScroll(true)
            })

            if (heightManager.isReady) {
                resizeObserver.observe(heightManager.container)
            }

            // Cleanup on component destruction
            return () => {
                if (resizeObserver) {
                    resizeObserver.disconnect()
                }
                if (itemResizeObserver) {
                    itemResizeObserver.disconnect()
                }
            }
        }
    })

    // Add the effect in the script section
    $effect(() => {
        if (INTERNAL_DEBUG) {
            prevVisibleRange = visibleItems()
            prevHeight = heightManager.averageHeight
        }
    })

    // Call debugFunction in an effect to avoid state_unsafe_mutation when
    // the callback writes to $state (which is forbidden during render effects)
    $effect(() => {
        if (!debug) return
        const currentVisibleRange = visibleItems()
        if (
            !shouldShowDebugInfo(
                prevVisibleRange,
                currentVisibleRange,
                prevHeight,
                heightManager.averageHeight
            )
        )
            return

        const info = createDebugInfo(
            currentVisibleRange,
            items.length,
            Object.keys(heightManager.getHeightCache()).length,
            heightManager.averageHeight,
            heightManager.scrollTop,
            height || 0,
            totalHeight()
        )

        if (debugFunction) {
            debugFunction(info)
        } else {
            console.info('Virtual List Debug:', info)
        }
    })

    /**
     * Scrolls the virtual list to the item at the given index.
     *
     * @deprecated This function is deprecated and will be removed in a future version.
     * Use the new scroll method from the component instance instead.
     *
     * @function scrollToIndex
     * @param index The index of the item to scroll to.
     * @param smoothScroll (default: true) Whether to use smooth scrolling.
     * @param shouldThrowOnBounds (default: true) Whether to throw an error if the index is out of bounds.
     *
     * @example
     * // Svelte usage:
     * // In your <script> block:
     * import SvelteVirtualList from '@humanspeak/svelte-virtual-list';
     * let virtualList;
     * const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
     *
     * // In your markup:
     * <button onclick={() => virtualList.scrollToIndex(5000)}>
     *    Scroll to 5000
     * </button>
     * <SvelteVirtualList {items} bind:this={virtualList}>
     *   {#snippet renderItem(item)}
     *     <div>{item.text}</div>
     *   {/snippet}
     * </SvelteVirtualList>
     *
     * @returns {void}
     * @throws {Error} If the index is out of bounds and shouldThrowOnBounds is true
     */
    export const scrollToIndex = (
        index: number,
        smoothScroll = true,
        shouldThrowOnBounds = true
    ): void => {
        // Deprecation warning
        console.warn(
            'SvelteVirtualList: scrollToIndex is deprecated and will be removed in a future version. ' +
                'Use the new scroll method from the component instance instead.'
        )

        // Call the new scroll function with the provided parameters
        scroll({ index, smoothScroll, shouldThrowOnBounds })
    }

    /**
     * Scrolls the virtual list to the item at the given index using a type-based options approach.
     *
     * @function scroll
     * @param options Configuration options for scrolling behavior.
     *
     * @example
     * // Svelte usage:
     * // In your <script> block:
     *   import SvelteVirtualList from '$lib/index.js';
     *   let virtualList;
     *   const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
     *
     * <button onclick={() => virtualList.scroll({ index: 5000 })}>
     *   Scroll to 5000
     * </button>
     * <SvelteVirtualList {items} bind:this={virtualList}>
     *   {#snippet renderItem(item)}
     *     <div>{item.text}</div>
     *   {/snippet}
     * </SvelteVirtualList>
     *
     * @returns {Promise<void>} Promise that resolves when scrolling is complete
     * @throws {Error} If the index is out of bounds and shouldThrowOnBounds is true
     */
    export const scroll = async (options: SvelteVirtualListScrollOptions): Promise<void> => {
        const { index, smoothScroll, shouldThrowOnBounds, align } = {
            ...DEFAULT_SCROLL_OPTIONS,
            ...options
        }

        if (!items.length) return
        if (!heightManager.viewportElement) {
            tick().then(() => {
                if (!heightManager.viewportElement) return
                scroll({ index, smoothScroll, shouldThrowOnBounds, align })
            })
            return
        }

        // Bounds checking
        let targetIndex = index
        if (targetIndex < 0 || targetIndex >= items.length) {
            if (shouldThrowOnBounds) {
                throw new Error(
                    `scroll: index ${targetIndex} is out of bounds (0-${items.length - 1})`
                )
            } else {
                targetIndex = clampValue(targetIndex, 0, items.length - 1)
            }
        }

        const { start: firstVisibleIndex, end: lastVisibleIndex } = visibleItems()

        // Use extracted scroll calculation utility
        const scrollTarget = calculateScrollTarget({
            mode,
            align: align || 'auto',
            targetIndex,
            itemsLength: items.length,
            calculatedItemHeight: heightManager.averageHeight, // Use dynamic average from ReactiveListManager
            height,
            scrollTop: heightManager.scrollTop,
            firstVisibleIndex,
            lastVisibleIndex,
            heightCache: heightManager.getHeightCache()
        })

        // Handle early return for 'nearest' alignment when item is already visible
        if (scrollTarget === null) {
            return
        }

        // Prevent bottom-anchoring logic from interfering with programmatic scroll
        programmaticScrollInProgress = true

        if (INTERNAL_DEBUG && heightManager.viewportElement) {
            const domMax = Math.max(
                0,
                heightManager.viewport.scrollHeight - heightManager.viewport.clientHeight
            )
            console.info('[SVL] scroll-intent', {
                targetIndex,
                align: align || 'auto',
                firstVisibleIndex,
                lastVisibleIndex,
                currentScrollTop: heightManager.scrollTop,
                scrollTarget,
                domMaxScrollTop: domMax
            })
        }

        // CROSS-BROWSER COMPATIBILITY FIX:
        // All major browsers (Chrome, Firefox, Safari) have inconsistent behavior with scrollTo()
        // in bottomToTop mode when using smooth scrolling. Using scrollIntoView() on the highest
        // visible element provides consistent cross-browser smooth scrolling behavior.
        // This approach works universally and maintains the user's expected smooth scroll experience.
        if (mode === 'bottomToTop' && smoothScroll) {
            // Find the element with the highest original-index in the current viewport
            const visibleElements = heightManager.viewport.querySelectorAll('[data-original-index]')
            let maxIndex = -1
            let maxElement: HTMLElement | null = null
            for (const el of visibleElements) {
                const index = parseInt(el.getAttribute('data-original-index') || '-1')
                if (index > maxIndex) {
                    maxIndex = index
                    maxElement = el as HTMLElement
                }
            }

            maxElement?.scrollIntoView({
                behavior: 'smooth'
            })
            await tick()
            await new Promise((resolve) => setTimeout(resolve, 100))
            await tick()
        }

        heightManager.viewport.scrollTo({
            top: scrollTarget,
            behavior: smoothScroll ? 'smooth' : 'auto'
        })

        // Update scrollTop state in next frame to avoid synchronous re-renders
        requestAnimationFrame(() => {
            heightManager.scrollTop = scrollTarget
            if (INTERNAL_DEBUG && heightManager.viewportElement) {
                const domMax = Math.max(
                    0,
                    heightManager.viewport.scrollHeight - heightManager.viewport.clientHeight
                )
                console.info('[SVL] scroll-after-call', {
                    scrollTop: heightManager.scrollTop,
                    domMaxScrollTop: domMax
                })
            }
        })

        // No extra alignment step here; allow native smooth scroll to reach DOM max scrollTop

        // Clear the flag after scroll completes
        setTimeout(
            () => {
                programmaticScrollInProgress = false
            },
            smoothScroll ? 500 : 100
        )
    }

    /**
     * Custom Svelte action to automatically observe item elements for size changes.
     * This action is applied to each item element to detect when its dimensions change.
     *
     * @param element - The HTML element to observe
     * @returns {{ destroy: () => void }} Object with destroy method for cleanup
     */
    function autoObserveItemResize(element: HTMLElement) {
        if (itemResizeObserver) {
            itemResizeObserver.observe(element)
        }

        return {
            destroy() {
                if (itemResizeObserver) {
                    itemResizeObserver.unobserve(element)
                }
            }
        }
    }
</script>

<!--
    The template uses a four-layer structure:
    1. Container - Overall boundary
    2. Viewport - Scrollable area
    3. Content - Full height container
    4. Items - Translated list of visible items
-->
<div
    id="virtual-list-container"
    {...testId ? { 'data-testid': `${testId}-container` } : {}}
    class={containerClass ?? 'virtual-list-container'}
    bind:this={heightManager.containerElement}
>
    <!-- Viewport handles scrolling -->
    <div
        id="virtual-list-viewport"
        {...testId ? { 'data-testid': `${testId}-viewport` } : {}}
        class={viewportClass ?? 'virtual-list-viewport'}
        bind:this={heightManager.viewportElement}
        onscroll={handleScroll}
        style:overflow-anchor="none"
    >
        <!-- Content provides full scrollable height -->
        <div
            id="virtual-list-content"
            {...testId ? { 'data-testid': `${testId}-content` } : {}}
            class={contentClass ?? 'virtual-list-content'}
            style:height="{contentHeight()}px"
        >
            <!-- Items container is translated to show correct items -->
            <div
                id="virtual-list-items"
                {...testId ? { 'data-testid': `${testId}-items` } : {}}
                class={itemsClass ?? 'virtual-list-items'}
                style:transform="translateY({transformY()}px)"
            >
                {#each displayItems() as currentItemWithIndex, _i (currentItemWithIndex.originalIndex)}
                    <!-- Render each visible item -->
                    <div
                        bind:this={itemElements[currentItemWithIndex.sliceIndex]}
                        use:autoObserveItemResize
                        data-original-index={currentItemWithIndex.originalIndex}
                        {...testId
                            ? {
                                  'data-testid': `${testId}-item-${currentItemWithIndex.originalIndex}`
                              }
                            : {}}
                    >
                        {@render renderItem(
                            currentItemWithIndex.item,
                            currentItemWithIndex.originalIndex
                        )}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    /* Container establishes positioning context */
    .virtual-list-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    /* Viewport handles scrolling with iOS momentum scroll */
    .virtual-list-viewport {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
    }

    /* Content wrapper maintains full scrollable height */
    .virtual-list-content {
        position: relative;
        width: 100%;
        min-height: 100%;
    }

    /* Items wrapper is translated for virtual scrolling */
    .virtual-list-items {
        position: absolute;
        width: 100%;
        left: 0;
        top: 0;
    }

    /* Item wrapper divs should size to their content */
    .virtual-list-items > div {
        width: 100%;
        display: block;
    }
</style>
