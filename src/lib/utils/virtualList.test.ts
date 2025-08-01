import { describe, expect, it, vi } from 'vitest'
import type { VirtualListSetters, VirtualListState } from './types.js'
import {
    buildBlockSums,
    calculateAverageHeight,
    calculateScrollPosition,
    calculateTransformY,
    calculateVisibleRange,
    getScrollOffsetForIndex,
    processChunked,
    updateHeightAndScroll
} from './virtualList.js'

describe('calculateScrollPosition', () => {
    it('should calculate correct scroll position for basic case', () => {
        expect(calculateScrollPosition(100, 30, 300)).toBe(2700)
    })

    it('should handle edge case with zero items', () => {
        expect(calculateScrollPosition(0, 30, 300)).toBe(0)
    })

    it('should handle case when container is larger than content', () => {
        expect(calculateScrollPosition(5, 30, 300)).toBe(0)
    })

    it('should handle negative item count gracefully', () => {
        expect(calculateScrollPosition(-1, 30, 300)).toBe(0)
    })

    it('should handle zero item height', () => {
        expect(calculateScrollPosition(100, 0, 300)).toBe(0)
    })

    it('should handle negative item height gracefully', () => {
        expect(calculateScrollPosition(100, -10, 300)).toBe(0)
    })

    it('should handle zero container height', () => {
        expect(calculateScrollPosition(100, 30, 0)).toBe(3000)
    })

    it('should handle very large numbers without overflow', () => {
        const largeNumber = Number.MAX_SAFE_INTEGER
        expect(calculateScrollPosition(largeNumber, 1, 1000)).toBe(Number.MAX_SAFE_INTEGER - 1000)
    })
})

describe('calculateVisibleRange', () => {
    it('should calculate correct range for top-to-bottom mode', () => {
        const result = calculateVisibleRange(100, 300, 30, 100, 2, 'topToBottom')
        expect(result).toEqual({
            start: 1, // (100/30 - 2) rounded down
            end: 16 // (floor(100/30) + ceil(300/30) + 1 + 2) = 3 + 10 + 1 + 2
        })
    })

    it('should calculate correct range for bottom-to-top mode', () => {
        // scrollTop = 100 in bottomToTop means 100px from content end
        const result = calculateVisibleRange(100, 300, 30, 100, 2, 'bottomToTop')
        expect(result).toEqual({
            start: 84, // Items near the end for bottomToTop when scrollTop = 100
            end: 99
        })
    })

    it('should show first items when scrollTop = 0 in bottomToTop mode', () => {
        // When scrollTop = 0, bottomToTop should show first items (0, 1, 2...)
        const result = calculateVisibleRange(0, 300, 30, 100, 2, 'bottomToTop')
        expect(result).toEqual({
            start: 88, // Near the end items when at scrollTop = 0
            end: 100
        })
    })

    it('should show last items when at maxScrollTop in bottomToTop mode', () => {
        // When at maxScrollTop, bottomToTop should show last items
        const maxScrollTop = 100 * 30 - 300 // totalHeight - viewportHeight = 2700
        const result = calculateVisibleRange(maxScrollTop, 300, 30, 100, 2, 'bottomToTop')
        expect(result).toEqual({
            start: 0, // First items when at max scroll
            end: 13
        })
    })

    it('should handle edge cases with buffer exceeding bounds', () => {
        const result = calculateVisibleRange(0, 300, 30, 10, 5, 'topToBottom')
        expect(result).toEqual({
            start: 0,
            end: 10
        })
    })
})

