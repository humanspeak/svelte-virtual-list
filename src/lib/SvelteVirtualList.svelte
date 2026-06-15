<!--
    @component SvelteVirtualList

    A high-performance, memory-efficient virtualized list component for Svelte 5.
    Renders only visible items plus a buffer, supporting dynamic item heights
    and programmatic control.

    =============================
    ==  Key Features           ==
    =============================
    - Dynamic item height support (no fixed height required)
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
     * 3. Performance Optimizations ✓
     *    - Added element recycling through keyed each blocks
     *    - Implemented RAF for smooth animations
     *    - Optimized DOM updates with transform translations
     *
     * 4. Stability Improvements ✓
     *    - Added ResizeObserver for responsive updates
     *    - Implemented proper cleanup on component destruction
     *    - Added debug mode for development assistance
     *
     * 5. Large Dataset Optimizations ✓
     *    - Implemented chunked processing for 10k+ items
     *    - Added progressive initialization system
     *    - Deferred height calculations for better initial load
     *    - Optimized memory usage for large lists
     *    - Added progress tracking for initialization
     *
     * 6. Size Management Improvements ✓
     *    - Implemented height caching system for measured items
     *    - Added smart height estimation for unmeasured items
     *    - Optimized resize handling with debouncing
     *    - Added height recalculation on content changes
     *    - Implemented progressive height adjustments
     *
     * 7. Code Quality & Maintainability ✓
     *    - Extracted debug utilities for better testing
     *    - Improved type safety throughout
     *    - Added comprehensive documentation
     *    - Optimized debug output to reduce noise
     *
     * 8. Architecture Refactoring ✓
     *    - Extracted scroll calculation logic to scrollCalculation.ts utility
     *    - Extracted ResizeObserver utilities to resizeObserver.ts
     *    - Added comprehensive test coverage for extracted utilities
     *    - Improved separation of concerns and maintainability
     *    - Simplified initialization (removed unnecessary chunked processing)
     *
     * 9. Future Improvements (Planned)
     *    - Add horizontal scrolling support
     *    - Implement variable-sized item caching
     *    - Add keyboard navigation support
     *    - Support for dynamic item updates
     *    - Add accessibility enhancements
     *
     * Technical Challenges Solved:
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
        updateHeightAndScroll as utilsUpdateHeightAndScroll
    } from '$lib/utils/virtualList.js'
    import { createDebugInfo, shouldShowDebugInfo } from '$lib/utils/virtualListDebug.js'
    import { calculateScrollTarget } from '$lib/utils/scrollCalculation.js'
    import { waitForScrollEnd } from '$lib/utils/scrollEnd.js'
    import { createAdvancedThrottledCallback } from '$lib/utils/throttle.js'
    import { ReactiveListManager } from '$lib/index.js'
    import { BROWSER } from 'esm-env'
    import { onMount, tick, untrack } from 'svelte'

    const rafSchedule = createRafScheduler()
    // Timing constants
    const HEIGHT_DEBOUNCE_MS = 100
    // Package-specific debug flag - safe for library distribution
    // Enable with: PUBLIC_SVELTE_VIRTUAL_LIST_DEBUG=true (preferred) or SVELTE_VIRTUAL_LIST_DEBUG=true
    // Avoid SvelteKit-only $env imports so library works in non-Kit/Vitest contexts
    const INTERNAL_DEBUG = Boolean(
        typeof process !== 'undefined' &&
        (process?.env?.PUBLIC_SVELTE_VIRTUAL_LIST_DEBUG === 'true' ||
            process?.env?.SVELTE_VIRTUAL_LIST_DEBUG === 'true')
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
    let lastMeasuredIndex = $state(-1) // Index of last measured item

    /**
     * Timers and Observers
     */
    let heightUpdateTimeout: ReturnType<typeof setTimeout> | null = null // Debounce timer for height updates
    let resizeObserver: ResizeObserver | null = null // Watches for container size changes
    let itemResizeObserver: ResizeObserver | null = null // Watches for individual item size changes
    let scrollAbortController: AbortController | null = null // Cancels an in-flight programmatic scroll wait

    /**
     * Performance Optimization State
     */
    const dirtyItems = $state(new Set<number>()) // Set of item indices that need height recalculation
    let dirtyItemsCount = $state(0) // Reactive count of dirty items
    // Scroll delta threshold optimization - track last scroll position used for range calculation
    let lastProcessedScrollTop = $state(0)

    let prevVisibleRange = $state<SvelteVirtualListPreviousVisibleRange | null>(null)
    let prevHeight = $state<number>(0)
    let prevTotalHeightForScrollCorrection = $state<number>(0)

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

    // Height update function - removed throttling to fix race condition on initial load
    // Create throttled height update function with trailing execution to ensure measurement always happens
    const triggerHeightUpdate = createAdvancedThrottledCallback(
        () => {
            if (BROWSER && dirtyItemsCount > 0) {
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
        // Capture previous total height for scroll correction.
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

                // Keep the end item visually stable when total height changes at the end.
                if (heightManager.isReady && heightManager.initialized) {
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
                            // Adjust scrollTop by total height delta to keep the same end position.
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
            0 // Don't pass ReactiveListManager state - let each system manage its own totals
        )
    }

    /**
     * CRITICAL: O(1) Reactive Total Height Calculation
     * ===============================================
     *
     * Uses ReactiveListManager for O(1) height calculations instead of O(n) loops.
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
     * Used by scroll corrections and maxScrollTop calculations.
     */
    const totalHeight = $derived(heightManager.totalHeight)

    let lastVisibleRange: SvelteVirtualListPreviousVisibleRange | null = null

    function updateDebugTailDistance() {
        if (!heightManager.viewportElement) return
        const last = heightManager.viewport.querySelector(
            `[data-original-index="${items.length - 1}"]`
        ) as HTMLElement | null
        if (!last) return
        const v = heightManager.viewport.getBoundingClientRect()
        const r = last.getBoundingClientRect()
        const bottomDistance = Math.round(Math.abs(r.bottom - v.bottom))
        if (INTERNAL_DEBUG) {
            console.info('[SVL] bottomDistance(px):', bottomDistance)
        }
    }

    // no UI export; rely on console logs when debug=true

    // Update container height continuously to reflect layout changes that
    // may occur outside ResizeObserver timing (keeps buffers correct across engines)
    $effect(() => {
        if (BROWSER && heightManager.isReady) {
            const h = heightManager.container.getBoundingClientRect().height
            if (Number.isFinite(h) && h > 0) height = h
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
        const viewportHeight = height || 0

        // Scroll delta threshold optimization: skip recalculation if scroll delta is less than
        // half the average item height and we have a cached range. This reduces unnecessary
        // calculations during smooth scrolling.
        // Note: We use lastProcessedScrollTop read-only here; it's updated in the scroll handler
        {
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
            totalContentHeight: totalHeight,
            heightCache: heightManager.getHeightCache()
        })

        return lastVisibleRange
    })

    /**
     * Computed content height for the virtual list.
     * Uses the maximum of container height and total content height to ensure
     * proper scrolling behavior.
     */
    const contentHeight = $derived(Math.max(height, totalHeight))

    /**
     * Computed transform Y value for positioning the visible items.
     * Extracted from inline IIFE for better performance and readability.
     */
    const transformY = $derived.by(() => {
        const visibleRange = visibleItems

        // Use precise offset using measured heights when available.
        return Math.round(
            calculateTransformY(
                items.length,
                visibleRange.start,
                heightManager.averageHeight,
                heightManager.getHeightCache()
            )
        )
    })

    const displayItems = $derived.by(() => {
        const visibleRange = visibleItems
        const slice = items.slice(visibleRange.start, visibleRange.end)

        return slice.map((item, sliceIndex) => ({
            item,
            originalIndex: visibleRange.start + sliceIndex,
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
     * - Updates scrollTop state through RAF scheduling
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

        rafSchedule(() => {
            const current = heightManager.viewport.scrollTop
            heightManager.scrollTop = current
            // Update last processed scroll position for delta threshold optimization
            // Only update when we actually process a scroll (i.e., recalculate visible range)
            const scrollDelta = Math.abs(current - lastProcessedScrollTop)
            const threshold = heightManager.averageHeight * 0.5
            if (scrollDelta >= threshold || lastVisibleRange === null) {
                lastProcessedScrollTop = current
            }
            updateDebugTailDistance()
            if (INTERNAL_DEBUG) {
                const vr = visibleItems
                log('[SVL] scroll', {
                    scrollTop: heightManager.scrollTop,
                    height,
                    totalHeight: totalHeight,
                    averageItemHeight: heightManager.averageHeight,
                    visibleRange: vr
                })
            }
        })
    }

    /**
     * Updates the height and scroll position of the virtual list.
     *
     * @param immediate - Whether to skip the delay (used for resize events)
     */
    const updateHeightAndScroll = (immediate = false) => {
        log('updateHeightAndScroll-enter', {
            immediate,
            initialized: heightManager.initialized
        })

        utilsUpdateHeightAndScroll(
            {
                initialized: heightManager.initialized,
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
            log('onMount-enter', { items: items.length })
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
                // Abort any pending scroll wait so its timers/listeners are torn down.
                scrollAbortController?.abort()
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
            totalHeight
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
    export const scroll = (options: SvelteVirtualListScrollOptions): Promise<void> => {
        const { index, smoothScroll, shouldThrowOnBounds, align } = {
            ...DEFAULT_SCROLL_OPTIONS,
            ...options
        }

        // Cancel any scroll wait still in progress so its promise can't resolve
        // against a stale target, and start a fresh cancellation scope.
        scrollAbortController?.abort()
        const abortController = new AbortController()
        scrollAbortController = abortController
        const { signal } = abortController

        return new Promise<void>((resolve, reject) => {
            if (!items.length) {
                resolve()
                return
            }

            // Viewport not mounted yet: retry on the next tick and chain the result.
            if (!heightManager.viewportElement) {
                tick().then(() => {
                    if (!heightManager.viewportElement) {
                        resolve()
                        return
                    }
                    scroll({ index, smoothScroll, shouldThrowOnBounds, align }).then(
                        resolve,
                        reject
                    )
                })
                return
            }

            // Bounds checking
            let targetIndex = index
            if (targetIndex < 0 || targetIndex >= items.length) {
                if (shouldThrowOnBounds) {
                    reject(
                        new Error(
                            `scroll: index ${targetIndex} is out of bounds (0-${items.length - 1})`
                        )
                    )
                    return
                } else {
                    targetIndex = clampValue(targetIndex, 0, items.length - 1)
                }
            }

            const { start: firstVisibleIndex, end: lastVisibleIndex } = visibleItems

            // Use extracted scroll calculation utility
            const scrollTarget = calculateScrollTarget({
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
                resolve()
                return
            }

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

            // Resolve only once the scroll has visually finished AND the virtual
            // list has re-rendered for the new position.
            waitForScrollEnd(
                heightManager.viewport,
                scrollTarget,
                smoothScroll ?? true,
                signal
            ).then(async () => {
                await tick()
                resolve()
            }, reject)
        })
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
            style:height="{contentHeight}px"
        >
            <!-- Items container is translated to show correct items -->
            <div
                id="virtual-list-items"
                {...testId ? { 'data-testid': `${testId}-items` } : {}}
                class={itemsClass ?? 'virtual-list-items'}
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
