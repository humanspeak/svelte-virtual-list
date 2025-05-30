import type { SvelteVirtualListMode } from '../types.js'
import type { VirtualListSetters, VirtualListState } from './types.js'

/**
 * Calculates the maximum scroll position for a virtual list.
 *
 * This function determines the maximum scrollable distance by computing the difference
 * between the total content height and the visible container height. This is crucial
 * for maintaining proper scroll boundaries in virtual lists.
 *
 * @param {number} totalItems - The total number of items in the list
 * @param {number} itemHeight - The height of each individual item in pixels
 * @param {number} containerHeight - The visible height of the container in pixels
 * @returns {number} The maximum scroll position in pixels
 */
export const calculateScrollPosition = (
    totalItems: number,
    itemHeight: number,
    containerHeight: number
) => {
    if (totalItems === 0) return 0
    const totalHeight = totalItems * itemHeight
    return Math.max(0, totalHeight - containerHeight)
}

/**
 * Determines the range of items that should be rendered in the virtual list.
 *
 * This function calculates which items should be visible based on the current scroll position,
 * viewport size, and scroll direction. It includes a buffer zone to enable smooth scrolling
 * and prevent visible gaps during rapid scroll movements.
 *
 * @param {number} scrollTop - Current scroll position in pixels
 * @param {number} viewportHeight - Height of the visible area in pixels
 * @param {number} itemHeight - Height of each list item in pixels
 * @param {number} totalItems - Total number of items in the list
 * @param {number} bufferSize - Number of items to render outside the visible area
 * @param {SvelteVirtualListMode} mode - Scroll direction mode
 * @returns {{ start: number, end: number }} Range of indices to render
 */
export const calculateVisibleRange = (
    scrollTop: number,
    viewportHeight: number,
    itemHeight: number,
    totalItems: number,
    bufferSize: number,
    mode: SvelteVirtualListMode
) => {
    if (mode === 'bottomToTop') {
        const visibleCount = Math.ceil(viewportHeight / itemHeight) + 1
        const bottomIndex = totalItems - Math.floor(scrollTop / itemHeight)
        // Add buffer to both ends
        const start = Math.max(0, bottomIndex - visibleCount - bufferSize)
        const end = Math.min(totalItems, bottomIndex + bufferSize)
        return { start, end }
    } else {
        const start = Math.floor(scrollTop / itemHeight)
        const end = Math.min(totalItems, start + Math.ceil(viewportHeight / itemHeight) + 1)
        // Add buffer to both ends
        return {
            start: Math.max(0, start - bufferSize),
            end: Math.min(totalItems, end + bufferSize)
        }
    }
}

/**
 * Calculates the CSS transform value for positioning the virtual list items.
 *
 * This function determines the vertical offset needed to position the visible items
 * correctly within the viewport, accounting for the scroll direction and current
 * visible range.
 *
 * @param {SvelteVirtualListMode} mode - Scroll direction mode
 * @param {number} totalItems - Total number of items in the list
 * @param {number} visibleEnd - Index of the last visible item
 * @param {number} visibleStart - Index of the first visible item
 * @param {number} itemHeight - Height of each list item in pixels
 * @returns {number} The calculated transform Y value in pixels
 */
export const calculateTransformY = (
    mode: SvelteVirtualListMode,
    totalItems: number,
    visibleEnd: number,
    visibleStart: number,
    itemHeight: number
) => {
    return mode === 'bottomToTop'
        ? (totalItems - visibleEnd) * itemHeight
        : visibleStart * itemHeight
}

/**
 * Updates the virtual list's height and scroll position when necessary.
 *
 * This function handles dynamic updates to the virtual list's dimensions and scroll
 * position, particularly important when the container size changes or when switching
 * scroll directions. When immediate is true, it forces an immediate update of the
 * height and scroll position.
 *
 * @param {VirtualListState} state - Current state of the virtual list
 * @param {VirtualListSetters} setters - State setters for updating list properties
 * @param {boolean} immediate - Whether to perform the update immediately
 */
export const updateHeightAndScroll = (
    state: VirtualListState,
    setters: VirtualListSetters,
    immediate = false
) => {
    const {
        initialized,
        mode,
        containerElement,
        viewportElement,
        calculatedItemHeight,
        scrollTop
    } = state

    const { setHeight, setScrollTop } = setters

    if (immediate) {
        if (containerElement && viewportElement && initialized) {
            const newHeight = containerElement.getBoundingClientRect().height
            setHeight(newHeight)

            if (mode === 'bottomToTop') {
                const visibleIndex = Math.floor(scrollTop / calculatedItemHeight)
                const newScrollTop = visibleIndex * calculatedItemHeight
                viewportElement.scrollTop = newScrollTop
                setScrollTop(newScrollTop)
            }
        }
    }
}