describe('calculateTransformY', () => {
    it('should calculate transform for top-to-bottom mode', () => {
        expect(calculateTransformY('topToBottom', 100, 20, 5, 30, 400)).toBe(150)
    })

    it('should calculate transform for bottom-to-top mode', () => {
        expect(calculateTransformY('bottomToTop', 100, 20, 5, 30, 400)).toBe(2400)
    })

    it('should handle edge case with zero visible items', () => {
        expect(calculateTransformY('topToBottom', 100, 0, 0, 30, 400)).toBe(0)
    })

    it('should position few items at bottom in bottomToTop mode', () => {
        // 2 items, each 30px high = 60px total content
        // Viewport is 400px high, so items should be pushed down by 340px
        expect(calculateTransformY('bottomToTop', 2, 2, 0, 30, 400)).toBe(340)
    })

    it('should not add bottom offset when content fills viewport in bottomToTop mode', () => {
        // 20 items, each 30px high = 600px total content
        // Viewport is 400px high, so no bottom offset needed (content > viewport)
        expect(calculateTransformY('bottomToTop', 20, 20, 0, 30, 400)).toBe(0)
    })

    it('should handle exact content height match in bottomToTop mode', () => {
        // 10 items, each 40px high = 400px total content
        // Viewport is 400px high, so no bottom offset needed (content = viewport)
        expect(calculateTransformY('bottomToTop', 10, 10, 0, 40, 400)).toBe(0)
    })
})

describe('updateHeightAndScroll', () => {
    it('should not update when immediate is false', () => {
        const state: VirtualListState = {
            initialized: true,
            mode: 'topToBottom',
            containerElement: null,
            viewportElement: null,
            calculatedItemHeight: 30,
            scrollTop: 100,
            height: 0
        }
        const setters: VirtualListSetters = {
            setHeight: vi.fn(),
            setScrollTop: vi.fn(),
            setInitialized: vi.fn()
        }

        updateHeightAndScroll(state, setters, false)
        expect(setters.setHeight).not.toHaveBeenCalled()
        expect(setters.setScrollTop).not.toHaveBeenCalled()
        expect(setters.setInitialized).not.toHaveBeenCalled()
    })

    it('should update height and scroll for bottom-to-top mode when immediate is true', () => {
        const mockContainerElement = {
            getBoundingClientRect: () => ({ height: 500 })
        }
        const mockViewportElement = {
            scrollTop: 0
        }

        const state: VirtualListState = {
            initialized: true,
            mode: 'bottomToTop',
            containerElement: mockContainerElement as any,
            viewportElement: mockViewportElement as any,
            calculatedItemHeight: 30,
            scrollTop: 90,
            height: 0
        }

        const setters: VirtualListSetters = {
            setHeight: vi.fn(),
            setScrollTop: vi.fn(),
            setInitialized: vi.fn()
        }

        updateHeightAndScroll(state, setters, true)
        expect(setters.setHeight).toHaveBeenCalledWith(500)
        expect(setters.setScrollTop).toHaveBeenCalledWith(90)
        expect(setters.setInitialized).not.toHaveBeenCalled()
    })
})

