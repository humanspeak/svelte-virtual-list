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

<script lang="ts" generics="TItem = any">
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
        calculateScrollPosition,
        calculateTransformY,
        calculateVisibleRange,
        updateHeightAndScroll as utilsUpdateHeightAndScroll
    } from '$lib/utils/virtualList.js'
    import { createDebugInfo, shouldShowDebugInfo } from '$lib/utils/virtualListDebug.js'
    import { calculateScrollTarget } from '$lib/utils/scrollCalculation.js'
    import { createThrottledCallback } from '$lib/utils/throttle.js'
    import { BROWSER } from 'esm-env'
    import { onMount, tick, untrack } from 'svelte'

    const rafSchedule = createRafScheduler()

    // Package-specific debug flag - safe for library distribution
    // Enable with: NODE_ENV=development SVELTE_VIRTUAL_LIST_DEBUG=true
    const INTERNAL_DEBUG =
        import.meta.env.DEV && import.meta.env.VITE_SVELTE_VIRTUAL_LIST_DEBUG === 'true'
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
        testId // Base test ID for component elements (undefined = no data-testid attributes)
    }: SvelteVirtualListProps<TItem> = $props()

    /**
     * DOM References and Core State
     */
    let containerElement: HTMLElement // Reference to the main container element
    let viewportElement: HTMLElement // Reference to the scrollable viewport element
    const itemElements = $state<HTMLElement[]>([]) // Array of rendered item element references

    /**
     * Scroll and Height Management
     */
    let scrollTop = $state(0) // Current scroll position
    let height = $state(0) // Container height
    let calculatedItemHeight = $state(defaultEstimatedItemHeight) // Current average item height

    /**
     * State Flags and Control
     */
    let initialized = $state(false) // Tracks if initial setup is complete
    let isCalculatingHeight = $state(false) // Prevents concurrent height calculations
    let isScrolling = $state(false) // Tracks active scrolling state
    let lastMeasuredIndex = $state(-1) // Index of last measured item

    /**
     * Timers and Observers
     */
    let heightUpdateTimeout: ReturnType<typeof setTimeout> | null = null // Debounce timer for height updates
    let resizeObserver: ResizeObserver | null = null // Watches for container size changes
    let itemResizeObserver: ResizeObserver | null = null // Watches for individual item size changes

    /**
     * Performance Optimization State
     */
    let heightCache = $state<Record<number, number>>({}) // Cache of measured item heights
    let dirtyItems = $state(new Set<number>()) // Set of item indices that need height recalculation
    let dirtyItemsCount = $state(0) // Reactive count of dirty items

    let prevVisibleRange = $state<SvelteVirtualListPreviousVisibleRange | null>(null)
    let prevHeight = $state<number>(0)

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
        if (!viewportElement || !initialized || userHasScrolledAway) return

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
        if (mode === 'bottomToTop' && wasAtBottomBeforeHeightChange) {
            // Step 1: Scroll to approximate position to ensure Item 0 gets rendered in virtual viewport
            const approximateScrollTop = Math.max(0, totalHeight() - height)
            viewportElement.scrollTop = approximateScrollTop
            scrollTop = approximateScrollTop

            // Step 2: Use native scrollIntoView for precise bottom-edge positioning after DOM updates
            tick().then(() => {
                const item0Element = viewportElement.querySelector('[data-testid="list-item-0"]')
                if (item0Element) {
                    // Native browser API handles all positioning edge cases perfectly
                    item0Element.scrollIntoView({
                        block: 'end', // Align Item 0 to bottom edge of viewport
                        behavior: 'smooth', // Smooth animation for better UX
                        inline: 'nearest' // Minimal horizontal adjustment
                    })

                    // Sync our internal scroll state with actual DOM position
                    scrollTop = viewportElement.scrollTop
                }
            })

            return // Skip remaining scroll correction logic - we've handled bottomToTop case
        }

        const currentScrollTop = viewportElement.scrollTop
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
        if (Math.abs(heightChangeAboveViewport) > 1) {
            const newScrollTop = Math.min(
                maxScrollTop,
                Math.max(0, currentScrollTop + heightChangeAboveViewport)
            )

            if (INTERNAL_DEBUG) {
                console.log('🔄 Correcting scroll for height changes:', {
                    changes: heightChanges,
                    heightChangeAboveViewport,
                    currentScrollTop,
                    newScrollTop,
                    visibleRange: currentVisibleRange
                })
            }

            viewportElement.scrollTop = newScrollTop
            scrollTop = newScrollTop
        }
    }

    // Create throttled height update function to prevent excessive calls to debounced updateHeight()
    const throttledHeightUpdate = createThrottledCallback(() => {
        if (BROWSER && dirtyItemsCount > 0) {
            // Capture bottom state before any height processing to prevent cascading corrections
            wasAtBottomBeforeHeightChange = atBottom
            updateHeight()
        }
    }, 16) // ~60fps throttle to match typical RAF timing

    // Trigger height calculation when dirty items are added (throttled)
    $effect(() => {
        throttledHeightUpdate()
    })

    const updateHeight = () => {
        heightUpdateTimeout = calculateAverageHeightDebounced(
            isCalculatingHeight,
            heightUpdateTimeout,
            visibleItems,
            itemElements,
            heightCache,
            lastMeasuredIndex,
            calculatedItemHeight,
            (result) => {
                // Critical updates that must trigger reactive effects immediately
                calculatedItemHeight = result.newHeight
                lastMeasuredIndex = result.newLastMeasuredIndex
                heightCache = result.updatedHeightCache

                // Handle height changes for scroll correction (needs updated heightCache)
                if (result.heightChanges.length > 0 && mode === 'bottomToTop') {
                    handleHeightChangesScrollCorrection(result.heightChanges)
                }

                // Non-critical updates wrapped in untrack to prevent reactive cascades
                untrack(() => {
                    // Update running totals efficiently (O(1) instead of O(n)!)
                    totalMeasuredHeight = result.newTotalHeight
                    measuredCount = result.newValidCount

                    // Clear processed dirty items (all dirty items were processed)
                    dirtyItems.clear()
                    dirtyItemsCount = 0

                    // Reset bottom state flag
                    wasAtBottomBeforeHeightChange = false

                    if (INTERNAL_DEBUG && result.clearedDirtyItems.size > 0) {
                        console.log(
                            `Cleared ${result.clearedDirtyItems.size} dirty items:`,
                            Array.from(result.clearedDirtyItems)
                        )
                    }
                })
            },
            100, // debounceTime
            dirtyItems, // Pass dirty items for processing
            totalMeasuredHeight, // Current running total height
            measuredCount, // Current running total count
            mode // Pass mode for correct element indexing
        )
    }

    // Add new effect to handle height changes
    // Track if user has scrolled away from bottom to prevent snap-back
    let userHasScrolledAway = $state(false)
    let lastCalculatedHeight = $state(0)
    let lastItemsLength = $state(0)

    /**
     * CRITICAL: Accurate Total Height Calculation
     * ==========================================
     *
     * This derived calculation fixes the root cause of massive scroll jumps in bottomToTop mode.
     *
     * Problem with Previous Approach:
     * - Used simple: items.length * calculatedItemHeight
     * - When 1 item changes from 20px to 100px in 10,000 items:
     *   - calculatedItemHeight jumps from 20 to 22.35 (+2.35px)
     *   - Total height jumps from 200,000px to 223,500px (+23,500px!)
     *   - This 23,500px error caused massive scroll position overshoots
     *
     * Solution:
     * - Use actual measured heights from heightCache where available
     * - Only estimate heights for items that haven't been measured yet
     * - Calculate average from measured items only (not all items)
     *
     * Example with Same Scenario:
     * - 20 items measured: 19 × 20px + 1 × 100px = 460px measured
     * - 9,980 unmeasured: 9,980 × 23px (avg of measured) = 229,540px estimated
     * - Total: 460px + 229,540px = 230,000px (only +30,000px vs +23,500px error)
     * - Much smaller error that doesn't cause massive scroll jumps
     *
     * This function is called reactively whenever heightCache or items change,
     * ensuring scroll calculations always use the most accurate height data available.
     *
     * Used by: atBottom calculation, scroll corrections, maxScrollTop calculations
     */
    // atTop, atBottom moved after totalHeight declaration to fix variable ordering
    let wasAtBottomBeforeHeightChange = false
    let lastVisibleRange: SvelteVirtualListPreviousVisibleRange | null = null

    // $inspect('scrollState: atTop', atTop)
    // $inspect('scrollState: atBottom', atBottom)

    $effect(() => {
        if (BROWSER && initialized && mode === 'bottomToTop' && viewportElement) {
            const targetScrollTop = Math.max(0, totalHeight() - height)
            const currentScrollTop = viewportElement.scrollTop
            const scrollDifference = Math.abs(currentScrollTop - targetScrollTop)

            // Only correct scroll if:
            // 1. Item height changed significantly (not just user scrolling)
            // 2. User hasn't intentionally scrolled away from bottom
            // 3. We're significantly off target
            // 4. We're not at the bottom (where height changes should be handled more carefully)
            const heightChanged = Math.abs(calculatedItemHeight - lastCalculatedHeight) > 1
            const maxScrollTop = Math.max(0, totalHeight() - height)

            // In bottomToTop mode, we're "at bottom" when scroll is at max position
            const isAtBottom = Math.abs(currentScrollTop - maxScrollTop) < calculatedItemHeight
            const shouldCorrect =
                heightChanged &&
                !userHasScrolledAway &&
                !isAtBottom && // Don't apply aggressive correction when at bottom
                scrollDifference > calculatedItemHeight * 3

            if (shouldCorrect) {
                if (INTERNAL_DEBUG) {
                    console.log(
                        '🔄 Correcting scroll position from',
                        currentScrollTop,
                        'to',
                        targetScrollTop,
                        '(rounded:',
                        Math.round(targetScrollTop),
                        ') totalHeight:',
                        totalHeight,
                        'height:',
                        height,
                        'diff:',
                        scrollDifference,
                        'heightChanged:',
                        heightChanged
                    )
                }
                // Round to avoid subpixel positioning issues in bottomToTop mode
                const roundedTargetScrollTop = Math.round(targetScrollTop)
                viewportElement.scrollTop = roundedTargetScrollTop
                scrollTop = roundedTargetScrollTop
            }

            // Track if user has scrolled significantly away from bottom
            if (scrollDifference > calculatedItemHeight * 5) {
                userHasScrolledAway = true
            }

            lastCalculatedHeight = calculatedItemHeight
        }
    })

    // Handle items being added/removed in bottomToTop mode
    $effect(() => {
        // Only track items.length to prevent re-runs on other reactive changes
        const currentItemsLength = items.length

        if (
            BROWSER &&
            initialized &&
            mode === 'bottomToTop' &&
            viewportElement &&
            lastItemsLength > 0
        ) {
            const itemsAdded = currentItemsLength - lastItemsLength

            if (itemsAdded !== 0) {
                // Capture all reactive values immediately to prevent re-triggering
                const currentScrollTop = viewportElement.scrollTop
                const currentCalculatedItemHeight = calculatedItemHeight
                const currentHeight = height
                const currentTotalHeight = totalHeight()
                const maxScrollTop = Math.max(0, currentTotalHeight - currentHeight)

                // Check if user was at/near the bottom before items were added
                const wasNearBottom =
                    Math.abs(
                        currentScrollTop -
                            Math.max(
                                0,
                                lastItemsLength * currentCalculatedItemHeight - currentHeight
                            )
                    ) <
                    currentCalculatedItemHeight * 2

                if (wasNearBottom || currentScrollTop === 0) {
                    // User was at bottom, keep them at bottom after new items are added
                    const newScrollTop = maxScrollTop

                    if (INTERNAL_DEBUG) {
                        console.log(
                            `📝 Items ${itemsAdded > 0 ? 'added' : 'removed'}: ${Math.abs(itemsAdded)}, staying at bottom`,
                            'oldScroll:',
                            currentScrollTop,
                            'newScroll:',
                            newScrollTop
                        )
                    }

                    viewportElement.scrollTop = newScrollTop
                    scrollTop = newScrollTop

                    // Reset the "scrolled away" flag since we're actively managing position
                    userHasScrolledAway = false
                }
            }
        }

        lastItemsLength = currentItemsLength
    })

    // Update container height when element is mounted
    $effect(() => {
        if (BROWSER && containerElement) {
            height = containerElement.getBoundingClientRect().height
        }
    })

    // Special handling for bottom-to-top mode initialization
    $effect(() => {
        if (
            BROWSER &&
            mode === 'bottomToTop' &&
            viewportElement &&
            height > 0 &&
            items.length &&
            !initialized
        ) {
            const targetScrollTop = Math.max(0, totalHeight() - height)

            // Add delay to ensure layout is complete
            tick().then(() => {
                if (viewportElement) {
                    // Start at the bottom for bottom-to-top mode
                    viewportElement.scrollTop = targetScrollTop
                    scrollTop = targetScrollTop

                    // Double-check the scroll position after a frame
                    requestAnimationFrame(() => {
                        if (viewportElement && viewportElement.scrollTop !== targetScrollTop) {
                            viewportElement.scrollTop = targetScrollTop
                            scrollTop = targetScrollTop
                        }
                        initialized = true
                    })
                }
            })
        }
    })

    /**
     * Calculate precise item height based on actual measurements when available
     */
    // Running totals for efficient precise height calculation
    let totalMeasuredHeight = $state(0)
    let measuredCount = $state(0)

    /**
     * Calculate total list height using pre-calculated totals (O(1) optimization)
     *
     * Previously this was O(n) - looping through all items to sum heights.
     * Now uses totalMeasuredHeight and measuredCount from calculateAverageHeightDebounced.
     *
     * This function is called reactively whenever heightCache or items change,
     * ensuring scroll calculations always use the most accurate height data available.
     *
     * Used by: atBottom calculation, scroll corrections, maxScrollTop calculations
     */
    let totalHeight = $derived(() => {
        // Estimate height for unmeasured items using average of measured items
        const unmeasuredCount = items.length - measuredCount
        const averageOfMeasured =
            measuredCount > 0 ? totalMeasuredHeight / measuredCount : calculatedItemHeight
        const estimatedHeight = unmeasuredCount * averageOfMeasured

        return totalMeasuredHeight + estimatedHeight
    })

    let atTop = $derived(scrollTop <= 1)
    let atBottom = $derived(scrollTop >= totalHeight() - height - 1)

    const preciseItemHeight = $derived(() => {
        if (measuredCount > 100) {
            const avgHeight = totalMeasuredHeight / measuredCount
            // Only use if the difference is significant (more than 0.5px)
            if (Math.abs(avgHeight - calculatedItemHeight) > 0.5) {
                return avgHeight
            }
        }
        return calculatedItemHeight
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
     * console.log(`Rendering items from ${range.start} to ${range.end}`)
     * ```
     *
     * @returns {SvelteVirtualListPreviousVisibleRange} Object containing start and end indices of visible items
     */
    const visibleItems = $derived((): SvelteVirtualListPreviousVisibleRange => {
        if (!items.length) return { start: 0, end: 0 } as SvelteVirtualListPreviousVisibleRange
        const viewportHeight = height || 0

        // For bottomToTop mode, don't calculate visible range until properly initialized
        // This prevents showing wrong items when scrollTop starts at 0
        if (mode === 'bottomToTop' && !initialized && scrollTop === 0 && viewportHeight > 0) {
            // Calculate what the correct scroll position should be
            const targetScrollTop = Math.max(0, totalHeight() - viewportHeight)

            // Use the target scroll position for visible range calculation
            lastVisibleRange = calculateVisibleRange(
                targetScrollTop,
                viewportHeight,
                calculatedItemHeight,
                items.length,
                bufferSize,
                mode,
                atBottom,
                wasAtBottomBeforeHeightChange,
                lastVisibleRange
            )

            return lastVisibleRange
        }

        lastVisibleRange = calculateVisibleRange(
            scrollTop,
            viewportHeight,
            calculatedItemHeight,
            items.length,
            bufferSize,
            mode,
            atBottom,
            wasAtBottomBeforeHeightChange,
            lastVisibleRange
        )

        return lastVisibleRange
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
        if (!BROWSER || !viewportElement) return

        if (!isScrolling) {
            isScrolling = true
            rafSchedule(() => {
                scrollTop = viewportElement.scrollTop
                isScrolling = false
            })
        }
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
        if (!initialized && mode === 'bottomToTop') {
            tick().then(() => {
                if (containerElement) {
                    const initialHeight = containerElement.getBoundingClientRect().height
                    height = initialHeight

                    tick().then(() => {
                        if (containerElement && viewportElement) {
                            const finalHeight = containerElement.getBoundingClientRect().height
                            height = finalHeight

                            const targetScrollTop = calculateScrollPosition(
                                items.length,
                                calculatedItemHeight,
                                finalHeight
                            )

                            void containerElement.offsetHeight

                            viewportElement.scrollTop = targetScrollTop
                            scrollTop = targetScrollTop

                            requestAnimationFrame(() => {
                                if (viewportElement) {
                                    const currentScroll = viewportElement.scrollTop
                                    if (currentScroll !== scrollTop) {
                                        viewportElement.scrollTop = targetScrollTop
                                        scrollTop = targetScrollTop
                                    }
                                    initialized = true
                                }
                            })
                        }
                    })
                }
            })
            return
        }

        utilsUpdateHeightAndScroll(
            {
                initialized,
                mode,
                containerElement,
                viewportElement,
                calculatedItemHeight,
                height,
                scrollTop
            },
            {
                setHeight: (h) => (height = h),
                setScrollTop: (st) => (scrollTop = st),
                setInitialized: (i) => (initialized = i)
            },
            immediate
        )
    }

    // Create itemResizeObserver immediately when in browser
    if (BROWSER) {
        // Watch for individual item size changes
        itemResizeObserver = new ResizeObserver((entries) => {
            tick().then(() => {
                let shouldRecalculate = false
                const visibleRange = visibleItems() // Cache once to avoid reactive loops

                for (const entry of entries) {
                    const element = entry.target as HTMLElement
                    const elementIndex = itemElements.indexOf(element)
                    // console.log(
                    //     '🔥 ELEMENT INDEX:',
                    //     elementIndex,
                    //     element.getBoundingClientRect().height,
                    //     element.dataset.originalIndex
                    // )

                    if (elementIndex !== -1) {
                        // Get the original index directly from the data attribute
                        const actualIndex = parseInt(element.dataset.originalIndex || '-1', 10)

                        if (actualIndex >= 0) {
                            const currentHeight = element.getBoundingClientRect().height

                            // Only mark as dirty if height change is significant
                            if (
                                isSignificantHeightChange(actualIndex, currentHeight, heightCache)
                            ) {
                                // console.log(
                                //     `🔥 MARKING ITEM ${actualIndex} - DIRTY - height change: ${currentHeight}`
                                // )

                                // Capture bottom state when FIRST item gets marked dirty
                                if (dirtyItemsCount === 0) {
                                    wasAtBottomBeforeHeightChange = atBottom
                                    if (INTERNAL_DEBUG) {
                                        console.log(
                                            '🔥 FIRST DIRTY ITEM - capturing wasAtBottomBeforeHeightChange:',
                                            atBottom
                                        )
                                    }
                                }

                                dirtyItems.add(actualIndex)
                                dirtyItemsCount = dirtyItems.size
                                shouldRecalculate = true
                            }
                            // else {
                            //     console.log(
                            //         `🔥 SKIPPING ITEM ${actualIndex} - height change too small: ${currentHeight}`
                            //     )
                            // }
                        }
                    }
                }

                if (shouldRecalculate) {
                    if (INTERNAL_DEBUG) {
                        console.log('🔥 SHOULD RECALCULATE')
                    }
                    rafSchedule(() => {
                        updateHeight()
                    })
                }
            })
        })
    }

    // Setup and cleanup
    onMount(() => {
        if (BROWSER) {
            // Initial setup of heights and scroll position
            updateHeightAndScroll()

            // Watch for container size changes
            resizeObserver = new ResizeObserver(() => {
                updateHeightAndScroll(true)
            })

            if (containerElement) {
                resizeObserver.observe(containerElement)
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
            prevHeight = calculatedItemHeight
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
     * @returns {void}
     * @throws {Error} If the index is out of bounds and shouldThrowOnBounds is true
     */
    export const scroll = (options: SvelteVirtualListScrollOptions): void => {
        const { index, smoothScroll, shouldThrowOnBounds, align } = {
            ...DEFAULT_SCROLL_OPTIONS,
            ...options
        }

        if (!items.length) return
        if (!viewportElement) {
            tick().then(() => {
                if (!viewportElement) return
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
                targetIndex = Math.max(0, Math.min(targetIndex, items.length - 1))
            }
        }

        const { start: firstVisibleIndex, end: lastVisibleIndex } = visibleItems()

        // Use extracted scroll calculation utility
        const scrollTarget = calculateScrollTarget({
            mode,
            align: align || 'auto',
            targetIndex,
            itemsLength: items.length,
            calculatedItemHeight,
            height,
            scrollTop,
            firstVisibleIndex,
            lastVisibleIndex,
            heightCache
        })

        // Handle early return for 'nearest' alignment when item is already visible
        if (scrollTarget === null) {
            return
        }

        if (INTERNAL_DEBUG) {
            console.log(`Programmatic scroll initiated to index ${targetIndex}`)
        }

        viewportElement.scrollTo({
            top: scrollTarget,
            behavior: smoothScroll ? 'smooth' : 'auto'
        })

        // Update scrollTop state in next frame to avoid synchronous re-renders
        requestAnimationFrame(() => {
            scrollTop = scrollTarget
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
    bind:this={containerElement}
>
    <!-- Viewport handles scrolling -->
    <div
        id="virtual-list-viewport"
        {...testId ? { 'data-testid': `${testId}-viewport` } : {}}
        class={viewportClass ?? 'virtual-list-viewport'}
        bind:this={viewportElement}
        onscroll={handleScroll}
    >
        <!-- Content provides full scrollable height -->
        <div
            id="virtual-list-content"
            {...testId ? { 'data-testid': `${testId}-content` } : {}}
            class={contentClass ?? 'virtual-list-content'}
            style:height="{(() => {
                // Use precise height when available for better cross-browser compatibility
                const totalActualHeight = items.length * preciseItemHeight()
                return Math.max(height, totalActualHeight)
            })()}px"
        >
            <!-- Items container is translated to show correct items -->
            <div
                id="virtual-list-items"
                {...testId ? { 'data-testid': `${testId}-items` } : {}}
                class={itemsClass ?? 'virtual-list-items'}
                style:visibility={height === 0 && mode === 'bottomToTop' ? 'hidden' : 'visible'}
                style:transform="translateY({(() => {
                    const viewportHeight = height || 0
                    const visibleRange = visibleItems()

                    // For bottomToTop mode with few items, provide reasonable initial positioning
                    // even when height is not yet measured to prevent flash
                    let effectiveHeight = viewportHeight
                    if (mode === 'bottomToTop' && viewportHeight === 0 && containerElement) {
                        // Measure height synchronously if available
                        effectiveHeight = containerElement.getBoundingClientRect().height || 400
                    } else if (mode === 'bottomToTop' && viewportHeight === 0) {
                        // Fallback to reasonable default height estimate for initial positioning
                        effectiveHeight = 400
                    }

                    const transform = calculateTransformY(
                        mode,
                        items.length,
                        visibleRange.end,
                        visibleRange.start,
                        calculatedItemHeight,
                        effectiveHeight
                    )

                    return transform
                })()}px)"
            >
                {#each (() => {
                    const visibleRange = visibleItems()
                    const slice = mode === 'bottomToTop' ? items
                                  .slice(visibleRange.start, visibleRange.end)
                                  .reverse() : items.slice(visibleRange.start, visibleRange.end)

                    // Map each item with its original index for proper DOM element tracking
                    const itemsWithOriginalIndex = slice.map( (item, sliceIndex) => ({ item, originalIndex: mode === 'bottomToTop' ? visibleRange.end - 1 - sliceIndex : visibleRange.start + sliceIndex, sliceIndex }) )

                    return itemsWithOriginalIndex
                })() as currentItemWithIndex, i (currentItemWithIndex.originalIndex)}
                    <!-- Only debug when visible range or average height changes -->
                    {#if debug && i === 0 && shouldShowDebugInfo(prevVisibleRange, visibleItems(), prevHeight, calculatedItemHeight)}
                        {@const debugInfo = createDebugInfo(
                            visibleItems(),
                            items.length,
                            Object.keys(heightCache).length,
                            calculatedItemHeight,
                            scrollTop,
                            height || 0,
                            totalHeight()
                        )}
                        {debugFunction
                            ? debugFunction(debugInfo)
                            : console.info('Virtual List Debug:', debugInfo)}
                    {/if}
                    <!-- Render each visible item -->
                    <div
                        bind:this={itemElements[currentItemWithIndex.sliceIndex]}
                        use:autoObserveItemResize
                        data-original-index={currentItemWithIndex.originalIndex}
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
