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
        type SvelteVirtualListScrollAlign,
        type SvelteVirtualListScrollOptions
    } from '$lib/types.js'
    import { calculateAverageHeightDebounced } from '$lib/utils/heightCalculation.js'
    import { createRafScheduler } from '$lib/utils/raf.js'
    import {
        isDedicatedHeightWithinTolerance,
        isSignificantHeightChange,
        normalizeDedicatedMeasuredHeight
    } from '$lib/utils/heightChangeDetection.js'
    import {
        calculateTransformY,
        calculateAverageHeight,
        calculateVisibleRange,
        clampValue,
        updateHeightAndScroll as utilsUpdateHeightAndScroll,
        getScrollOffsetForIndex
    } from '$lib/utils/virtualList.js'
    import { createDebugInfo, shouldShowDebugInfo } from '$lib/utils/virtualListDebug.js'
    import { calculateScrollTarget } from '$lib/utils/scrollCalculation.js'
    import { createAdvancedThrottledCallback } from '$lib/utils/throttle.js'
    import { ReactiveListManager } from '$lib/index.js'
    import BottomToTopMeasurementLane from '$lib/bottom-to-top/BottomToTopMeasurementLane.svelte'
    import {
        buildBottomToTopBackfillIndices,
        buildBottomToTopEstimatedTailWindow,
        buildBottomToTopMeasurementTasks,
        calculateBottomToTopPhysicalWindow,
        calculateBottomToTopSpacers,
        type BottomToTopWindow
    } from '$lib/bottom-to-top/BottomToTopController.js'
    import {
        BottomToTopStateMachine,
        type BottomToTopModeState
    } from '$lib/bottom-to-top/BottomToTopStateMachine.js'
    import {
        type BottomToTopMutation,
        detectBottomToTopMutation,
        getLogicalIndexFromPhysical,
        getPhysicalIndexFromLogical,
        mapPhysicalWindowToLogicalRange,
        remapPhysicalMeasurementsForMutation
    } from '$lib/bottom-to-top/bottomToTopMapping.js'
    import { BROWSER } from 'esm-env'
    import { flushSync, onMount, tick, untrack } from 'svelte'
    import { SvelteSet } from 'svelte/reactivity'

    const rafSchedule = createRafScheduler()
    // Timing constants
    const SCROLL_IDLE_DELAY_MS = 120
    const HEIGHT_DEBOUNCE_MS = 100
    const BOTTOM_PIN_FRAMES = 24 // ~400ms at 60fps — enough for ResizeObserver to settle
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
    const useDedicatedBottomToTopEngine = mode === 'bottomToTop'

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
        const vr = visibleItems
        const anchorIndex = Math.max(0, vr.start)
        const cache = heightManager.getHeightCache()
        const est = offsetCalculationItemHeight
        const maxScrollTop = Math.max(0, totalHeight - (height || 0))
        // Offset from start to anchored item
        const blockSums = heightManager.getBlockSums()
        const offsetToIndex = getScrollOffsetForIndex(cache, est, anchorIndex, blockSums)
        const currentTop = heightManager.viewport.scrollTop
        let offsetWithin: number
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
        const est = offsetCalculationItemHeight
        const blockSums = heightManager.getBlockSums()
        const offsetToIndex = getScrollOffsetForIndex(
            cache,
            est,
            Math.max(0, lastAnchorIndex),
            blockSums
        )
        const maxScrollTop = clampValue(totalHeight - (height || 0), 0, Infinity)
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
    let itemsWrapperElement = $state<HTMLElement | null>(null)

    /**
     * Timers and Observers
     */
    let heightUpdateTimeout: ReturnType<typeof setTimeout> | null = null // Debounce timer for height updates
    let resizeObserver: ResizeObserver | null = null // Watches for container size changes
    let itemResizeObserver: ResizeObserver | null = null // Watches for individual item size changes

    /**
     * Performance Optimization State
     */
    const dirtyItems = new SvelteSet<number>() // Set of item indices that need height recalculation
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
        useFixedEstimateForUnmeasured: useDedicatedBottomToTopEngine,
        internalDebug: INTERNAL_DEBUG
    })
    const offsetCalculationItemHeight = $derived(
        useDedicatedBottomToTopEngine ? heightManager.itemHeight : heightManager.averageHeight
    )
    const instanceId = Math.random().toString(36).slice(2, 7)
    const BOTTOM_TO_TOP_BACKFILL_DELAY_MS = 48
    const BOTTOM_TO_TOP_SCROLL_AWAY_SUPPRESSION_MS = 250
    const BOTTOM_TO_TOP_FORCED_SCROLL_AWAY_PX = 96
    const BOTTOM_TO_TOP_LOCKED_BOTTOM_DRAIN_MAX_ITEMS = 4
    const BOTTOM_TO_TOP_LOCKED_BOTTOM_DRAIN_MAX_DELTA_PX = 64
    const BOTTOM_TO_TOP_LOCKED_BOTTOM_DRAIN_SETTLE_FRAMES = 2
    const bottomToTopStateMachine = new BottomToTopStateMachine()
    let bottomToTopModeState = $state<BottomToTopModeState>(
        useDedicatedBottomToTopEngine ? bottomToTopStateMachine.enterInitializing() : 'lockedBottom'
    )
    let bottomToTopInitWindow = $state<BottomToTopWindow>(
        buildBottomToTopEstimatedTailWindow({
            totalItems: items.length,
            estimatedItemHeight: defaultEstimatedItemHeight,
            viewportHeight: 400,
            overscan: bufferSize
        })
    )
    const snapshotBottomToTopItems = (source: TItem[]) => source.slice()
    let bottomToTopPreviousItems = $state<TItem[]>(snapshotBottomToTopItems(items))
    const bottomToTopMeasurementQueue = new SvelteSet<number>()
    let bottomToTopReconcileRafId: number | null = null
    let bottomToTopBackfillRafId: number | null = null
    let bottomToTopBackfillTimeoutId: number | null = null
    let bottomToTopMaintainingBottom = $state(false)
    let bottomToTopStagedHeights = $state<Record<number, number>>({})
    let bottomToTopStagedCount = $state(0)
    let bottomToTopPromotionScheduled = $state(false)
    let bottomToTopLockedBottomDrainRafId: number | null = null
    let bottomToTopLockedBottomDrainScheduled = $state(false)
    let bottomToTopLockedBottomDrainActive = $state(false)
    let bottomToTopLockedBottomDrainSettleFramesRemaining = $state(0)
    let bottomToTopVisibleMutationObserver: MutationObserver | null = null
    let bottomToTopVisibleMutationRafId: number | null = null
    let bottomToTopProgrammaticScrollRafId: number | null = null
    let bottomToTopProgrammaticScrollToken = 0
    let bottomToTopSuppressScrollAwayUntilMs = $state(0)

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
        lastScrollTopSnapshot = scrollValue
    }

    const getRoundedViewportScrollTop = () => {
        if (!heightManager.viewportElement) {
            return Math.round(heightManager.scrollTop)
        }

        return Math.round(heightManager.viewport.scrollTop)
    }

    const getViewportMaxScrollTop = () => {
        if (!heightManager.viewportElement) {
            const estimatedMaxScrollTop = Math.max(0, totalHeight - height)
            return useDedicatedBottomToTopEngine
                ? Math.round(estimatedMaxScrollTop)
                : estimatedMaxScrollTop
        }

        const clientHeight = heightManager.viewport.clientHeight
        const estimatedMaxScrollTop = Math.max(0, totalHeight - clientHeight)
        const domMaxScrollTop = Math.max(0, heightManager.viewport.scrollHeight - clientHeight)

        // In non-overflow bottomToTop layouts, rely on the list model instead of DOM scrollHeight.
        // The DOM can report a small phantom scroll range from min-height/layout rounding, which
        // incorrectly nudges the viewport away from the static bottom-aligned state.
        if (mode === 'bottomToTop' && totalHeight <= clientHeight + 1) {
            return useDedicatedBottomToTopEngine
                ? Math.round(estimatedMaxScrollTop)
                : estimatedMaxScrollTop
        }

        const maxScrollTop = Math.max(estimatedMaxScrollTop, domMaxScrollTop)
        return useDedicatedBottomToTopEngine ? Math.round(maxScrollTop) : maxScrollTop
    }

    const getRoundedViewportMaxScrollTop = () => Math.round(getViewportMaxScrollTop())

    const getRoundedGapFromBottomPx = () =>
        getRoundedViewportMaxScrollTop() - getRoundedViewportScrollTop()

    const getBottomToTopBottomLockTolerancePx = () =>
        Math.max(2, Math.round(heightManager.averageHeight * 0.5))

    const suppressBottomToTopScrollAway = (
        durationMs = BOTTOM_TO_TOP_SCROLL_AWAY_SUPPRESSION_MS
    ) => {
        bottomToTopSuppressScrollAwayUntilMs = performance.now() + durationMs
    }

    const shouldIgnoreDedicatedBottomToTopScrollAway = (
        currentScrollTop: number,
        previousScrollTop: number
    ) =>
        performance.now() < bottomToTopSuppressScrollAwayUntilMs &&
        currentScrollTop >= previousScrollTop - 2

    const shouldForceDedicatedBottomToTopScrollAway = (gapFromBottom: number) =>
        gapFromBottom >
        Math.max(BOTTOM_TO_TOP_FORCED_SCROLL_AWAY_PX, getBottomToTopBottomLockTolerancePx())

    const isBottomToTopProgrammaticTargetNearBottom = (targetScrollTop: number) =>
        Math.abs(Math.round(targetScrollTop) - getRoundedViewportMaxScrollTop()) <=
        getBottomToTopBottomLockTolerancePx()

    const isViewportNearBottom = (
        tolerance = Math.max(2, Math.round(heightManager.averageHeight))
    ) => {
        if (!heightManager.viewportElement) return false
        const gapFromBottom = useDedicatedBottomToTopEngine
            ? getRoundedGapFromBottomPx()
            : getViewportMaxScrollTop() - heightManager.viewport.scrollTop
        return gapFromBottom <= tolerance
    }

    const cancelBottomToTopProgrammaticScroll = () => {
        if (bottomToTopProgrammaticScrollRafId === null) return
        cancelAnimationFrame(bottomToTopProgrammaticScrollRafId)
        bottomToTopProgrammaticScrollRafId = null
    }

    const performDedicatedBottomToTopScroll = (targetScrollTop: number, smoothScroll: boolean) => {
        if (!heightManager.viewportElement) return

        cancelBottomToTopProgrammaticScroll()

        const clampedTargetScrollTop = clampValue(
            Math.round(targetScrollTop),
            0,
            getViewportMaxScrollTop()
        )

        if (!smoothScroll) {
            syncScrollTop(clampedTargetScrollTop, true)
            return
        }

        const startScrollTop = heightManager.viewport.scrollTop
        const delta = clampedTargetScrollTop - startScrollTop
        if (Math.abs(delta) <= 1) {
            syncScrollTop(clampedTargetScrollTop, true)
            return
        }

        const durationMs = 500
        const startTime = performance.now()
        const easeInOutCubic = (progress: number) =>
            progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2

        const step = (now: number) => {
            if (!heightManager.viewportElement || !programmaticScrollInProgress) {
                bottomToTopProgrammaticScrollRafId = null
                return
            }

            const progress = clampValue((now - startTime) / durationMs, 0, 1)
            const easedProgress = easeInOutCubic(progress)
            syncScrollTop(startScrollTop + delta * easedProgress, true)

            if (progress < 1) {
                bottomToTopProgrammaticScrollRafId = requestAnimationFrame(step)
                return
            }

            syncScrollTop(clampedTargetScrollTop, true)
            bottomToTopProgrammaticScrollRafId = null
        }

        bottomToTopProgrammaticScrollRafId = requestAnimationFrame(step)
    }

    let bottomPinRafId: number | null = null
    let bottomPinFramesRemaining = 0
    let bottomLockGeometryReconcileRafId: number | null = null
    const cancelBottomPin = () => {
        pendingBottomPin = false
        bottomPinFramesRemaining = 0
        if (bottomLockGeometryReconcileRafId !== null) {
            cancelAnimationFrame(bottomLockGeometryReconcileRafId)
            bottomLockGeometryReconcileRafId = null
        }

        if (bottomPinRafId !== null) {
            cancelAnimationFrame(bottomPinRafId)
            bottomPinRafId = null
        }
    }

    const scheduleBottomPin = (frames = 8) => {
        if (!BROWSER) return

        pendingBottomPin = true
        bottomPinFramesRemaining = Math.max(bottomPinFramesRemaining, frames)

        if (
            heightManager.viewportElement &&
            heightManager.initialized &&
            !heightManager.isDynamicUpdateInProgress &&
            !programmaticScrollInProgress
        ) {
            const maxScrollTop = getViewportMaxScrollTop()
            const gap = maxScrollTop - heightManager.viewport.scrollTop
            const nearBottom = gap <= Math.max(2, Math.round(heightManager.averageHeight))
            if ((!userHasScrolledAway || nearBottom) && gap > 2) {
                syncScrollTop(maxScrollTop, true)
            }
        }

        if (bottomPinRafId !== null) return

        const step = () => {
            bottomPinRafId = null
            const nearBottom = isViewportNearBottom()

            if (
                !pendingBottomPin ||
                (userHasScrolledAway && !nearBottom) ||
                !heightManager.viewportElement ||
                !heightManager.initialized
            ) {
                cancelBottomPin()
                return
            }

            if (programmaticScrollInProgress || heightManager.isDynamicUpdateInProgress) {
                bottomPinRafId = requestAnimationFrame(step)
                return
            }

            if (nearBottom) {
                userHasScrolledAway = false
            }

            const maxScrollTop = getViewportMaxScrollTop()
            const gap = maxScrollTop - heightManager.viewport.scrollTop

            if (!heightManager.isDynamicUpdateInProgress && gap > 2) {
                syncScrollTop(maxScrollTop, true)
            }

            bottomPinFramesRemaining = Math.max(0, bottomPinFramesRemaining - 1)
            if (bottomPinFramesRemaining > 0) {
                bottomPinRafId = requestAnimationFrame(step)
            } else {
                pendingBottomPin = false
            }
        }

        bottomPinRafId = requestAnimationFrame(step)
    }

    const getBottomAnchorDelta = () => {
        if (!heightManager.viewportElement) return null

        const visibleElements = Array.from(
            heightManager.viewport.querySelectorAll('[data-original-index]')
        ) as HTMLElement[]
        if (visibleElements.length === 0) return null

        let anchorElement = visibleElements[0]
        let lowestOriginalIndex = parseInt(anchorElement.dataset.originalIndex || '0', 10)

        for (const element of visibleElements) {
            const originalIndex = parseInt(element.dataset.originalIndex || '0', 10)
            if (originalIndex < lowestOriginalIndex) {
                lowestOriginalIndex = originalIndex
                anchorElement = element
            }
        }

        const viewportRect = heightManager.viewport.getBoundingClientRect()
        const anchorRect = anchorElement.getBoundingClientRect()
        const delta = anchorRect.bottom - viewportRect.bottom
        return useDedicatedBottomToTopEngine ? Math.round(delta) : delta
    }

    const scheduleBottomLockGeometryReconcile = (frames = 3) => {
        if (!BROWSER || mode !== 'bottomToTop' || !heightManager.viewportElement) return

        if (bottomLockGeometryReconcileRafId !== null) {
            cancelAnimationFrame(bottomLockGeometryReconcileRafId)
            bottomLockGeometryReconcileRafId = null
        }

        let framesRemaining = Math.max(1, frames)
        let stableFrames = 0

        const step = () => {
            bottomLockGeometryReconcileRafId = null

            if (
                !heightManager.viewportElement ||
                mode !== 'bottomToTop' ||
                userHasScrolledAway ||
                !heightManager.initialized
            ) {
                return
            }

            const delta = getBottomAnchorDelta()
            if (delta === null) {
                return
            }

            if (Math.abs(delta) <= 1) {
                stableFrames += 1
            } else {
                stableFrames = 0
                const targetScrollTop = clampValue(
                    heightManager.viewport.scrollTop + delta,
                    0,
                    getViewportMaxScrollTop()
                )
                syncScrollTop(targetScrollTop, true)
            }

            framesRemaining -= 1
            if (stableFrames >= 2 || framesRemaining <= 0) {
                return
            }

            bottomLockGeometryReconcileRafId = requestAnimationFrame(step)
        }

        bottomLockGeometryReconcileRafId = requestAnimationFrame(step)
    }

    // Height update function - removed throttling to fix race condition on initial load
    // Create throttled height update function with trailing execution to ensure measurement always happens
    const triggerHeightUpdate = createAdvancedThrottledCallback(
        () => {
            if (BROWSER && dirtyItemsCount > 0 && !useDedicatedBottomToTopEngine) {
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
        if (useDedicatedBottomToTopEngine) {
            stabilizedContentHeight = 0
            return
        }
        heightManager.updateItemLength(items.length)
        stabilizedContentHeight = 0
    })

    // Infinite scroll: trigger onLoadMore when approaching end of list
    $effect(() => {
        if (!BROWSER || !onLoadMore || !hasMore || isLoadingMore) return
        // Skip loading during bottomToTop initialization (init path renders all items artificially)
        if (useDedicatedBottomToTopEngine && bottomToTopModeState === 'initializing') return
        if (mode === 'bottomToTop' && !useDedicatedBottomToTopEngine && !bottomToTopScrollComplete)
            return

        const range = visibleItems
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
        if (useDedicatedBottomToTopEngine) return
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
                })
                heightManager.endDynamicUpdate()
            },
            lastMeasuredIndex < 0 || dirtyItems.size > 0 ? 0 : HEIGHT_DEBOUNCE_MS,
            dirtyItems, // Pass dirty items for processing
            0, // Don't pass ReactiveListManager state - let each system manage its own totals
            0, // Don't pass ReactiveListManager state - let each system manage its own totals
            mode // Pass mode for correct element indexing
        )
    }

    const measureVisibleItemsImmediately = () => {
        const currentVisibleRange = visibleItems
        const heightCache = heightManager.getHeightCache()
        // trunk-ignore(eslint/svelte/prefer-svelte-reactivity): ephemeral local variable, not reactive state
        const dirtyVisibleItems = new Set<number>()

        for (const element of itemElements) {
            if (!element) continue

            const itemIndex = parseInt(element.dataset.originalIndex || '-1', 10)
            if (itemIndex < 0) continue

            const measuredHeight = element.getBoundingClientRect().height
            const cachedHeight = heightCache[itemIndex]

            if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) {
                continue
            }

            if (!cachedHeight || Math.abs(cachedHeight - measuredHeight) >= 0.1) {
                dirtyVisibleItems.add(itemIndex)
            }
        }

        if (dirtyVisibleItems.size === 0) {
            return false
        }

        const result = calculateAverageHeight(
            itemElements,
            currentVisibleRange,
            heightCache,
            heightManager.averageHeight,
            dirtyVisibleItems,
            heightManager.totalMeasuredHeight,
            heightManager.measuredCount,
            mode
        )

        if (result.heightChanges.length === 0) {
            return false
        }

        if (result.newValidCount !== 1) {
            heightManager.itemHeight = result.newHeight
        }

        lastMeasuredIndex = result.newLastMeasuredIndex
        heightManager.processDirtyHeights(result.heightChanges)
        return true
    }

    // Add new effect to handle height changes
    // Track if user has scrolled away from bottom to prevent snap-back
    let userHasScrolledAway = $state(false)
    let pendingBottomPin = $state(false)
    let programmaticScrollInProgress = $state(false) // Prevent bottom-anchoring during programmatic scrolls
    type BottomToTopProgrammaticIntent = 'none' | 'towardBottom' | 'awayFromBottom'
    let bottomToTopProgrammaticIntent = $state<BottomToTopProgrammaticIntent>('none')
    let lastCalculatedHeight = $state(0)
    let lastItemsLength = $state(0)
    // Track last observed total height to compute precise deltas on item count changes
    let lastTotalHeightObserved = $state(0)
    // For bottomToTop mode: keep init path active until scroll positioning is complete
    // This ensures Item 0 stays in the DOM throughout initialization
    let bottomToTopScrollComplete = $state(false)
    let previousBottomToTopModeState: BottomToTopModeState = useDedicatedBottomToTopEngine
        ? 'initializing'
        : 'lockedBottom'

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
     * Used by: scroll corrections, maxScrollTop calculations
     */
    const totalHeight = $derived(heightManager.totalHeight)

    let lastVisibleRange: SvelteVirtualListPreviousVisibleRange | null = null

    const bottomToTopPhysicalWindow = $derived.by((): BottomToTopWindow => {
        if (!useDedicatedBottomToTopEngine || !items.length) {
            return { startPhysical: 0, endPhysical: 0 }
        }

        if (bottomToTopModeState === 'initializing') {
            return bottomToTopInitWindow
        }

        const viewportHeight = height || measuredFallbackHeight || 0
        return calculateBottomToTopPhysicalWindow({
            scrollTop: heightManager.scrollTop,
            viewportHeight,
            itemHeight: heightManager.itemHeight,
            totalItems: items.length,
            bufferSize,
            totalContentHeight: totalHeight,
            heightCache: heightManager.getHeightCache(),
            blockSums: heightManager.getBlockSums()
        })
    })

    const bottomToTopLogicalVisibleRange = $derived.by(
        (): SvelteVirtualListPreviousVisibleRange => {
            if (!useDedicatedBottomToTopEngine || !items.length) {
                return { start: 0, end: 0 } as SvelteVirtualListPreviousVisibleRange
            }

            let window =
                bottomToTopModeState === 'initializing'
                    ? bottomToTopInitWindow
                    : bottomToTopPhysicalWindow

            if (window.endPhysical <= window.startPhysical) {
                window = buildBottomToTopEstimatedTailWindow({
                    totalItems: items.length,
                    estimatedItemHeight: heightManager.itemHeight,
                    viewportHeight: height || measuredFallbackHeight || 400,
                    overscan: bufferSize
                })
            }

            return mapPhysicalWindowToLogicalRange(
                window.startPhysical,
                window.endPhysical,
                items.length
            )
        }
    )

    const bottomToTopSpacers = $derived.by(() => {
        if (!useDedicatedBottomToTopEngine || !items.length) {
            return { topSpacer: 0, bottomSpacer: 0 }
        }

        const spacers = calculateBottomToTopSpacers({
            window: bottomToTopPhysicalWindow,
            heightCache: heightManager.getHeightCache(),
            itemHeight: heightManager.itemHeight,
            totalHeight,
            blockSums: heightManager.getBlockSums()
        })

        if (!shouldMaintainBottomToTopBottomLock()) {
            return spacers
        }

        return {
            topSpacer: Math.round(spacers.topSpacer),
            bottomSpacer: Math.round(spacers.bottomSpacer)
        }
    })

    const bottomToTopMeasurementTasks = $derived.by(() => {
        if (!useDedicatedBottomToTopEngine || !bottomToTopMeasurementQueue.size) return []
        const indices = Array.from(bottomToTopMeasurementQueue).sort((a, b) => a - b)

        return buildBottomToTopMeasurementTasks({
            indices,
            items,
            getLogicalIndexFromPhysical: (physicalIndex) =>
                getLogicalIndexFromPhysical(physicalIndex, items.length)
        })
    })

    const getBottomToTopCurrentWindow = (): BottomToTopWindow =>
        bottomToTopModeState === 'initializing' ? bottomToTopInitWindow : bottomToTopPhysicalWindow

    const getDedicatedBottomToTopScrollTarget = (
        targetLogicalIndex: number,
        align: SvelteVirtualListScrollAlign
    ) => {
        const physicalTargetIndex = getPhysicalIndexFromLogical(targetLogicalIndex, items.length)

        // Compute visible (unbuffered) window on-demand rather than as a $derived,
        // since this function is only called imperatively from scrollToIndex
        const visibleWindow =
            !useDedicatedBottomToTopEngine || !items.length
                ? { startPhysical: 0, endPhysical: 0 }
                : bottomToTopModeState === 'initializing'
                  ? bottomToTopInitWindow
                  : calculateBottomToTopPhysicalWindow({
                        scrollTop: heightManager.scrollTop,
                        viewportHeight: height || measuredFallbackHeight || 0,
                        itemHeight: heightManager.itemHeight,
                        totalItems: items.length,
                        bufferSize: 0,
                        totalContentHeight: totalHeight,
                        heightCache: heightManager.getHeightCache(),
                        blockSums: heightManager.getBlockSums()
                    })

        return calculateScrollTarget({
            mode: 'topToBottom',
            align,
            targetIndex: physicalTargetIndex,
            itemsLength: items.length,
            calculatedItemHeight: heightManager.itemHeight,
            height,
            scrollTop: heightManager.scrollTop,
            firstVisibleIndex: visibleWindow.startPhysical,
            lastVisibleIndex: visibleWindow.endPhysical,
            heightCache: heightManager.getHeightCache()
        })
    }

    const shouldMaintainBottomToTopBottomLock = () =>
        bottomToTopModeState === 'initializing' ||
        (!userHasScrolledAway && bottomToTopProgrammaticIntent !== 'awayFromBottom')

    const shouldPreserveBottomToTopAnchor = () =>
        userHasScrolledAway &&
        bottomToTopProgrammaticIntent === 'none' &&
        !programmaticScrollInProgress

    type BottomToTopPromotionAnchor = {
        logicalIndex: number
        offsetTop: number
    }

    type BottomToTopMutationAnchor = {
        item: TItem
        fallbackLogicalIndex: number
        offsetTop: number
    }

    const hasBottomToTopStagedHeight = (physicalIndex: number) =>
        Number.isFinite(bottomToTopStagedHeights[physicalIndex])

    const setBottomToTopStagedHeight = (physicalIndex: number, heightValue: number) => {
        const normalizedHeight = normalizeDedicatedMeasuredHeight(heightValue)
        if (normalizedHeight <= 0) return false

        const previous = bottomToTopStagedHeights[physicalIndex]
        if (isDedicatedHeightWithinTolerance(previous, normalizedHeight)) {
            return false
        }

        bottomToTopStagedHeights[physicalIndex] = normalizedHeight
        bottomToTopStagedCount = Object.keys(bottomToTopStagedHeights).length
        return true
    }

    const deleteBottomToTopStagedHeight = (physicalIndex: number) => {
        const previous = bottomToTopStagedHeights[physicalIndex]
        if (!Number.isFinite(previous)) return false
        delete bottomToTopStagedHeights[physicalIndex]
        bottomToTopStagedCount = Object.keys(bottomToTopStagedHeights).length
        return true
    }

    const replaceBottomToTopStagedHeights = (nextHeights: Record<number, number>) => {
        bottomToTopStagedHeights = nextHeights
        bottomToTopStagedCount = Object.keys(nextHeights).length
    }

    const clearBottomToTopStagedHeights = () => {
        bottomToTopStagedHeights = {}
        bottomToTopStagedCount = 0
    }

    const getBottomToTopMeasuredIndices = () => {
        // trunk-ignore(eslint/svelte/prefer-svelte-reactivity): ephemeral local variable, not reactive state
        const measuredIndices = new Set(
            Object.keys(heightManager.getHeightCache()).map((key) => Number.parseInt(key, 10))
        )

        for (const key of Object.keys(bottomToTopStagedHeights)) {
            const physicalIndex = Number.parseInt(key, 10)
            if (!Number.isFinite(physicalIndex)) continue
            measuredIndices.add(physicalIndex)
        }

        return measuredIndices
    }

    const clearBottomToTopLockedBottomDrainSchedule = () => {
        if (bottomToTopLockedBottomDrainRafId !== null) {
            cancelAnimationFrame(bottomToTopLockedBottomDrainRafId)
            bottomToTopLockedBottomDrainRafId = null
        }
        bottomToTopLockedBottomDrainScheduled = false
    }

    const cancelBottomToTopVisibleMutationSync = () => {
        if (bottomToTopVisibleMutationRafId !== null) {
            cancelAnimationFrame(bottomToTopVisibleMutationRafId)
            bottomToTopVisibleMutationRafId = null
        }
    }

    const armBottomToTopLockedBottomDrainSettle = (
        frames = BOTTOM_TO_TOP_LOCKED_BOTTOM_DRAIN_SETTLE_FRAMES
    ) => {
        bottomToTopLockedBottomDrainSettleFramesRemaining = Math.max(
            bottomToTopLockedBottomDrainSettleFramesRemaining,
            frames
        )
    }

    // Keep offscreen measurements staged while locked to bottom. Draining them
    // live keeps the visible rows anchored, but it still rewrites scrollTop/max
    // on every batch and shows up as micro up/down motion in the viewport.
    const shouldDrainBottomToTopLockedBottomStaged = () => false

    const canDrainBottomToTopLockedBottomStaged = () =>
        shouldDrainBottomToTopLockedBottomStaged() &&
        useDedicatedBottomToTopEngine &&
        bottomToTopModeState === 'lockedBottom' &&
        !userHasScrolledAway &&
        !programmaticScrollInProgress &&
        !isScrolling &&
        bottomToTopMeasurementQueue.size === 0 &&
        bottomToTopBackfillRafId === null &&
        bottomToTopBackfillTimeoutId === null &&
        !bottomToTopPromotionScheduled &&
        bottomToTopStagedCount > 0

    const getBottomToTopLockedBottomDrainEntries = (
        window: BottomToTopWindow
    ): Array<{ index: number; height: number }> => {
        const sortedEntries = Object.entries(bottomToTopStagedHeights)
            .map(([key, value]) => ({
                index: Number.parseInt(key, 10),
                height: value
            }))
            .filter(
                (entry) =>
                    Number.isFinite(entry.index) &&
                    Number.isFinite(entry.height) &&
                    entry.height > 0 &&
                    entry.index >= 0 &&
                    entry.index < window.startPhysical
            )
            .sort((a, b) => b.index - a.index)

        const entries: Array<{ index: number; height: number }> = []
        let totalDeltaPx = 0

        for (const entry of sortedEntries) {
            const estimatedDeltaPx = Math.abs(entry.height - heightManager.itemHeight)
            if (entries.length > 0) {
                if (entries.length >= BOTTOM_TO_TOP_LOCKED_BOTTOM_DRAIN_MAX_ITEMS) break
                if (
                    totalDeltaPx + estimatedDeltaPx >
                    BOTTOM_TO_TOP_LOCKED_BOTTOM_DRAIN_MAX_DELTA_PX
                ) {
                    break
                }
            }

            entries.push(entry)
            totalDeltaPx += estimatedDeltaPx

            if (entries.length >= BOTTOM_TO_TOP_LOCKED_BOTTOM_DRAIN_MAX_ITEMS) {
                break
            }
        }

        return entries
    }

    const getBottomToTopPromotionEntries = (
        window: BottomToTopWindow,
        includeAll = false
    ): Array<{ index: number; height: number }> => {
        const startPhysical = includeAll ? 0 : Math.max(0, window.startPhysical - bufferSize)
        const endPhysical = includeAll
            ? items.length
            : Math.min(items.length, window.endPhysical + bufferSize)

        return Object.entries(bottomToTopStagedHeights)
            .map(([key, value]) => ({
                index: Number.parseInt(key, 10),
                height: value
            }))
            .filter(
                (entry) =>
                    Number.isFinite(entry.index) &&
                    Number.isFinite(entry.height) &&
                    entry.height > 0 &&
                    entry.index >= startPhysical &&
                    entry.index < endPhysical
            )
            .sort((a, b) => a.index - b.index)
    }

    const getBottomToTopViewportAnchorCandidate = () => {
        if (!heightManager.viewportElement) return null

        const viewportRect = heightManager.viewport.getBoundingClientRect()
        const candidateElements = Array.from(
            heightManager.viewport.querySelectorAll('[data-original-index]')
        ) as HTMLElement[]

        let anchorElement: HTMLElement | null = null
        let bestDistance = Infinity

        for (const element of candidateElements) {
            const rect = element.getBoundingClientRect()
            if (rect.bottom <= viewportRect.top || rect.top >= viewportRect.bottom) continue

            const distance = Math.abs(rect.top - viewportRect.top)
            if (distance < bestDistance) {
                bestDistance = distance
                anchorElement = element
            }
        }

        if (!anchorElement) return null

        return {
            anchorElement,
            viewportRect
        }
    }

    const captureBottomToTopPromotionAnchor = (): BottomToTopPromotionAnchor | null => {
        const anchorCandidate = getBottomToTopViewportAnchorCandidate()
        if (!anchorCandidate) return null

        const { anchorElement, viewportRect } = anchorCandidate

        const logicalIndex = Number.parseInt(anchorElement.dataset.originalIndex || '-1', 10)
        if (logicalIndex < 0) return null

        return {
            logicalIndex,
            offsetTop: anchorElement.getBoundingClientRect().top - viewportRect.top
        }
    }

    const reconcileBottomToTopLogicalAnchor = (logicalIndex: number, offsetTop: number) => {
        if (!heightManager.viewportElement) return
        if (logicalIndex < 0 || logicalIndex >= items.length) return

        const viewportRect = heightManager.viewport.getBoundingClientRect()
        const anchorElement = heightManager.viewport.querySelector(
            `[data-original-index="${logicalIndex}"]`
        ) as HTMLElement | null

        if (anchorElement) {
            const currentOffsetTop = anchorElement.getBoundingClientRect().top - viewportRect.top
            const delta = currentOffsetTop - offsetTop
            if (Math.abs(delta) > 0.5) {
                syncScrollTop(heightManager.viewport.scrollTop + delta)
            }
            return
        }

        const physicalIndex = getPhysicalIndexFromLogical(logicalIndex, items.length)
        const offsetToIndex = getScrollOffsetForIndex(
            heightManager.getHeightCache(),
            heightManager.itemHeight,
            physicalIndex,
            heightManager.getBlockSums()
        )
        const targetScrollTop = clampValue(
            Math.round(offsetToIndex - offsetTop),
            0,
            getViewportMaxScrollTop()
        )
        if (Math.abs(heightManager.viewport.scrollTop - targetScrollTop) > 0.5) {
            syncScrollTop(targetScrollTop, true)
        }
    }

    const reconcileBottomToTopPromotionAnchor = (anchor: BottomToTopPromotionAnchor | null) => {
        if (!anchor) return
        reconcileBottomToTopLogicalAnchor(anchor.logicalIndex, anchor.offsetTop)
    }

    const captureBottomToTopMutationAnchor = (
        previousItems: TItem[]
    ): BottomToTopMutationAnchor | null => {
        const anchorCandidate = getBottomToTopViewportAnchorCandidate()
        if (!anchorCandidate) return null

        const { anchorElement, viewportRect } = anchorCandidate
        const logicalIndex = Number.parseInt(anchorElement.dataset.originalIndex || '-1', 10)
        if (logicalIndex < 0 || logicalIndex >= previousItems.length) return null

        return {
            item: previousItems[logicalIndex],
            fallbackLogicalIndex: logicalIndex,
            offsetTop: anchorElement.getBoundingClientRect().top - viewportRect.top
        }
    }

    const reconcileBottomToTopMutationAnchor = (
        anchor: BottomToTopMutationAnchor | null,
        currentItems: TItem[]
    ) => {
        if (!anchor) return

        let logicalIndex = currentItems.indexOf(anchor.item)
        if (
            logicalIndex === -1 &&
            anchor.fallbackLogicalIndex >= 0 &&
            anchor.fallbackLogicalIndex < currentItems.length
        ) {
            logicalIndex = anchor.fallbackLogicalIndex
        }
        if (logicalIndex < 0) return

        reconcileBottomToTopLogicalAnchor(logicalIndex, anchor.offsetTop)
    }

    const remapBottomToTopMeasurementQueue = (
        nextLength: number,
        mutation: BottomToTopMutation
    ) => {
        if (!useDedicatedBottomToTopEngine || bottomToTopMeasurementQueue.size === 0) return

        const queuedIndices: Record<number, number> = {}
        for (const physicalIndex of bottomToTopMeasurementQueue) {
            queuedIndices[physicalIndex] = 1
        }

        const remappedQueuedIndices = remapPhysicalMeasurementsForMutation(
            queuedIndices,
            nextLength,
            mutation
        )

        bottomToTopMeasurementQueue.clear()
        for (const key of Object.keys(remappedQueuedIndices)) {
            const physicalIndex = Number.parseInt(key, 10)
            if (!Number.isFinite(physicalIndex)) continue
            bottomToTopMeasurementQueue.add(physicalIndex)
        }
    }

    const getBottomToTopMutationEstimatedScrollDelta = (mutation: BottomToTopMutation) => {
        if (mutation.kind === 'appendLogicalEnd') {
            return mutation.delta * heightManager.itemHeight
        }
        if (mutation.kind === 'removeLogicalEnd') {
            return mutation.delta * heightManager.itemHeight * -1
        }
        return 0
    }

    const promoteBottomToTopStagedMeasurementsForWindow = (
        window: BottomToTopWindow,
        { includeAll = false }: { includeAll?: boolean } = {}
    ) => {
        if (
            !useDedicatedBottomToTopEngine ||
            bottomToTopStagedCount === 0 ||
            bottomToTopPromotionScheduled
        ) {
            return
        }

        const heightCache = heightManager.getHeightCache()
        const entries = getBottomToTopPromotionEntries(window, includeAll)
            .map((entry) => ({
                index: entry.index,
                height: normalizeDedicatedMeasuredHeight(entry.height)
            }))
            .filter(
                (entry) =>
                    entry.height > 0 &&
                    !isDedicatedHeightWithinTolerance(heightCache[entry.index], entry.height)
            )
        if (entries.length === 0) return

        const maintainBottomLock = shouldMaintainBottomToTopBottomLock()
        const preserveAnchor = shouldPreserveBottomToTopAnchor()
        const anchor =
            !maintainBottomLock && preserveAnchor ? captureBottomToTopPromotionAnchor() : null

        bottomToTopPromotionScheduled = true

        for (const entry of entries) {
            deleteBottomToTopStagedHeight(entry.index)
        }
        heightManager.mergeMeasuredHeights(entries)

        tick().then(() => {
            if (!heightManager.viewportElement) {
                bottomToTopPromotionScheduled = false
                return
            }

            if (shouldMaintainBottomToTopBottomLock()) {
                armBottomToTopLockedBottomDrainSettle()
                syncScrollTop(getViewportMaxScrollTop(), true)
                scheduleBottomToTopLockedBottomDrain()
            } else if (anchor) {
                reconcileBottomToTopPromotionAnchor(anchor)
            }

            bottomToTopPromotionScheduled = false

            if (bottomToTopStagedCount === 0) return
            const nextWindow = getBottomToTopCurrentWindow()
            if (!shouldMaintainBottomToTopBottomLock()) {
                promoteBottomToTopStagedMeasurementsForWindow(nextWindow)
            }
        })
    }

    const queueBottomToTopMeasurements = (indices: number[]) => {
        if (!useDedicatedBottomToTopEngine) return
        const heightCache = heightManager.getHeightCache()

        for (const physicalIndex of indices) {
            if (physicalIndex < 0 || physicalIndex >= items.length) continue
            if (Number.isFinite(heightCache[physicalIndex])) continue
            if (hasBottomToTopStagedHeight(physicalIndex)) continue
            bottomToTopMeasurementQueue.add(physicalIndex)
        }
    }

    const clearBottomToTopBackfill = () => {
        if (bottomToTopBackfillTimeoutId !== null) {
            clearTimeout(bottomToTopBackfillTimeoutId)
            bottomToTopBackfillTimeoutId = null
        }
        if (bottomToTopBackfillRafId !== null) {
            cancelAnimationFrame(bottomToTopBackfillRafId)
            bottomToTopBackfillRafId = null
        }
    }

    const drainBottomToTopLockedBottomStagedChunk = () => {
        if (!canDrainBottomToTopLockedBottomStaged()) {
            bottomToTopLockedBottomDrainActive = false
            bottomToTopLockedBottomDrainScheduled = false
            return
        }

        const window = getBottomToTopCurrentWindow()
        const entries = getBottomToTopLockedBottomDrainEntries(window)
        if (entries.length === 0) {
            bottomToTopLockedBottomDrainActive = false
            bottomToTopLockedBottomDrainScheduled = false
            return
        }

        bottomToTopLockedBottomDrainScheduled = false
        bottomToTopLockedBottomDrainActive = true

        for (const entry of entries) {
            deleteBottomToTopStagedHeight(entry.index)
        }

        heightManager.mergeMeasuredHeights(entries)
        suppressBottomToTopScrollAway()

        tick().then(() => {
            if (
                heightManager.viewportElement &&
                bottomToTopModeState === 'lockedBottom' &&
                shouldMaintainBottomToTopBottomLock()
            ) {
                syncScrollTop(getViewportMaxScrollTop(), true)
            }

            bottomToTopLockedBottomDrainActive = false

            if (canDrainBottomToTopLockedBottomStaged()) {
                scheduleBottomToTopLockedBottomDrain()
            }
        })
    }

    const scheduleBottomToTopLockedBottomDrain = () => {
        if (
            !useDedicatedBottomToTopEngine ||
            !canDrainBottomToTopLockedBottomStaged() ||
            bottomToTopLockedBottomDrainRafId !== null ||
            bottomToTopLockedBottomDrainActive
        ) {
            return
        }

        bottomToTopLockedBottomDrainScheduled = true

        const step = () => {
            bottomToTopLockedBottomDrainRafId = null

            if (!canDrainBottomToTopLockedBottomStaged()) {
                bottomToTopLockedBottomDrainScheduled = false
                return
            }

            if (bottomToTopLockedBottomDrainSettleFramesRemaining > 0) {
                bottomToTopLockedBottomDrainSettleFramesRemaining = Math.max(
                    0,
                    bottomToTopLockedBottomDrainSettleFramesRemaining - 1
                )
                bottomToTopLockedBottomDrainRafId = requestAnimationFrame(step)
                return
            }

            drainBottomToTopLockedBottomStagedChunk()
        }

        bottomToTopLockedBottomDrainRafId = requestAnimationFrame(step)
    }

    const flushBottomToTopVisibleMutation = () => {
        bottomToTopVisibleMutationRafId = null

        if (!useDedicatedBottomToTopEngine || !heightManager.viewportElement) return

        const maintainBottomLock = shouldMaintainBottomToTopBottomLock()
        if (maintainBottomLock) {
            armBottomToTopLockedBottomDrainSettle()
            suppressBottomToTopScrollAway()
            syncScrollTop(getViewportMaxScrollTop(), true)
        }

        const didMeasureVisibleItems = measureBottomToTopVisibleItemsImmediately()
        const window = getBottomToTopCurrentWindow()

        if (shouldMaintainBottomToTopBottomLock()) {
            suppressBottomToTopScrollAway()
            syncScrollTop(getViewportMaxScrollTop(), true)

            if (bottomToTopStagedCount > 0) {
                promoteBottomToTopStagedMeasurementsForWindow(window)
                scheduleBottomToTopLockedBottomDrain()
            } else {
                reconcileBottomToTopToBottom(didMeasureVisibleItems ? 4 : 2)
            }
            return
        }

        if (bottomToTopStagedCount > 0) {
            promoteBottomToTopStagedMeasurementsForWindow(window)
        }
    }

    const scheduleBottomToTopVisibleMutationSync = () => {
        if (!useDedicatedBottomToTopEngine || !heightManager.viewportElement) return

        if (shouldMaintainBottomToTopBottomLock()) {
            armBottomToTopLockedBottomDrainSettle()
            suppressBottomToTopScrollAway()
            syncScrollTop(getViewportMaxScrollTop(), true)
        }

        if (bottomToTopVisibleMutationRafId !== null) return
        bottomToTopVisibleMutationRafId = requestAnimationFrame(flushBottomToTopVisibleMutation)
    }

    const cancelBottomToTopReconcile = () => {
        if (bottomToTopReconcileRafId !== null) {
            cancelAnimationFrame(bottomToTopReconcileRafId)
            bottomToTopReconcileRafId = null
        }
        bottomToTopMaintainingBottom = false
    }

    const commitBottomToTopLiveMeasurements = (
        entries: Array<{ index: number; height: number }>,
        {
            maintainBottomLock = false,
            preserveAnchor = false
        }: { maintainBottomLock?: boolean; preserveAnchor?: boolean } = {}
    ) => {
        if (entries.length === 0) return false

        const heightCache = heightManager.getHeightCache()
        // trunk-ignore(eslint/svelte/prefer-svelte-reactivity): ephemeral local variable, not reactive state
        const normalizedEntriesByIndex = new Map<number, number>()

        for (const entry of entries) {
            if (entry.index < 0 || entry.index >= items.length) continue

            const normalizedHeight = normalizeDedicatedMeasuredHeight(entry.height)
            if (normalizedHeight <= 0) continue
            if (isDedicatedHeightWithinTolerance(heightCache[entry.index], normalizedHeight)) {
                deleteBottomToTopStagedHeight(entry.index)
                continue
            }

            normalizedEntriesByIndex.set(entry.index, normalizedHeight)
        }

        const normalizedEntries = Array.from(normalizedEntriesByIndex, ([index, height]) => ({
            index,
            height
        }))
        if (normalizedEntries.length === 0) return false

        const maintainBottomLockNow = maintainBottomLock && shouldMaintainBottomToTopBottomLock()
        const preserveAnchorNow = preserveAnchor && shouldPreserveBottomToTopAnchor()
        const anchor = preserveAnchorNow ? captureBottomToTopPromotionAnchor() : null

        for (const entry of normalizedEntries) {
            deleteBottomToTopStagedHeight(entry.index)
        }

        heightManager.mergeMeasuredHeights(normalizedEntries)

        if (!heightManager.viewportElement) return true

        if (maintainBottomLockNow) {
            armBottomToTopLockedBottomDrainSettle()
            suppressBottomToTopScrollAway()
            tick().then(() => {
                if (!heightManager.viewportElement || !shouldMaintainBottomToTopBottomLock()) return
                syncScrollTop(getViewportMaxScrollTop(), true)
                scheduleBottomToTopLockedBottomDrain()
            })
            reconcileBottomToTopToBottom(2)
            return true
        }

        if (anchor) {
            tick().then(() => {
                if (!heightManager.viewportElement || shouldMaintainBottomToTopBottomLock()) return
                reconcileBottomToTopPromotionAnchor(anchor)
            })
        }

        return true
    }

    const commitBottomToTopLiveMeasurement = (
        physicalIndex: number,
        measuredHeight: number,
        {
            maintainBottomLock = false,
            preserveAnchor = false
        }: { maintainBottomLock?: boolean; preserveAnchor?: boolean } = {}
    ) =>
        commitBottomToTopLiveMeasurements([{ index: physicalIndex, height: measuredHeight }], {
            maintainBottomLock,
            preserveAnchor
        })

    const measureBottomToTopVisibleItemsImmediately = () => {
        if (!useDedicatedBottomToTopEngine) return false

        const pendingEntries: Array<{ index: number; height: number }> = []
        for (const element of itemElements) {
            if (!element) continue

            const logicalIndex = Number.parseInt(element.dataset.originalIndex || '-1', 10)
            if (logicalIndex < 0) continue

            const physicalIndex = getPhysicalIndexFromLogical(logicalIndex, items.length)
            const measuredHeight = normalizeDedicatedMeasuredHeight(
                element.getBoundingClientRect().height
            )
            const cachedHeight = heightManager.getHeightCache()[physicalIndex]

            if (measuredHeight <= 0) continue
            if (isDedicatedHeightWithinTolerance(cachedHeight, measuredHeight)) {
                deleteBottomToTopStagedHeight(physicalIndex)
                bottomToTopMeasurementQueue.delete(physicalIndex)
                continue
            }

            pendingEntries.push({ index: physicalIndex, height: measuredHeight })
            bottomToTopMeasurementQueue.delete(physicalIndex)
        }

        return commitBottomToTopLiveMeasurements(pendingEntries, {
            maintainBottomLock: shouldMaintainBottomToTopBottomLock(),
            preserveAnchor: shouldPreserveBottomToTopAnchor()
        })
    }

    const handleBottomToTopMeasurement = (physicalIndex: number, measuredHeight: number) => {
        if (!useDedicatedBottomToTopEngine) return
        if (physicalIndex < 0 || physicalIndex >= items.length) return

        const normalizedHeight = normalizeDedicatedMeasuredHeight(measuredHeight)
        if (normalizedHeight <= 0) return

        const cachedHeight = heightManager.getHeightCache()[physicalIndex]
        const stagedHeight = bottomToTopStagedHeights[physicalIndex]

        if (isDedicatedHeightWithinTolerance(cachedHeight, normalizedHeight)) {
            deleteBottomToTopStagedHeight(physicalIndex)
            bottomToTopMeasurementQueue.delete(physicalIndex)
            return
        }

        if (
            !Number.isFinite(cachedHeight) &&
            isDedicatedHeightWithinTolerance(stagedHeight, normalizedHeight)
        ) {
            bottomToTopMeasurementQueue.delete(physicalIndex)
            return
        }

        bottomToTopMeasurementQueue.delete(physicalIndex)

        const window = getBottomToTopCurrentWindow()
        const isInsideWindow =
            physicalIndex >= window.startPhysical && physicalIndex < window.endPhysical

        if (bottomToTopModeState === 'lockedBottom' && shouldMaintainBottomToTopBottomLock()) {
            if (!isInsideWindow) {
                setBottomToTopStagedHeight(physicalIndex, normalizedHeight)
                scheduleBottomToTopLockedBottomDrain()
                return
            }

            commitBottomToTopLiveMeasurement(physicalIndex, normalizedHeight, {
                maintainBottomLock: true
            })
            return
        }

        if (shouldMaintainBottomToTopBottomLock()) {
            commitBottomToTopLiveMeasurement(physicalIndex, normalizedHeight, {
                maintainBottomLock: true
            })
            return
        }

        if (userHasScrolledAway && !isInsideWindow) {
            setBottomToTopStagedHeight(physicalIndex, normalizedHeight)
            return
        }

        commitBottomToTopLiveMeasurement(physicalIndex, normalizedHeight, {
            preserveAnchor: shouldPreserveBottomToTopAnchor()
        })
    }

    const reconcileBottomToTopToBottom = (frames = 3) => {
        if (!useDedicatedBottomToTopEngine || !heightManager.viewportElement) return
        if (userHasScrolledAway) {
            bottomToTopMaintainingBottom = false
            return
        }

        // When content is shorter than viewport, flexbox handles positioning — no scroll reconcile needed
        if (totalHeight < (height || 0)) {
            if (bottomToTopModeState === 'initializing') {
                bottomToTopModeState = bottomToTopStateMachine.enterLockedBottom()
                userHasScrolledAway = false
                bottomToTopScrollComplete = true
            }
            bottomToTopMaintainingBottom = false
            return
        }

        cancelBottomToTopReconcile()
        bottomToTopMaintainingBottom = true
        let remainingFrames = Math.max(1, frames)
        let stableFrames = 0

        const step = () => {
            bottomToTopReconcileRafId = null

            if (
                !heightManager.viewportElement ||
                programmaticScrollInProgress ||
                userHasScrolledAway
            ) {
                bottomToTopMaintainingBottom = false
                return
            }

            const domMaxScrollTop = getRoundedViewportMaxScrollTop()
            const domGap = getRoundedGapFromBottomPx()
            if (domGap > 1) {
                syncScrollTop(domMaxScrollTop, true)
            }

            if (bottomToTopModeState === 'lockedBottom') {
                // Once the dedicated engine is already locked to bottom, exact bottom wins.
                // Applying an additional anchor delta here creates a second writer fighting
                // the max-scroll snap and shows up as visible bounce in Firefox.
                if (domGap <= 1) {
                    stableFrames += 1
                } else {
                    stableFrames = 0
                }
            } else {
                const delta = getBottomAnchorDelta()
                if (delta !== null && Math.abs(delta) > 1) {
                    syncScrollTop(
                        clampValue(getRoundedViewportScrollTop() + delta, 0, domMaxScrollTop),
                        true
                    )
                    stableFrames = 0
                } else if (domGap <= 1) {
                    stableFrames += 1
                }
            }

            remainingFrames -= 1

            // In lockedBottom, keep reconciling as long as there's a gap
            // (backfill measurements continuously change scrollHeight)
            if (domGap > 1 && bottomToTopModeState === 'lockedBottom') {
                remainingFrames = Math.max(remainingFrames, 2)
                stableFrames = 0
            }

            if (stableFrames >= 2 || remainingFrames <= 0) {
                if (bottomToTopModeState === 'initializing') {
                    bottomToTopModeState = bottomToTopStateMachine.enterLockedBottom()
                    userHasScrolledAway = false
                    bottomToTopScrollComplete = true
                }
                bottomToTopMaintainingBottom = false
                return
            }

            bottomToTopReconcileRafId = requestAnimationFrame(step)
        }

        bottomToTopReconcileRafId = requestAnimationFrame(step)
    }

    const scheduleBottomToTopBackfill = () => {
        if (
            !useDedicatedBottomToTopEngine ||
            bottomToTopBackfillRafId !== null ||
            bottomToTopBackfillTimeoutId !== null ||
            bottomToTopModeState === 'initializing' ||
            isScrolling ||
            !heightManager.viewportElement
        ) {
            return
        }

        bottomToTopBackfillTimeoutId = window.setTimeout(() => {
            bottomToTopBackfillTimeoutId = null

            bottomToTopBackfillRafId = requestAnimationFrame(() => {
                bottomToTopBackfillRafId = null

                const measuredIndices = new Set(getBottomToTopMeasuredIndices())
                const backfillIndices = buildBottomToTopBackfillIndices({
                    window: bottomToTopPhysicalWindow,
                    totalItems: items.length,
                    measuredIndices,
                    limit: 4
                })

                queueBottomToTopMeasurements(backfillIndices)
            })
        }, BOTTOM_TO_TOP_BACKFILL_DELAY_MS)
    }

    const initializeBottomToTopWindow = () => {
        if (!useDedicatedBottomToTopEngine || !heightManager.isReady) return

        const nextHeight = Math.max(
            0,
            Math.round(
                heightManager.viewport.clientHeight ||
                    heightManager.container.getBoundingClientRect().height
            )
        )
        if (nextHeight > 0) {
            height = nextHeight
        }

        if (!items.length) {
            if (!heightManager.initialized) {
                heightManager.initialized = true
            }
            bottomToTopModeState = bottomToTopStateMachine.enterLockedBottom()
            bottomToTopScrollComplete = true
            return
        }

        bottomToTopInitWindow = buildBottomToTopEstimatedTailWindow({
            totalItems: items.length,
            estimatedItemHeight: heightManager.itemHeight,
            viewportHeight: nextHeight,
            overscan: bufferSize
        })

        const indices: number[] = []
        for (
            let physicalIndex = bottomToTopInitWindow.startPhysical;
            physicalIndex < bottomToTopInitWindow.endPhysical;
            physicalIndex += 1
        ) {
            indices.push(physicalIndex)
        }
        queueBottomToTopMeasurements(indices)

        tick().then(() =>
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    if (!heightManager.viewportElement) return
                    syncScrollTop(getViewportMaxScrollTop(), true)
                    if (measureBottomToTopVisibleItemsImmediately()) {
                        syncScrollTop(getViewportMaxScrollTop(), true)
                    }
                    reconcileBottomToTopToBottom(5)
                })
            )
        )
    }

    $effect(() => {
        if (!useDedicatedBottomToTopEngine || !BROWSER || !heightManager.isReady) return
        if (bottomToTopModeState !== 'initializing') return

        untrack(() => initializeBottomToTopWindow())
    })

    $effect(() => {
        if (!useDedicatedBottomToTopEngine || !BROWSER || !heightManager.isReady || !items.length)
            return

        void displayItems
        const window = getBottomToTopCurrentWindow()
        const indices: number[] = []
        for (
            let physicalIndex = window.startPhysical;
            physicalIndex < window.endPhysical;
            physicalIndex += 1
        ) {
            indices.push(physicalIndex)
        }
        untrack(() => {
            queueBottomToTopMeasurements(indices)
            const didMeasureVisibleItems = measureBottomToTopVisibleItemsImmediately()

            if (didMeasureVisibleItems && shouldMaintainBottomToTopBottomLock()) {
                suppressBottomToTopScrollAway()
                syncScrollTop(getViewportMaxScrollTop(), true)
                reconcileBottomToTopToBottom(4)
            }

            if (bottomToTopStagedCount > 0) {
                if (shouldMaintainBottomToTopBottomLock()) {
                    promoteBottomToTopStagedMeasurementsForWindow(window)
                    scheduleBottomToTopLockedBottomDrain()
                } else {
                    promoteBottomToTopStagedMeasurementsForWindow(window)
                }
            }
        })
    })

    $effect(() => {
        if (!useDedicatedBottomToTopEngine || !BROWSER) return

        const currentState = bottomToTopModeState
        const previousState = previousBottomToTopModeState
        previousBottomToTopModeState = currentState

        if (currentState !== 'lockedBottom' || previousState === 'lockedBottom') return

        tick().then(() =>
            requestAnimationFrame(() => {
                if (
                    !heightManager.viewportElement ||
                    bottomToTopModeState !== 'lockedBottom' ||
                    !shouldMaintainBottomToTopBottomLock() ||
                    programmaticScrollInProgress
                ) {
                    return
                }

                suppressBottomToTopScrollAway(64)
                syncScrollTop(getViewportMaxScrollTop(), true)
                const didMeasureVisibleItems = measureBottomToTopVisibleItemsImmediately()
                if (didMeasureVisibleItems) {
                    syncScrollTop(getViewportMaxScrollTop(), true)
                }
                if (bottomToTopStagedCount > 0) {
                    scheduleBottomToTopLockedBottomDrain()
                }
            })
        )
    })

    $effect(() => {
        if (
            !BROWSER ||
            !useDedicatedBottomToTopEngine ||
            bottomToTopModeState !== 'lockedBottom' ||
            !itemsWrapperElement
        ) {
            cancelBottomToTopVisibleMutationSync()
            bottomToTopVisibleMutationObserver?.disconnect()
            bottomToTopVisibleMutationObserver = null
            return
        }

        bottomToTopVisibleMutationObserver?.disconnect()

        // Visible content mutations can land before ResizeObserver delivers the new
        // height. While locked to bottom we snap to the DOM bottom immediately, then
        // measure visible rows on the next frame so streaming/demo pages do not need
        // their own follow-bottom loop.
        const observer = new MutationObserver((records) => {
            if (
                !records.some((record) => {
                    if (record.type === 'characterData') {
                        return true
                    }

                    if (record.type !== 'childList') {
                        return false
                    }

                    const targetElement =
                        record.target instanceof Element
                            ? record.target
                            : record.target.parentElement

                    return Boolean(targetElement?.closest('[data-original-index]'))
                })
            ) {
                return
            }

            scheduleBottomToTopVisibleMutationSync()
        })

        observer.observe(itemsWrapperElement, {
            childList: true,
            characterData: true,
            subtree: true
        })

        bottomToTopVisibleMutationObserver = observer

        return () => {
            if (bottomToTopVisibleMutationObserver === observer) {
                bottomToTopVisibleMutationObserver = null
            }
            observer.disconnect()
            cancelBottomToTopVisibleMutationSync()
        }
    })

    $effect(() => {
        if (!useDedicatedBottomToTopEngine || !BROWSER || !heightManager.isReady) return
        if (bottomToTopModeState !== 'initializing') return
        if (!items.length) return

        const heightCache = heightManager.getHeightCache()
        for (
            let physicalIndex = bottomToTopInitWindow.startPhysical;
            physicalIndex < bottomToTopInitWindow.endPhysical;
            physicalIndex += 1
        ) {
            if (!Number.isFinite(heightCache[physicalIndex])) {
                return
            }
        }

        if (!heightManager.initialized) {
            heightManager.initialized = true
        }
        tick().then(() =>
            requestAnimationFrame(() => {
                syncScrollTop(getViewportMaxScrollTop(), true)
                reconcileBottomToTopToBottom(5)
            })
        )
    })

    $effect(() => {
        if (!useDedicatedBottomToTopEngine || !BROWSER || !heightManager.initialized) return

        if (isScrolling || bottomToTopMeasurementQueue.size > 0) {
            clearBottomToTopBackfill()
            clearBottomToTopLockedBottomDrainSchedule()
            return
        }

        if (
            bottomToTopModeState === 'lockedBottom' &&
            !userHasScrolledAway &&
            !programmaticScrollInProgress &&
            bottomToTopStagedCount > 0
        ) {
            clearBottomToTopBackfill()
            scheduleBottomToTopLockedBottomDrain()
            return
        }

        scheduleBottomToTopBackfill()
    })

    $effect(() => {
        if (!useDedicatedBottomToTopEngine || !BROWSER || !heightManager.initialized) return
        if (bottomToTopStagedCount === 0) return

        const window = getBottomToTopCurrentWindow()
        untrack(() => {
            if (shouldMaintainBottomToTopBottomLock()) {
                promoteBottomToTopStagedMeasurementsForWindow(window)
                scheduleBottomToTopLockedBottomDrain()
            } else {
                promoteBottomToTopStagedMeasurementsForWindow(window)
            }
        })
    })

    $effect(() => {
        if (!useDedicatedBottomToTopEngine || !BROWSER || !heightManager.initialized) {
            clearBottomToTopLockedBottomDrainSchedule()
            return
        }

        if (!canDrainBottomToTopLockedBottomStaged()) {
            clearBottomToTopLockedBottomDrainSchedule()
            return
        }

        scheduleBottomToTopLockedBottomDrain()
    })

    $effect(() => {
        if (!useDedicatedBottomToTopEngine) return
        const currentItems = items
        const currentItemsLength = items.length

        untrack(() => {
            const previousItems = bottomToTopPreviousItems
            const maintainBottomLock = shouldMaintainBottomToTopBottomLock()
            const mutationAnchor = maintainBottomLock
                ? null
                : captureBottomToTopMutationAnchor(previousItems)
            clearBottomToTopLockedBottomDrainSchedule()

            if (previousItems.length === currentItemsLength) {
                bottomToTopPreviousItems = snapshotBottomToTopItems(currentItems)
                return
            }

            const mutation = detectBottomToTopMutation(previousItems, currentItems)

            const wasLockedBottom =
                bottomToTopModeState === 'lockedBottom' || bottomToTopModeState === 'initializing'

            if (mutation.kind === 'replace') {
                heightManager.updateItemLength(currentItemsLength)
                heightManager.replaceMeasurements({})
                bottomToTopMeasurementQueue.clear()
                clearBottomToTopStagedHeights()
                bottomToTopPreviousItems = snapshotBottomToTopItems(currentItems)
                bottomToTopModeState = bottomToTopStateMachine.enterInitializing()
                bottomToTopScrollComplete = false
                initializeBottomToTopWindow()
                return
            }

            const remappedMeasurements = remapPhysicalMeasurementsForMutation(
                heightManager.getHeightCache(),
                currentItemsLength,
                mutation
            )
            const remappedStagedMeasurements = remapPhysicalMeasurementsForMutation(
                bottomToTopStagedHeights,
                currentItemsLength,
                mutation
            )
            heightManager.updateItemLength(currentItemsLength)
            heightManager.replaceMeasurements(remappedMeasurements)
            replaceBottomToTopStagedHeights(remappedStagedMeasurements)
            remapBottomToTopMeasurementQueue(currentItemsLength, mutation)

            if (!maintainBottomLock) {
                const estimatedMutationDelta = getBottomToTopMutationEstimatedScrollDelta(mutation)
                if (estimatedMutationDelta !== 0) {
                    const viewportHeight = heightManager.viewportElement?.clientHeight ?? height
                    heightManager.scrollTop = clampValue(
                        heightManager.scrollTop + estimatedMutationDelta,
                        0,
                        Math.max(0, heightManager.totalHeight - viewportHeight)
                    )
                }
            }

            const insertedIndices: number[] = []
            if (mutation.kind === 'prependLogicalStart') {
                for (
                    let index = currentItemsLength - mutation.delta;
                    index < currentItemsLength;
                    index += 1
                ) {
                    insertedIndices.push(index)
                }
            } else if (mutation.kind === 'appendLogicalEnd') {
                for (let index = 0; index < mutation.delta; index += 1) {
                    insertedIndices.push(index)
                }
            }
            queueBottomToTopMeasurements(insertedIndices)

            bottomToTopPreviousItems = snapshotBottomToTopItems(currentItems)

            tick().then(() => {
                if (!heightManager.viewportElement) return

                if (wasLockedBottom && shouldMaintainBottomToTopBottomLock()) {
                    armBottomToTopLockedBottomDrainSettle()
                    suppressBottomToTopScrollAway()
                    syncScrollTop(getViewportMaxScrollTop(), true)
                    const didMeasureVisibleItems = measureBottomToTopVisibleItemsImmediately()
                    if (didMeasureVisibleItems) {
                        syncScrollTop(getViewportMaxScrollTop(), true)
                    }
                    if (bottomToTopStagedCount > 0) {
                        promoteBottomToTopStagedMeasurementsForWindow(getBottomToTopCurrentWindow())
                        scheduleBottomToTopLockedBottomDrain()
                    }
                    reconcileBottomToTopToBottom(4)
                } else if (mutationAnchor) {
                    reconcileBottomToTopMutationAnchor(mutationAnchor, currentItems)
                }
            })
        })
    })

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

    $effect(() => {
        if (
            BROWSER &&
            heightManager.initialized &&
            mode === 'bottomToTop' &&
            !useDedicatedBottomToTopEngine &&
            heightManager.viewportElement
        ) {
            const targetScrollTop = Math.max(0, totalHeight - height)
            const currentScrollTop = heightManager.viewport.scrollTop
            const scrollDifference = Math.abs(currentScrollTop - targetScrollTop)

            // Only correct scroll if:
            // 1. Item height changed significantly (not just user scrolling)
            // 2. User hasn't intentionally scrolled away from bottom
            // 3. We're significantly off target
            // 4. We're not at the bottom (where height changes should be handled more carefully)
            const heightChanged = Math.abs(heightManager.averageHeight - lastCalculatedHeight) > 1
            const maxScrollTop = Math.max(0, totalHeight - height)

            // In bottomToTop mode, we're "at bottom" when scroll is at max position
            const isAtBottom =
                Math.abs(currentScrollTop - maxScrollTop) < heightManager.averageHeight
            const shouldCorrect =
                heightChanged &&
                !userHasScrolledAway &&
                !isAtBottom && // Don't apply aggressive correction when at bottom
                !isScrolling && // Skip aggressive corrections during active scroll
                !programmaticScrollInProgress && // Don't interfere with programmatic scrolls
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

    $effect(() => {
        if (
            !BROWSER ||
            !pendingBottomPin ||
            mode !== 'bottomToTop' ||
            useDedicatedBottomToTopEngine ||
            !heightManager.initialized ||
            !heightManager.viewportElement
        ) {
            return
        }

        const nearBottom = isViewportNearBottom()
        if (nearBottom) {
            userHasScrolledAway = false
        }

        if (userHasScrolledAway && !nearBottom) {
            pendingBottomPin = false
            return
        }

        if (programmaticScrollInProgress || heightManager.isDynamicUpdateInProgress) {
            return
        }

        const maxScrollTop = getViewportMaxScrollTop()
        const gap = maxScrollTop - heightManager.viewport.scrollTop

        if (gap > 2) {
            syncScrollTop(maxScrollTop, true)
            return
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
            !useDedicatedBottomToTopEngine &&
            heightManager.isReady &&
            lastItemsLength > 0
        ) {
            const itemsAdded = currentItemsLength - lastItemsLength

            if (itemsAdded !== 0) {
                // Capture all reactive values immediately to prevent re-triggering
                const currentScrollTop = heightManager.viewport.scrollTop
                const currentCalculatedItemHeight = heightManager.averageHeight
                const currentHeight = height
                const currentTotalHeight = totalHeight
                const prevTotalHeight =
                    lastTotalHeightObserved ||
                    currentTotalHeight - itemsAdded * currentCalculatedItemHeight
                const prevMaxScrollTop = Math.max(0, prevTotalHeight - currentHeight)
                const nextMaxScrollTop = Math.max(0, currentTotalHeight - currentHeight)
                const deltaMax = nextMaxScrollTop - prevMaxScrollTop
                const shouldStickToBottom = !userHasScrolledAway || isViewportNearBottom()
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
                    shouldStickToBottom,
                    averageItemHeight: currentCalculatedItemHeight
                })

                // Maintain visual position for ALL cases by advancing scrollTop by deltaMax.
                // If near the bottom, this naturally pins to the new max; otherwise it preserves the current content.
                programmaticScrollInProgress = true
                if (shouldStickToBottom) {
                    scheduleBottomPin(BOTTOM_PIN_FRAMES)
                }
                void heightManager.runDynamicUpdate(() => {
                    const newScrollTop = shouldStickToBottom
                        ? getViewportMaxScrollTop()
                        : clampValue(currentScrollTop + deltaMax, 0, nextMaxScrollTop)
                    syncScrollTop(newScrollTop)
                    log('[SVL] items-length-change:applied', {
                        instanceId,
                        previousScrollTop: currentScrollTop,
                        appliedScrollTop: newScrollTop,
                        prevMaxScrollTop,
                        nextMaxScrollTop,
                        deltaMax,
                        shouldStickToBottom
                    })

                    if (shouldStickToBottom && itemsAdded > 0) {
                        flushSync(() => {
                            const didMeasureVisibleItems = measureVisibleItemsImmediately()
                            if (didMeasureVisibleItems) {
                                const exactMaxScrollTop = Math.max(0, totalHeight - height)
                                syncScrollTop(exactMaxScrollTop, true)
                                log('[SVL] items-length-change:sync-measurement-correction', {
                                    instanceId,
                                    exactMaxScrollTop
                                })
                            }
                        })

                        scheduleBottomLockGeometryReconcile()
                    }

                    // We are explicitly managing position; consider this a programmatic action.
                    // Do not flip userHasScrolledAway here; it should reflect user intent only.

                    // Reconcile on next frame in case measured heights adjust totals
                    requestAnimationFrame(() => {
                        const beforeReconcileScrollTop = heightManager.viewport.scrollTop
                        const reconciledNextMax = clampValue(totalHeight - height, 0, Infinity)
                        const reconciledDeltaMaxChange = reconciledNextMax - nextMaxScrollTop
                        // Desired position is to maintain distance-from-end; equivalently keep (max - scrollTop) constant.
                        const desiredScrollTop = shouldStickToBottom
                            ? getViewportMaxScrollTop()
                            : clampValue(
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
                        if (shouldStickToBottom) {
                            scheduleBottomPin(BOTTOM_PIN_FRAMES)
                        }
                    })
                })
            }
        }

        lastItemsLength = currentItemsLength
        // Update last observed total height at the end of the effect
        lastTotalHeightObserved = totalHeight
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
     * const range = visibleItems
     * console.info(`Rendering items from ${range.start} to ${range.end}`)
     * ```
     *
     * @returns {SvelteVirtualListPreviousVisibleRange} Object containing start and end indices of visible items
     */
    const visibleItems = $derived.by((): SvelteVirtualListPreviousVisibleRange => {
        if (!items.length) return { start: 0, end: 0 } as SvelteVirtualListPreviousVisibleRange

        if (useDedicatedBottomToTopEngine) {
            lastVisibleRange = bottomToTopLogicalVisibleRange
            return bottomToTopLogicalVisibleRange
        }

        const viewportHeight = height || 0

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

        lastVisibleRange = calculateVisibleRange({
            scrollTop: heightManager.scrollTop,
            viewportHeight,
            itemHeight: heightManager.averageHeight,
            totalItems: items.length,
            bufferSize,
            mode,
            totalContentHeight: totalHeight,
            heightCache: heightManager.getHeightCache(),
            blockSums: heightManager.getBlockSums()
        })

        return lastVisibleRange
    })

    /**
     * Computed content height for the virtual list.
     * Uses the maximum of container height and total content height to ensure
     * proper scrolling behavior.
     *
     * In bottomToTop mode during active scroll, contentHeight is "ratcheted" —
     * it can grow but never shrink. This prevents a feedback loop where
     * averageHeight oscillation causes scrollHeight to bounce, triggering
     * browser scrollTop adjustments that fire new scroll events.
     * When scrolling stops (isScrolling goes false), it snaps to the true value.
     */
    let stabilizedContentHeight = 0

    const contentHeight = $derived.by(() => {
        if (useDedicatedBottomToTopEngine) {
            return Math.max(height, totalHeight)
        }

        const raw = Math.max(height, totalHeight)
        stabilizedContentHeight = raw
        return stabilizedContentHeight
    })

    /**
     * Computed transform Y value for positioning the visible items.
     * Extracted from inline IIFE for better performance and readability.
     */
    const transformY = $derived.by(() => {
        if (useDedicatedBottomToTopEngine) {
            return 0
        }

        const viewportHeight = height || measuredFallbackHeight || 0
        const visibleRange = visibleItems

        // Avoid synchronous DOM reads here; fall back once if height is 0
        const effectiveHeight = viewportHeight === 0 ? 400 : viewportHeight
        return Math.round(
            calculateTransformY(
                mode,
                items.length,
                visibleRange.end,
                visibleRange.start,
                heightManager.averageHeight,
                effectiveHeight,
                totalHeight,
                heightManager.getHeightCache(),
                measuredFallbackHeight
            )
        )
    })

    const displayItems = $derived.by(() => {
        const visibleRange = visibleItems
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

        if (useDedicatedBottomToTopEngine) {
            isScrolling = true
            const bottomLockTolerance = getBottomToTopBottomLockTolerancePx()
            const currentScrollTop = heightManager.viewport.scrollTop
            const gapFromBottom = getRoundedGapFromBottomPx()
            const previousScrollTop = lastScrollTopSnapshot

            heightManager.scrollTop = currentScrollTop
            lastScrollTopSnapshot = currentScrollTop

            // Capture scroll-away intent immediately so live measurements cannot
            // observe a stale "locked bottom" state and snap the viewport back down.
            if (gapFromBottom > bottomLockTolerance) {
                if (shouldForceDedicatedBottomToTopScrollAway(gapFromBottom)) {
                    userHasScrolledAway = true
                    cancelBottomToTopReconcile()
                } else if (
                    shouldIgnoreDedicatedBottomToTopScrollAway(currentScrollTop, previousScrollTop)
                ) {
                    userHasScrolledAway = false
                    reconcileBottomToTopToBottom(4)
                } else {
                    userHasScrolledAway = true
                    cancelBottomToTopReconcile()
                }
            } else if (bottomToTopMaintainingBottom) {
                userHasScrolledAway = false
            }

            if (scrollIdleTimer) {
                clearTimeout(scrollIdleTimer)
                scrollIdleTimer = null
            }
            scrollIdleTimer = window.setTimeout(() => {
                isScrolling = false
                if (isViewportNearBottom(bottomLockTolerance)) {
                    scheduleBottomToTopBackfill()
                }
            }, SCROLL_IDLE_DELAY_MS)

            rafSchedule(() => {
                const current = heightManager.viewport.scrollTop
                const previous = previousScrollTop
                heightManager.scrollTop = current
                lastScrollTopSnapshot = current

                if (programmaticScrollInProgress) {
                    updateDebugTailDistance()
                    return
                }

                // If reconcile is active but user initiated a scroll, cancel it
                if (bottomToTopMaintainingBottom) {
                    const gapFromBottom = getRoundedGapFromBottomPx()
                    if (gapFromBottom > bottomLockTolerance) {
                        if (shouldForceDedicatedBottomToTopScrollAway(gapFromBottom)) {
                            cancelBottomToTopReconcile()
                            userHasScrolledAway = true
                            updateDebugTailDistance()
                            return
                        }

                        if (shouldIgnoreDedicatedBottomToTopScrollAway(current, previous)) {
                            userHasScrolledAway = false
                            reconcileBottomToTopToBottom(4)
                            updateDebugTailDistance()
                            return
                        }

                        cancelBottomToTopReconcile()
                        userHasScrolledAway = true
                        updateDebugTailDistance()
                        return
                    }
                    if (bottomToTopStagedCount > 0) {
                        promoteBottomToTopStagedMeasurementsForWindow(getBottomToTopCurrentWindow())
                        scheduleBottomToTopLockedBottomDrain()
                    }
                    updateDebugTailDistance()
                    return
                }

                const gapFromBottom = getRoundedGapFromBottomPx()
                userHasScrolledAway =
                    gapFromBottom > bottomLockTolerance &&
                    (shouldForceDedicatedBottomToTopScrollAway(gapFromBottom) ||
                        !shouldIgnoreDedicatedBottomToTopScrollAway(current, previous))

                if (!userHasScrolledAway) {
                    if (bottomToTopStagedCount > 0) {
                        promoteBottomToTopStagedMeasurementsForWindow(getBottomToTopCurrentWindow())
                        scheduleBottomToTopLockedBottomDrain()
                    } else {
                        reconcileBottomToTopToBottom(2)
                    }
                } else if (bottomToTopStagedCount > 0) {
                    promoteBottomToTopStagedMeasurementsForWindow(getBottomToTopCurrentWindow())
                }

                updateDebugTailDistance()
            })
            return
        }

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
        }, SCROLL_IDLE_DELAY_MS)

        rafSchedule(() => {
            const current = heightManager.viewport.scrollTop
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
                const vr = visibleItems
                log('[SVL] scroll', {
                    mode,
                    scrollTop: heightManager.scrollTop,
                    height,
                    totalHeight: totalHeight,
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
        if (useDedicatedBottomToTopEngine) {
            if (!heightManager.isReady) return

            const measuredHeight =
                heightManager.viewport.clientHeight ||
                heightManager.container.getBoundingClientRect().height
            if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
                height = measuredHeight
            }

            if (bottomToTopModeState === 'initializing' || !heightManager.initialized) {
                initializeBottomToTopWindow()
                return
            }

            tick().then(() =>
                requestAnimationFrame(() => {
                    if (!heightManager.viewportElement) return

                    if (bottomToTopModeState === 'lockedBottom' && isViewportNearBottom()) {
                        syncScrollTop(getViewportMaxScrollTop(), true)
                        reconcileBottomToTopToBottom(4)
                    }
                })
            )
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
                void visibleItems // Cache once to avoid reactive loops

                if (useDedicatedBottomToTopEngine) {
                    const pendingEntries: Array<{ index: number; height: number }> = []

                    for (const entry of entries) {
                        const element = entry.target as HTMLElement
                        const elementIndex = itemElements.indexOf(element)
                        const logicalIndex = parseInt(element.dataset.originalIndex || '-1', 10)
                        if (elementIndex === -1 || logicalIndex < 0) continue

                        const physicalIndex = getPhysicalIndexFromLogical(
                            logicalIndex,
                            items.length
                        )
                        const currentHeight = normalizeDedicatedMeasuredHeight(
                            element.getBoundingClientRect().height
                        )
                        const cachedHeight = heightManager.getHeightCache()[physicalIndex]
                        const isSignificant =
                            !Number.isFinite(cachedHeight) ||
                            !isDedicatedHeightWithinTolerance(cachedHeight, currentHeight)

                        if (currentHeight <= 0 || !isSignificant) {
                            continue
                        }

                        pendingEntries.push({ index: physicalIndex, height: currentHeight })
                        deleteBottomToTopStagedHeight(physicalIndex)
                        bottomToTopMeasurementQueue.delete(physicalIndex)
                    }

                    if (pendingEntries.length > 0) {
                        const maintainBottomLock = shouldMaintainBottomToTopBottomLock()
                        const preserveAnchor = shouldPreserveBottomToTopAnchor()
                        const anchor =
                            !maintainBottomLock && preserveAnchor
                                ? captureBottomToTopPromotionAnchor()
                                : null
                        const oldTotal = heightManager.totalHeight

                        heightManager.mergeMeasuredHeights(pendingEntries)

                        if (maintainBottomLock && shouldMaintainBottomToTopBottomLock()) {
                            armBottomToTopLockedBottomDrainSettle()
                            suppressBottomToTopScrollAway()

                            // A single item resize shifts averageHeight, cascading through
                            // all unmeasured items — often a thousands-of-pixels totalHeight
                            // delta. We must update the spacer DOM directly and adjust
                            // scrollTop BEFORE Svelte re-renders, or the browser clamps
                            // scrollTop to the old (stale) scrollHeight.
                            const totalDelta = Math.round(heightManager.totalHeight - oldTotal)
                            if (Math.abs(totalDelta) > 0) {
                                const topSpacerEl = heightManager.viewport.querySelector(
                                    '.virtual-list-spacer'
                                ) as HTMLElement | null
                                if (topSpacerEl) {
                                    const currentSpacerH = topSpacerEl.offsetHeight
                                    topSpacerEl.style.height = `${Math.max(0, currentSpacerH + totalDelta)}px`
                                }
                                syncScrollTop(heightManager.viewport.scrollTop + totalDelta, true)
                            }
                            syncScrollTop(getViewportMaxScrollTop(), true)
                            tick().then(() => {
                                if (
                                    heightManager.viewportElement &&
                                    shouldMaintainBottomToTopBottomLock()
                                ) {
                                    suppressBottomToTopScrollAway()
                                    syncScrollTop(getViewportMaxScrollTop(), true)
                                }
                            })
                            reconcileBottomToTopToBottom(4)
                            scheduleBottomToTopLockedBottomDrain()
                        } else if (anchor) {
                            tick().then(() => {
                                if (
                                    !heightManager.viewportElement ||
                                    shouldMaintainBottomToTopBottomLock()
                                ) {
                                    return
                                }
                                reconcileBottomToTopPromotionAnchor(anchor)
                            })
                        }
                    }
                    return
                }

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
                        if (useDedicatedBottomToTopEngine) {
                            if (
                                measureBottomToTopVisibleItemsImmediately() &&
                                shouldMaintainBottomToTopBottomLock()
                            ) {
                                reconcileBottomToTopToBottom(4)
                            }
                            return
                        }
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
                cancelBottomPin()
                cancelBottomToTopReconcile()
                cancelBottomToTopProgrammaticScroll()
                bottomToTopProgrammaticScrollToken++
                clearBottomToTopBackfill()
            }
        }
    })

    // Add the effect in the script section
    $effect(() => {
        if (INTERNAL_DEBUG) {
            prevVisibleRange = visibleItems
            prevHeight = heightManager.averageHeight
        }
    })

    // Call debugFunction in an effect to avoid state_unsafe_mutation when
    // the callback writes to $state (which is forbidden during render effects)
    $effect(() => {
        if (!debug) return
        const currentVisibleRange = visibleItems
        const viewportElement = heightManager.viewportElement
        const scrollTopPx = Math.round(viewportElement?.scrollTop ?? heightManager.scrollTop ?? 0)
        const clientHeightPx = Math.round(viewportElement?.clientHeight ?? height ?? 0)
        const scrollHeightPx = Math.round(viewportElement?.scrollHeight ?? totalHeight)
        const maxScrollTopPx = Math.max(0, scrollHeightPx - clientHeightPx)
        const gapFromBottomPx = Math.max(0, Math.round(maxScrollTopPx - scrollTopPx))
        const bottomToTopWindow = useDedicatedBottomToTopEngine
            ? getBottomToTopCurrentWindow()
            : null
        const measuredCount = heightManager.measuredCount
        const measuredPercent = items.length > 0 ? (measuredCount / items.length) * 100 : 0
        const info = createDebugInfo(
            currentVisibleRange,
            items.length,
            Object.keys(heightManager.getHeightCache()).length,
            heightManager.averageHeight,
            scrollTopPx,
            clientHeightPx,
            totalHeight,
            {
                mode,
                engine: useDedicatedBottomToTopEngine ? 'dedicated-bottom-to-top' : 'legacy',
                bottomToTopState: useDedicatedBottomToTopEngine ? bottomToTopModeState : undefined,
                renderedVisibleCount: displayItems.length,
                measurementLaneCount: useDedicatedBottomToTopEngine
                    ? bottomToTopMeasurementTasks.length
                    : 0,
                mountedCount: displayItems.length,
                measuredCount,
                measuredPercent,
                logicalWindowStart: currentVisibleRange.start,
                logicalWindowEnd: currentVisibleRange.end,
                physicalWindowStart: bottomToTopWindow?.startPhysical,
                physicalWindowEnd: bottomToTopWindow?.endPhysical,
                topSpacerPx: useDedicatedBottomToTopEngine
                    ? bottomToTopSpacers.topSpacer
                    : undefined,
                bottomSpacerPx: useDedicatedBottomToTopEngine
                    ? bottomToTopSpacers.bottomSpacer
                    : undefined,
                scrollTopPx,
                clientHeightPx,
                scrollHeightPx,
                maxScrollTopPx,
                gapFromBottomPx,
                averageItemHeightPx: heightManager.averageHeight,
                totalHeightPx: totalHeight,
                measurementQueueCount: useDedicatedBottomToTopEngine
                    ? bottomToTopMeasurementQueue.size
                    : 0,
                backfillPending: useDedicatedBottomToTopEngine
                    ? bottomToTopBackfillRafId !== null || bottomToTopBackfillTimeoutId !== null
                    : false,
                reconcileActive: useDedicatedBottomToTopEngine
                    ? bottomToTopMaintainingBottom
                    : false,
                stagedMeasurementCount: useDedicatedBottomToTopEngine ? bottomToTopStagedCount : 0,
                stagedPromotionPending: useDedicatedBottomToTopEngine
                    ? bottomToTopPromotionScheduled
                    : false,
                stagedDrainActive: useDedicatedBottomToTopEngine
                    ? bottomToTopLockedBottomDrainActive
                    : false,
                stagedDrainScheduled: useDedicatedBottomToTopEngine
                    ? bottomToTopLockedBottomDrainScheduled
                    : false
            }
        )

        if (
            !useDedicatedBottomToTopEngine &&
            !shouldShowDebugInfo(
                prevVisibleRange,
                currentVisibleRange,
                prevHeight,
                heightManager.averageHeight
            )
        )
            return

        if (heightManager.viewportElement) {
            ;(
                heightManager.viewportElement as HTMLElement & {
                    __svlDebug?: typeof info
                }
            ).__svlDebug = info
        }

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

        if (useDedicatedBottomToTopEngine) {
            const targetAlign = align || 'auto'
            const scrollTarget = getDedicatedBottomToTopScrollTarget(targetIndex, targetAlign)

            if (scrollTarget === null) {
                return
            }

            const targetNearBottom = isBottomToTopProgrammaticTargetNearBottom(scrollTarget)
            const scrollToken = ++bottomToTopProgrammaticScrollToken
            bottomToTopProgrammaticIntent = targetNearBottom ? 'towardBottom' : 'awayFromBottom'
            cancelBottomPin()
            cancelBottomToTopReconcile()
            clearBottomToTopBackfill()
            if (!targetNearBottom) {
                userHasScrolledAway = true
            }
            programmaticScrollInProgress = true

            performDedicatedBottomToTopScroll(scrollTarget, smoothScroll ?? true)

            window.setTimeout(
                () => {
                    if (scrollToken !== bottomToTopProgrammaticScrollToken) return
                    cancelBottomToTopProgrammaticScroll()
                    if (!heightManager.viewportElement) return

                    if (!targetNearBottom) {
                        measureBottomToTopVisibleItemsImmediately()
                    }

                    tick().then(() => {
                        if (
                            scrollToken !== bottomToTopProgrammaticScrollToken ||
                            !heightManager.viewportElement
                        ) {
                            return
                        }

                        const correctedTarget = getDedicatedBottomToTopScrollTarget(
                            targetIndex,
                            targetAlign
                        )

                        if (
                            correctedTarget !== null &&
                            Math.abs(Math.round(correctedTarget) - getRoundedViewportScrollTop()) >
                                1
                        ) {
                            syncScrollTop(correctedTarget, true)
                        }

                        const nearBottom = isViewportNearBottom(
                            getBottomToTopBottomLockTolerancePx()
                        )
                        userHasScrolledAway = !nearBottom
                        bottomToTopProgrammaticIntent = 'none'
                        programmaticScrollInProgress = false
                        if (nearBottom) {
                            promoteBottomToTopStagedMeasurementsForWindow(
                                getBottomToTopCurrentWindow()
                            )
                            scheduleBottomToTopLockedBottomDrain()
                            reconcileBottomToTopToBottom(4)
                        } else if (bottomToTopStagedCount > 0) {
                            promoteBottomToTopStagedMeasurementsForWindow(
                                getBottomToTopCurrentWindow()
                            )
                        }
                    })
                },
                smoothScroll ? 500 : 100
            )
            return
        }

        const { start: firstVisibleIndex, end: lastVisibleIndex } = visibleItems

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
        cancelBottomPin()
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
            class:virtual-list-content-bottom-to-top={useDedicatedBottomToTopEngine}
            class:virtual-list-content-bottom-to-top-short={useDedicatedBottomToTopEngine &&
                totalHeight < (height || Infinity)}
            style:height={useDedicatedBottomToTopEngine ? undefined : `${contentHeight}px`}
        >
            {#if useDedicatedBottomToTopEngine}
                <div
                    class="virtual-list-spacer"
                    style:height={`${bottomToTopSpacers.topSpacer}px`}
                ></div>

                <div
                    id="virtual-list-items"
                    {...testId ? { 'data-testid': `${testId}-items` } : {}}
                    class={`${itemsClass ?? 'virtual-list-items'} virtual-list-items-flow`}
                    bind:this={itemsWrapperElement}
                >
                    {#each displayItems as currentItemWithIndex, _i (currentItemWithIndex.originalIndex)}
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

                <div
                    class="virtual-list-spacer"
                    style:height={`${bottomToTopSpacers.bottomSpacer}px`}
                ></div>

                <BottomToTopMeasurementLane
                    tasks={bottomToTopMeasurementTasks}
                    {renderItem}
                    onMeasure={handleBottomToTopMeasurement}
                />
            {:else}
                <!-- Items container is translated to show correct items -->
                <div
                    id="virtual-list-items"
                    {...testId ? { 'data-testid': `${testId}-items` } : {}}
                    class={itemsClass ?? 'virtual-list-items'}
                    bind:this={itemsWrapperElement}
                    style:transform="translateY({transformY}px)"
                >
                    {#each displayItems as currentItemWithIndex, _i (currentItemWithIndex.originalIndex)}
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
            {/if}
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

    .virtual-list-content-bottom-to-top {
        display: flex;
        flex-direction: column;
    }

    .virtual-list-content-initializing {
        justify-content: flex-end;
    }

    .virtual-list-content-bottom-to-top-short {
        justify-content: flex-end;
        overflow: clip;
    }

    /* Items wrapper is translated for virtual scrolling */
    .virtual-list-items {
        position: absolute;
        width: 100%;
        left: 0;
        top: 0;
    }

    .virtual-list-items-flow {
        position: relative;
        left: auto;
        top: auto;
        flex: 0 0 auto;
    }

    .virtual-list-items-bottom-aligned {
        margin-top: auto;
    }

    .virtual-list-spacer {
        width: 100%;
        flex: 0 0 auto;
    }

    /* Item wrapper divs should size to their content */
    .virtual-list-items > div {
        width: 100%;
        display: block;
    }
</style>