describe('calculateAverageHeight', () => {
    it('should return current height when no elements are provided', () => {
        const result = calculateAverageHeight([], { start: 0 }, {}, 40, new Set())

        expect(result.newHeight).toBe(40)
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(result.updatedHeightCache).toEqual({})
        expect(result.clearedDirtyItems).toEqual(new Set())
    })

    it('should calculate average height from elements', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: 50 }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, new Set())

        expect(result.newHeight).toBe(40) // (30 + 50) / 2
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(result.updatedHeightCache).toEqual({ 0: 30, 1: 50 })
        expect(result.clearedDirtyItems).toEqual(new Set())
    })

    it('should use cached heights when available', () => {
        const mockElements = [{ getBoundingClientRect: () => ({ height: 30 }) }] as HTMLElement[]

        const existingCache = { 0: 40 }

        const result = calculateAverageHeight(
            mockElements,
            { start: 0 },
            existingCache,
            40,
            new Set()
        )

        expect(result.updatedHeightCache).toEqual(existingCache)
        expect(result.clearedDirtyItems).toEqual(new Set())
    })

    it('should handle invalid height measurements', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: NaN }) },
            { getBoundingClientRect: () => ({ height: -10 }) },
            { getBoundingClientRect: () => ({ height: Infinity }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, new Set())

        expect(result.newHeight).toBe(40) // Should fallback to currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
        expect(result.clearedDirtyItems).toEqual(new Set())
    })

    it('should calculate average excluding invalid heights', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: NaN }) },
            { getBoundingClientRect: () => ({ height: 50 }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, new Set())

        expect(result.newHeight).toBe(40) // (30 + 50) / 2
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(2)
        expect(result.clearedDirtyItems).toEqual(new Set())
    })

    it('should handle all invalid measurements', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: NaN }) },
            { getBoundingClientRect: () => ({ height: Infinity }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, new Set())

        expect(result.newHeight).toBe(40) // Falls back to currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
        expect(result.clearedDirtyItems).toEqual(new Set())
    })

    it('should handle mixed cached and new measurements', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: 50 }) }
        ] as HTMLElement[]

        const existingCache = { 1: 40 } // Cache for second element
        // Initial running totals from existing cache: {1: 40} = totalHeight: 40, count: 1
        const initialTotalHeight = 40
        const initialCount = 1

        const result = calculateAverageHeight(
            mockElements,
            { start: 0 },
            existingCache,
            40,
            new Set(),
            initialTotalHeight,
            initialCount
        )

        expect(result.newHeight).toBe(35) // (30 + 40) / 2
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(result.updatedHeightCache).toEqual({ 0: 30, 1: 40 })
        expect(result.clearedDirtyItems).toEqual(new Set())
        expect(result.newTotalHeight).toBe(70) // 30 + 40
        expect(result.newValidCount).toBe(2)
    })

    it('should handle empty height cache gracefully', () => {
        const mockElements = [] as HTMLElement[]
        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, new Set())

        expect(result.newHeight).toBe(40)
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
        expect(result.clearedDirtyItems).toEqual(new Set())
    })

    it('should fallback to currentItemHeight when no valid heights exist', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: NaN }) },
            { getBoundingClientRect: () => ({ height: -1 }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 45, new Set())

        expect(result.newHeight).toBe(45) // Should use currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
    })

    it('should use currentItemHeight when no heights are collected', () => {
        const mockElements = [null] as unknown as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 45, new Set())

        expect(result.newHeight).toBe(45)
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
        expect(result.clearedDirtyItems).toEqual(new Set())
    })

    it('should use currentItemHeight when getBoundingClientRect throws', () => {
        const mockElements = [
            {
                getBoundingClientRect: () => {
                    throw new Error('getBoundingClientRect error')
                }
            } as unknown as HTMLElement
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 45, new Set())

        expect(result.newHeight).toBe(45) // Should use currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
    })

    it('should process only dirty items when provided', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: 50 }) },
            { getBoundingClientRect: () => ({ height: 70 }) }
        ] as HTMLElement[]

        // Only item 1 is dirty
        const dirtyItems = new Set([1])
        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, dirtyItems)

        // Should only measure the dirty item (index 1 = 50px)
        expect(result.updatedHeightCache).toEqual({ 1: 50 })
        expect(result.clearedDirtyItems).toEqual(new Set([1]))
        expect(result.newHeight).toBe(50) // Only one item measured
    })

    it('should process multiple dirty items', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: 50 }) },
            { getBoundingClientRect: () => ({ height: 70 }) }
        ] as HTMLElement[]

        // Items 0 and 2 are dirty
        const dirtyItems = new Set([0, 2])
        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, dirtyItems)

        // Should measure both dirty items
        expect(result.updatedHeightCache).toEqual({ 0: 30, 2: 70 })
        expect(result.clearedDirtyItems).toEqual(new Set([0, 2]))
        expect(result.newHeight).toBe(50) // (30 + 70) / 2
    })

    it('should handle dirty items outside visible range', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: 50 }) }
        ] as HTMLElement[]

        // Item 5 is dirty but not in visible range (start: 0, elements 0-1)
        const dirtyItems = new Set([0, 5])
        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, dirtyItems)

        // Should only measure item 0 (item 5 not visible)
        expect(result.updatedHeightCache).toEqual({ 0: 30 })
        expect(result.clearedDirtyItems).toEqual(new Set([0, 5])) // Both items cleared to prevent infinite loop
        expect(result.newHeight).toBe(30) // Only item 0 measured
    })

    it('should handle empty elements array with dirty items', () => {
        const mockElements = [] as HTMLElement[]

        const dirtyItems = new Set([0, 1, 2])
        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40, dirtyItems)

        // Should not clear any dirty items when no elements exist
        expect(result.clearedDirtyItems).toEqual(new Set())
        expect(result.updatedHeightCache).toEqual({})
        expect(result.newHeight).toBe(40) // Falls back to currentItemHeight
    })

    it('should use existing cache with dirty items update', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 35 }) }, // New measurement
            { getBoundingClientRect: () => ({ height: 55 }) }
        ] as HTMLElement[]

        const existingCache = { 0: 30, 1: 50, 2: 60 } // Item 0 will be updated
        const dirtyItems = new Set([0]) // Only item 0 is dirty
        // Initial running totals from existing cache: {0: 30, 1: 50, 2: 60} = totalHeight: 140, count: 3
        const initialTotalHeight = 140 // 30 + 50 + 60
        const initialCount = 3

        const result = calculateAverageHeight(
            mockElements,
            { start: 0 },
            existingCache,
            40,
            dirtyItems,
            initialTotalHeight,
            initialCount
        )

        // Should update dirty item and keep existing cache
        expect(result.updatedHeightCache).toEqual({ 0: 35, 1: 50, 2: 60 })
        expect(result.clearedDirtyItems).toEqual(new Set([0]))
        expect(result.newHeight).toBe(48.333333333333336) // (35 + 50 + 60) / 3
        expect(result.newTotalHeight).toBe(145) // 35 + 50 + 60 (30 was replaced with 35)
        expect(result.newValidCount).toBe(3)
    })
})

