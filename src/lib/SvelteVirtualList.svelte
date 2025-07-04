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
    - Supports chunked initialization for very large lists
    - All scrolling logic is centralized in the scroll() method
    - Bi-directional support: mode="topToBottom" or "bottomToTop"
    - Designed for extensibility and easy debugging

    =============================
    ==  For Contributors        ==
    =============================
    - Please keep all scrolling logic in the scroll() method
    - Add new features behind feature flags or as optional props
    - Write tests for all new features (see /test and /tests/scroll)
    - Use TypeScript and Svelte 5 runes for all new code
    - Document all exported functions and props with JSDoc
    - See README.md for API and usage details
    - For questions, open an issue or discussion on GitHub

    MIT License © Humanspeak, Inc.
-->

<script lang="ts">
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
     * 9. Future Improvements (Planned)
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
     *
     * Current Architecture:
     * - Four-layer DOM structure for optimal performance
     * - State management using Svelte 5's $state
     * - Reactive height and scroll calculations
     * - Configurable buffer zones for smooth scrolling
     * - Chunked processing system for large datasets
     * - Separated debug utilities for better testing
     * - Height caching and estimation system
     * - Progressive size adjustment system
     */

    import {
        DEFAULT_SCROLL_OPTIONS,
        type SvelteVirtualListProps,
        type SvelteVirtualListScrollOptions
    } from '$lib/types.js'
    import { calculateAverageHeightDebounced } from '$lib/utils/heightCalculation.js'
    import { createRafScheduler } from '$lib/utils/raf.js'
    import {
        calculateScrollPosition,
        calculateTransformY,
        calculateVisibleRange,
        getScrollOffsetForIndex,
        processChunked,
        updateHeightAndScroll as utilsUpdateHeightAndScroll
    } from '$lib/utils/virtualList.js'
    import { createDebugInfo, shouldShowDebugInfo } from '$lib/utils/virtualListDebug.js'
    import { BROWSER } from 'esm-env'
    import { onMount, tick } from 'svelte'

    const rafSchedule = createRafScheduler()

    /**
     * Core configuration props with default values
     * @type {SvelteVirtualListProps}
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
    }: SvelteVirtualListProps = $props()

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

    /**
     * Performance Optimization State
     */
    let heightCache = $state<Record<number, number>>({}) // Cache of measured item heights
    const chunkSize = $state(50) // Number of items to process in each chunk
    let processedItems = $state(0) // Number of items processed during initialization

    let prevVisibleRange = $state<{ start: number; end: number } | null>(null)
    let prevHeight = $state<number>(0)

    // Trigger height calculation when items are rendered
    $effect(() => {
        if (BROWSER && itemElements.length > 0 && !isCalculatingHeight) {
            heightUpdateTimeout = calculateAverageHeightDebounced(
                isCalculatingHeight,
                heightUpdateTimeout,
                visibleItems,
                itemElements,
                heightCache,
                lastMeasuredIndex,
                calculatedItemHeight,
                (result) => {
                    calculatedItemHeight = result.newHeight
                    lastMeasuredIndex = result.newLastMeasuredIndex
                    heightCache = result.updatedHeightCache
                }
            )
        }
    })

    // Add new effect to handle height changes
    $effect(() => {
        if (BROWSER && initialized && mode === 'bottomToTop' && viewportElement) {
            const totalHeight = Math.max(0, items.length * calculatedItemHeight)
            const targetScrollTop = Math.max(0, totalHeight - height)

            // Only update if the difference is significant
            if (Math.abs(viewportElement.scrollTop - targetScrollTop) > calculatedItemHeight) {
                requestAnimationFrame(() => {
                    if (viewportElement) {
                        viewportElement.scrollTop = targetScrollTop
                        scrollTop = targetScrollTop
                    }
                })
            }
        }
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
            const totalHeight = Math.max(0, items.length * calculatedItemHeight)
            const targetScrollTop = Math.max(0, totalHeight - height)

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
     * @returns {{ start: number, end: number }} Object containing start and end indices of visible items
     */
    const visibleItems = $derived(() => {
        if (!items.length) return { start: 0, end: 0 }
        const viewportHeight = height || 0

        return calculateVisibleRange(
            scrollTop,
            viewportHeight,
            calculatedItemHeight,
            items.length,
            bufferSize,
            mode
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

    /**
     * Initializes large datasets in chunks to prevent UI blocking.
     *
     * This function processes items in smaller chunks using setTimeout to yield
     * to the main thread, allowing other UI operations to remain responsive.
     * Progress is tracked and reported through the processedItems state.
     *
     * For datasets larger than 1000 items, this method is automatically used
     * instead of immediate initialization. The chunk size is controlled by the
     * component's chunkSize state (default: 50).
     *
     * @async
     * @example
     * ```typescript
     * // Component initialization
     * $effect(() => {
     *     if (BROWSER && items.length > 1000) {
     *         initializeChunked()
     *     } else {
     *         initialized = true
     *     }
     * })
     * ```
     *
     * @throws {Error} If processChunked fails to complete initialization
     * @returns {Promise<void>} Resolves when all chunks have been processed
     */
    const initializeChunked = async () => {
        if (!items.length) return

        await processChunked(
            items,
            chunkSize,
            (processed) => (processedItems = processed),
            () => (initialized = true)
        )
    }

    // Modify the mount effect to use chunked initialization
    $effect(() => {
        if (BROWSER && items.length > 1000) {
            initializeChunked()
        } else {
            initialized = true
        }
    })

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
            }
        }
    })

    // Add the effect in the script section
    $effect(() => {
        if (debug) {
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
        let scrollTarget: number | null = null

        if (mode === 'bottomToTop') {
            const totalHeight = items.length * calculatedItemHeight
            const itemOffset = targetIndex * calculatedItemHeight
            const itemHeight = calculatedItemHeight
            if (align === 'auto') {
                if (targetIndex < firstVisibleIndex) {
                    // Align to top
                    scrollTarget = Math.max(0, totalHeight - (itemOffset + itemHeight))
                } else if (targetIndex > lastVisibleIndex - 1) {
                    // Align to bottom
                    scrollTarget = Math.max(0, totalHeight - itemOffset - height)
                } else {
                    // Already in view, do nothing
                    return
                }
            } else if (align === 'top') {
                // Align to top
                scrollTarget = Math.max(0, totalHeight - (itemOffset + itemHeight))
            } else if (align === 'bottom') {
                // Align to bottom
                scrollTarget = Math.max(0, totalHeight - itemOffset - height)
            }
        } else {
            // topToBottom (default)
            if (align === 'auto') {
                if (targetIndex < firstVisibleIndex) {
                    // Scroll so item is at the top
                    scrollTarget = getScrollOffsetForIndex(
                        heightCache,
                        calculatedItemHeight,
                        targetIndex
                    )
                } else if (targetIndex > lastVisibleIndex - 1) {
                    // Scroll so item is at the bottom
                    const itemBottom = getScrollOffsetForIndex(
                        heightCache,
                        calculatedItemHeight,
                        targetIndex + 1
                    )
                    scrollTarget = Math.max(0, itemBottom - height)
                } else {
                    // Already in view, do nothing
                    return
                }
            } else if (align === 'top') {
                scrollTarget = getScrollOffsetForIndex(
                    heightCache,
                    calculatedItemHeight,
                    targetIndex
                )
            } else if (align === 'bottom') {
                const itemBottom = getScrollOffsetForIndex(
                    heightCache,
                    calculatedItemHeight,
                    targetIndex + 1
                )
                scrollTarget = Math.max(0, itemBottom - height)
            }
        }

        if (scrollTarget !== null) {
            viewportElement.scrollTo({
                top: scrollTarget,
                behavior: smoothScroll ? 'smooth' : 'auto'
            })
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
            style:height="{Math.max(height, items.length * calculatedItemHeight)}px"
        >
            <!-- Items container is translated to show correct items -->
            <div
                id="virtual-list-items"
                {...testId ? { 'data-testid': `${testId}-items` } : {}}
                class={itemsClass ?? 'virtual-list-items'}
                style:transform="translateY({calculateTransformY(
                    mode,
                    items.length,
                    visibleItems().end,
                    visibleItems().start,
                    calculatedItemHeight
                )}px)"
            >
                {#each mode === 'bottomToTop' ? items
                          .slice(visibleItems().start, visibleItems().end)
                          .reverse() : items.slice(visibleItems().start, visibleItems().end) as currentItem, i (currentItem?.id ?? i)}
                    <!-- Only debug when visible range or average height changes -->
                    {#if debug && i === 0 && shouldShowDebugInfo(prevVisibleRange, visibleItems(), prevHeight, calculatedItemHeight)}
                        {@const debugInfo = createDebugInfo(
                            visibleItems(),
                            items.length,
                            processedItems,
                            calculatedItemHeight
                        )}
                        {debugFunction
                            ? debugFunction(debugInfo)
                            : console.info('Virtual List Debug:', debugInfo)}
                    {/if}
                    <!-- Render each visible item -->
                    <div bind:this={itemElements[i]}>
                        {@render renderItem(
                            currentItem,
                            mode === 'bottomToTop'
                                ? items.length - (visibleItems().start + i) - 1
                                : visibleItems().start + i
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
</style>