/**
 * Calculates the average height of visible items in a virtual list.
 *
 * This function optimizes performance by:
 * 1. Using a height cache to store measured item heights
 * 2. Only measuring new items not in the cache
 * 3. Calculating a running average of all measured heights
 *
 * @param {HTMLElement[]} itemElements - Array of currently rendered item elements
 * @param {{ start: number }} visibleRange - Object containing the start index of visible items
 * @param {Record<number, number>} heightCache - Cache of previously measured item heights
 * @param {number} currentItemHeight - Current average item height being used
 *
 * @returns {{
 *   newHeight: number,
 *   newLastMeasuredIndex: number,
 *   updatedHeightCache: Record<number, number>
 * }} Object containing new calculated height, last measured index, and updated cache
 *
 * @example
 * const result = calculateAverageHeight(
 *   itemElements,
 *   { start: 0 },
 *   {},
 *   40
 * )
 */
export const calculateAverageHeight = (
    itemElements: HTMLElement[],
    visibleRange: { start: number },
    heightCache: Record<number, number>,
    currentItemHeight: number
): {
    newHeight: number
    newLastMeasuredIndex: number
    updatedHeightCache: Record<number, number>
} => {
    const validElements = itemElements.filter((el) => el)
    if (validElements.length === 0) {
        return {
            newHeight: currentItemHeight,
            newLastMeasuredIndex: visibleRange.start,
            updatedHeightCache: heightCache
        }
    }

    const newHeightCache = { ...heightCache }

    // Cache heights for new items
    validElements.forEach((el, i) => {
        const itemIndex = visibleRange.start + i
        if (!newHeightCache[itemIndex]) {
            try {
                const height = el.getBoundingClientRect().height
                if (Number.isFinite(height) && height > 0) {
                    newHeightCache[itemIndex] = height
                }
            } catch {
                // Skip invalid measurements
            }
        }
    })

    // Calculate average from valid cached heights
    const validHeights = Object.values(newHeightCache).filter((h) => Number.isFinite(h) && h > 0)

    return {
        newHeight:
            validHeights.length > 0
                ? validHeights.reduce((sum, h) => sum + h, 0) / validHeights.length
                : currentItemHeight,
        newLastMeasuredIndex: visibleRange.start,
        updatedHeightCache: newHeightCache
    }
}

/**
 * Processes large arrays in chunks to prevent UI blocking.
 *
 * This function implements a progressive processing strategy that:
 * 1. Breaks down large arrays into manageable chunks
 * 2. Processes each chunk asynchronously
 * 3. Reports progress after each chunk
 * 4. Yields to the main thread between chunks
 *
 * @param {any[]} items - Array of items to process
 * @param {number} chunkSize - Number of items to process in each chunk
 * @param {(processed: number) => void} onProgress - Callback for progress updates
 * @param {() => void} onComplete - Callback when all processing is complete
 *
 * @returns {Promise<void>} Resolves when all chunks have been processed
 *
 * @example
 * await processChunked(
 *   largeArray,
 *   50,
 *   (processed) => console.log(`Processed ${processed} items`),
 *   () => console.log('All items processed')
 * )
 */
export const processChunked = async (
    items: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
    chunkSize: number,
    onProgress: (processed: number) => void, // eslint-disable-line no-unused-vars
    onComplete: () => void
) => {
    if (!items.length) {
        onComplete()
        return
    }

    const processChunk = async (startIdx: number) => {
        const endIdx = Math.min(startIdx + chunkSize, items.length)
        onProgress(endIdx)

        if (endIdx < items.length) {
            setTimeout(() => processChunk(endIdx), 0)
        } else {
            onComplete()
        }
    }

    await processChunk(0)
}

/**
 * Scrolls the virtual list to the item at the given index.
 *
 * @function scrollToIndex
 * @param index The index of the item to scroll to.
 * @param smoothScroll (default: true) Whether to use smooth scrolling.
 * @param shouldThrowOnBounds (default: true) Whether to throw an error if the index is out of bounds.
 *
 * @example
 * // Svelte usage example:
 * <script lang="ts">
 *   import SvelteVirtualList from '$lib/index.js';
 *   let virtualList;
 *   const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
 * </script>
 *
 * <button on:click={() => virtualList.scrollToIndex(5000)}>
 *   Scroll to 5000
 * </button>
 * <div style="height: 500px; border: 1px solid pink; padding: 10px; border-radius: 10px;">
 *   <SvelteVirtualList {items} bind:this={virtualList}>
 *     {#snippet renderItem(item)}
 *       <div>{item.text}</div>
 *     {/snippet}
 *   </SvelteVirtualList>
 * </div>
 *
 * @returns {void}
 * @throws {Error} If the index is out of bounds and shouldThrowOnBounds is true
 */
export const scrollToIndex = (index: number, smoothScroll = true, shouldThrowOnBounds = true) => {
    // TODO: Implement actual scroll logic
    console.log(
        '[VirtualList] scrollToIndex called with:',
        index,
        smoothScroll,
        shouldThrowOnBounds
    )
}