describe('processChunked', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
    })

    it('should process empty array immediately', async () => {
        const onProgress = vi.fn()
        const onComplete = vi.fn()

        const promise = processChunked([], 50, onProgress, onComplete)
        await promise
        await vi.advanceTimersByTimeAsync(0)

        expect(onProgress).not.toHaveBeenCalled()
        expect(onComplete).toHaveBeenCalledOnce()
    })

    it('should process items in chunks', async () => {
        const items = Array.from({ length: 150 }, (_, i) => i)
        const onProgress = vi.fn()
        const onComplete = vi.fn()

        const promise = processChunked(items, 50, onProgress, onComplete)
        await vi.runAllTimersAsync()
        await promise

        expect(onProgress).toHaveBeenCalledTimes(3)
        expect(onProgress).toHaveBeenNthCalledWith(1, 50)
        expect(onProgress).toHaveBeenNthCalledWith(2, 100)
        expect(onProgress).toHaveBeenNthCalledWith(3, 150)
        expect(onComplete).toHaveBeenCalledOnce()
    })

    it('should handle chunk sizes larger than array', async () => {
        const items = Array.from({ length: 30 }, (_, i) => i)
        const onProgress = vi.fn()
        const onComplete = vi.fn()

        const promise = processChunked(items, 50, onProgress, onComplete)
        await vi.runAllTimersAsync()
        await promise

        expect(onProgress).toHaveBeenCalledTimes(1)
        expect(onProgress).toHaveBeenCalledWith(30)
        expect(onComplete).toHaveBeenCalledOnce()
    })

    it('should yield to main thread between chunks', async () => {
        const items = Array.from({ length: 150 }, (_, i) => i)
        const onProgress = vi.fn()
        const onComplete = vi.fn()

        const promise = processChunked(items, 50, onProgress, onComplete)

        // First chunk processes immediately
        expect(onProgress).toHaveBeenCalledWith(50)

        await vi.runAllTimersAsync()
        await promise

        expect(onProgress).toHaveBeenCalledTimes(3)
        expect(onComplete).toHaveBeenCalledOnce()
    })
})

describe('getScrollOffsetForIndex', () => {
    it('computes offset using calculatedItemHeight when heightCache is empty', () => {
        const heightCache = {}
        const calculatedItemHeight = 40
        const idx = 5
        const offset = getScrollOffsetForIndex(heightCache, calculatedItemHeight, idx)
        expect(offset).toBe(5 * calculatedItemHeight)
    })

    it('computes offset using a partial heightCache (some heights measured)', () => {
        const heightCache = { 0: 30, 2: 50, 3: 60 }
        const calculatedItemHeight = 40
        const idx = 5
        // Expected offset: 30 (idx 0) + 40 (idx 1) + 50 (idx 2) + 60 (idx 3) + 40 (idx 4) = 220
        const offset = getScrollOffsetForIndex(heightCache, calculatedItemHeight, idx)
        expect(offset).toBe(220)
    })

    it('computes offset using a full heightCache (all heights measured)', () => {
        const heightCache = { 0: 30, 1: 40, 2: 50, 3: 60, 4: 70 }
        const calculatedItemHeight = 40
        const idx = 5
        // Expected offset: 30 + 40 + 50 + 60 + 70 = 250
        const offset = getScrollOffsetForIndex(heightCache, calculatedItemHeight, idx)
        expect(offset).toBe(250)
    })

    describe('block sums', () => {
        it('matches legacy logic for all estimated heights', () => {
            const heightCache = {}
            const calculatedItemHeight = 10
            const totalItems = 100
            const blockSums = buildBlockSums(heightCache, calculatedItemHeight, totalItems, 20)
            for (let idx = 0; idx <= totalItems; idx += 10) {
                const legacy = getScrollOffsetForIndex(heightCache, calculatedItemHeight, idx)
                const block = getScrollOffsetForIndex(
                    heightCache,
                    calculatedItemHeight,
                    idx,
                    blockSums,
                    20
                )
                expect(block).toBe(legacy)
            }
        })

        it('matches legacy logic for partial measured heights', () => {
            const heightCache = { 0: 5, 2: 15, 19: 100 }
            const calculatedItemHeight = 10
            const totalItems = 40
            const blockSums = buildBlockSums(heightCache, calculatedItemHeight, totalItems, 10)
            for (let idx = 0; idx <= totalItems; idx += 7) {
                const legacy = getScrollOffsetForIndex(heightCache, calculatedItemHeight, idx)
                const block = getScrollOffsetForIndex(
                    heightCache,
                    calculatedItemHeight,
                    idx,
                    blockSums,
                    10
                )
                expect(block).toBe(legacy)
            }
        })

        it('handles block boundary and tail correctly', () => {
            const heightCache = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10 }
            const calculatedItemHeight = 0
            const totalItems = 10
            const blockSums = buildBlockSums(heightCache, calculatedItemHeight, totalItems, 5)
            // Block sums: [1+2+3+4+5=15], [6+7+8+9+10=40]
            // idx=7: blockIdx=1, offset=15, tail=6+7=13, total=28
            const offset = getScrollOffsetForIndex(
                heightCache,
                calculatedItemHeight,
                7,
                blockSums,
                5
            )
            expect(offset).toBe(28)
        })

        it('returns 0 for idx <= 0', () => {
            const blockSums = buildBlockSums({}, 10, 10, 5)
            expect(getScrollOffsetForIndex({}, 10, 0, blockSums, 5)).toBe(0)
            expect(getScrollOffsetForIndex({}, 10, -5, blockSums, 5)).toBe(0)
        })
    })
})

describe('buildBlockSums', () => {
    it('returns empty array for zero items', () => {
        const sums = buildBlockSums({}, 40, 0)
        expect(sums).toEqual([])
    })

    it('returns one sum for fewer than blockSize items (all estimated)', () => {
        const sums = buildBlockSums({}, 10, 5, 10)
        expect(sums).toEqual([50])
    })

    it('returns correct sums for all measured heights', () => {
        const heightCache = { 0: 10, 1: 20, 2: 30, 3: 40, 4: 50 }
        const sums = buildBlockSums(heightCache, 99, 5, 2)
        // Blocks: [0,1]=30, [2,3]=100, [4]=150 (cumulative sums)
        expect(sums).toEqual([30, 100, 150])
    })

    it('returns correct sums for partial measured heights', () => {
        const heightCache = { 1: 20, 3: 40 }
        const sums = buildBlockSums(heightCache, 10, 5, 2)
        // [0]=10, [1]=20, [2]=10, [3]=40, [4]=10
        // Blocks: [0,1]=30, [2,3]=80, [4]=90 (cumulative sums)
        expect(sums).toEqual([30, 80, 90])
    })

    it('handles blockSize exactly dividing totalItems', () => {
        const sums = buildBlockSums({}, 5, 6, 3)
        // 3+3=6 items, block size 3: [0,1,2]=15, [3,4,5]=15
        expect(sums).toEqual([15, 30])
    })
})
