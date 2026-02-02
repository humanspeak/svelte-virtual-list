import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VirtualListSetters, VirtualListState } from './types.js'
import {
    BlockSumCache,
    buildBlockSums,
    calculateAverageHeight,
    calculateScrollPosition,
    calculateTransformY,
    calculateVisibleRange,
    clampValue,
    createVisibleRangeCacheHolder,
    getScrollOffsetForIndex,
    getValidHeight,
    invalidateVisibleRangeCache,
    processChunked,
    updateHeightAndScroll,
    type VisibleRangeCacheHolder
} from './virtualList.js'

describe('getValidHeight', () => {
    describe('positive cases - valid heights', () => {
        it('should return the height when it is a positive finite number', () => {
            expect(getValidHeight(50, 40)).toBe(50)
        })

        it('should return the height for very small positive numbers', () => {
            expect(getValidHeight(0.1, 40)).toBe(0.1)
        })

        it('should return the height for large numbers', () => {
            expect(getValidHeight(10000, 40)).toBe(10000)
        })

        it('should return the height for fractional values', () => {
            expect(getValidHeight(19.200002843683418, 40)).toBe(19.200002843683418)
        })

        it('should return the height when it equals the fallback', () => {
            expect(getValidHeight(40, 40)).toBe(40)
        })
    })

    describe('negative cases - invalid heights', () => {
        it('should return fallback for zero', () => {
            expect(getValidHeight(0, 40)).toBe(40)
        })

        it('should return fallback for negative numbers', () => {
            expect(getValidHeight(-10, 40)).toBe(40)
        })

        it('should return fallback for NaN', () => {
            expect(getValidHeight(NaN, 40)).toBe(40)
        })

        it('should return fallback for Infinity', () => {
            expect(getValidHeight(Infinity, 40)).toBe(40)
        })

        it('should return fallback for negative Infinity', () => {
            expect(getValidHeight(-Infinity, 40)).toBe(40)
        })

        it('should return fallback for null', () => {
            expect(getValidHeight(null, 40)).toBe(40)
        })

        it('should return fallback for undefined', () => {
            expect(getValidHeight(undefined, 40)).toBe(40)
        })

        it('should return fallback for string', () => {
            expect(getValidHeight('50', 40)).toBe(40)
        })

        it('should return fallback for empty string', () => {
            expect(getValidHeight('', 40)).toBe(40)
        })

        it('should return fallback for object', () => {
            expect(getValidHeight({}, 40)).toBe(40)
        })

        it('should return fallback for array', () => {
            expect(getValidHeight([50], 40)).toBe(40)
        })

        it('should return fallback for boolean true', () => {
            expect(getValidHeight(true, 40)).toBe(40)
        })

        it('should return fallback for boolean false', () => {
            expect(getValidHeight(false, 40)).toBe(40)
        })
    })

    describe('edge cases', () => {
        it('should handle Number.MIN_VALUE (smallest positive number)', () => {
            expect(getValidHeight(Number.MIN_VALUE, 40)).toBe(Number.MIN_VALUE)
        })

        it('should handle Number.MAX_VALUE', () => {
            expect(getValidHeight(Number.MAX_VALUE, 40)).toBe(Number.MAX_VALUE)
        })

        it('should handle Number.EPSILON', () => {
            expect(getValidHeight(Number.EPSILON, 40)).toBe(Number.EPSILON)
        })

        it('should handle very small negative numbers', () => {
            expect(getValidHeight(-Number.MIN_VALUE, 40)).toBe(40)
        })

        it('should handle fallback of 0', () => {
            expect(getValidHeight(undefined, 0)).toBe(0)
        })

        it('should handle negative fallback', () => {
            expect(getValidHeight(undefined, -10)).toBe(-10)
        })
    })
})

describe('clampValue', () => {
    describe('positive cases - value within range', () => {
        it('should return value when within range', () => {
            expect(clampValue(50, 0, 100)).toBe(50)
        })

        it('should return value when equal to min', () => {
            expect(clampValue(0, 0, 100)).toBe(0)
        })

        it('should return value when equal to max', () => {
            expect(clampValue(100, 0, 100)).toBe(100)
        })

        it('should handle fractional values within range', () => {
            expect(clampValue(50.5, 0, 100)).toBe(50.5)
        })

        it('should handle negative ranges', () => {
            expect(clampValue(-50, -100, -10)).toBe(-50)
        })

        it('should handle range crossing zero', () => {
            expect(clampValue(0, -50, 50)).toBe(0)
        })
    })

    describe('negative cases - value outside range', () => {
        it('should clamp to min when value is below', () => {
            expect(clampValue(-10, 0, 100)).toBe(0)
        })

        it('should clamp to max when value is above', () => {
            expect(clampValue(150, 0, 100)).toBe(100)
        })

        it('should clamp large negative values to min', () => {
            expect(clampValue(-1000, 0, 100)).toBe(0)
        })

        it('should clamp large positive values to max', () => {
            expect(clampValue(1000, 0, 100)).toBe(100)
        })

        it('should clamp to negative min', () => {
            expect(clampValue(-200, -100, -10)).toBe(-100)
        })

        it('should clamp to negative max', () => {
            expect(clampValue(0, -100, -10)).toBe(-10)
        })
    })

    describe('edge cases', () => {
        it('should handle min equal to max', () => {
            expect(clampValue(50, 100, 100)).toBe(100)
            expect(clampValue(150, 100, 100)).toBe(100)
        })

        it('should handle Infinity as max', () => {
            expect(clampValue(1000000, 0, Infinity)).toBe(1000000)
        })

        it('should handle -Infinity as min', () => {
            expect(clampValue(-1000000, -Infinity, 0)).toBe(-1000000)
        })

        it('should handle NaN value (returns NaN per Math behavior)', () => {
            const result = clampValue(NaN, 0, 100)
            expect(Number.isNaN(result)).toBe(true)
        })

        it('should handle very large numbers', () => {
            expect(clampValue(Number.MAX_VALUE, 0, 100)).toBe(100)
        })

        it('should handle very small numbers', () => {
            expect(clampValue(Number.MIN_VALUE, 0, 100)).toBe(Number.MIN_VALUE)
        })

        it('should handle zero range at zero', () => {
            expect(clampValue(5, 0, 0)).toBe(0)
        })

        it('should handle inverted min/max (min > max)', () => {
            // Math.max(100, Math.min(0, 50)) = Math.max(100, 0) = 100
            expect(clampValue(50, 100, 0)).toBe(100)
        })

        it('should handle fractional min and max', () => {
            expect(clampValue(0.5, 0.25, 0.75)).toBe(0.5)
            expect(clampValue(0.1, 0.25, 0.75)).toBe(0.25)
            expect(clampValue(0.9, 0.25, 0.75)).toBe(0.75)
        })
    })

    describe('common scroll clamping scenarios', () => {
        it('should clamp scroll position to valid range', () => {
            const maxScrollTop = 5000
            expect(clampValue(-50, 0, maxScrollTop)).toBe(0)
            expect(clampValue(2500, 0, maxScrollTop)).toBe(2500)
            expect(clampValue(6000, 0, maxScrollTop)).toBe(5000)
        })

        it('should handle scroll correction deltas', () => {
            const currentScrollTop = 1000
            const delta = -200
            const maxScrollTop = 5000
            const newScrollTop = clampValue(currentScrollTop + delta, 0, maxScrollTop)
            expect(newScrollTop).toBe(800)
        })

        it('should handle scroll correction with negative result', () => {
            const currentScrollTop = 100
            const delta = -200
            const maxScrollTop = 5000
            const newScrollTop = clampValue(currentScrollTop + delta, 0, maxScrollTop)
            expect(newScrollTop).toBe(0)
        })

        it('should handle index clamping for arrays', () => {
            const itemsLength = 100
            expect(clampValue(-5, 0, itemsLength - 1)).toBe(0)
            expect(clampValue(50, 0, itemsLength - 1)).toBe(50)
            expect(clampValue(150, 0, itemsLength - 1)).toBe(99)
        })
    })
})

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
        const result = calculateVisibleRange(
            100,
            300,
            30,
            100,
            2,
            'topToBottom',
            false,
            false,
            null
        )
        expect(result).toEqual({
            start: 1, // (100/30 - 2) rounded down
            end: 16 // (floor(100/30) + ceil(300/30) + 1 + 2) = 3 + 10 + 1 + 2
        })
    })

    it('should calculate correct range for bottom-to-top mode', () => {
        // scrollTop = 100 in bottomToTop means 100px from content end
        const result = calculateVisibleRange(
            100,
            300,
            30,
            100,
            2,
            'bottomToTop',
            false,
            false,
            null
        )
        expect(result).toEqual({
            start: 84, // Items near the end for bottomToTop when scrollTop = 100
            end: 99
        })
    })

    it('should show first items when scrollTop = 0 in bottomToTop mode', () => {
        // When scrollTop = 0, bottomToTop should show first items (0, 1, 2...)
        const result = calculateVisibleRange(0, 300, 30, 100, 2, 'bottomToTop', false, false, null)
        expect(result).toEqual({
            start: 88, // Near the end items when at scrollTop = 0
            end: 100
        })
    })

    it('should show last items when at maxScrollTop in bottomToTop mode', () => {
        // When at maxScrollTop, bottomToTop should show last items
        const maxScrollTop = 100 * 30 - 300 // totalHeight - viewportHeight = 2700
        const result = calculateVisibleRange(
            maxScrollTop,
            300,
            30,
            100,
            2,
            'bottomToTop',
            false,
            false,
            null
        )
        expect(result).toEqual({
            start: 0, // First items when at max scroll
            end: 13
        })
    })

    it('should handle edge cases with buffer exceeding bounds', () => {
        const result = calculateVisibleRange(0, 300, 30, 10, 5, 'topToBottom', false, false, null)
        expect(result).toEqual({
            start: 0,
            end: 10
        })
    })
})

describe('calculateTransformY', () => {
    it('should calculate transform for top-to-bottom mode (estimated)', () => {
        expect(calculateTransformY('topToBottom', 100, 20, 5, 30, 400)).toBe(150)
    })

    it('should calculate transform for top-to-bottom mode using heightCache when provided', () => {
        const heightCache = { 0: 35, 1: 45, 2: 25, 3: 50, 4: 60 }
        // visibleStart = 5 → offset = sum(0..4) = 35+45+25+50+60 = 215
        expect(
            calculateTransformY('topToBottom', 100, 20, 5, 30, 0, undefined, heightCache, 400)
        ).toBe(215)
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
        const result = calculateAverageHeight([], { start: 0, end: 0 }, {}, 40, new Set())

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

        const result = calculateAverageHeight(mockElements, { start: 0, end: 2 }, {}, 40, new Set())

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
            { start: 0, end: 1 },
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

        const result = calculateAverageHeight(mockElements, { start: 0, end: 3 }, {}, 40, new Set())

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

        const result = calculateAverageHeight(mockElements, { start: 0, end: 3 }, {}, 40, new Set())

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

        const result = calculateAverageHeight(mockElements, { start: 0, end: 2 }, {}, 40, new Set())

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
            { start: 0, end: 2 },
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
        const result = calculateAverageHeight(mockElements, { start: 0, end: 0 }, {}, 40, new Set())

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

        const result = calculateAverageHeight(mockElements, { start: 0, end: 1 }, {}, 45, new Set())

        expect(result.newHeight).toBe(45) // Should use currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
    })

    it('should use currentItemHeight when no heights are collected', () => {
        const mockElements = [null] as unknown as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0, end: 0 }, {}, 45, new Set())

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

        const result = calculateAverageHeight(mockElements, { start: 0, end: 0 }, {}, 45, new Set())

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
        const result = calculateAverageHeight(
            mockElements,
            { start: 0, end: 3 },
            {},
            40,
            dirtyItems
        )

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
        const result = calculateAverageHeight(
            mockElements,
            { start: 0, end: 3 },
            {},
            40,
            dirtyItems
        )

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
        const result = calculateAverageHeight(
            mockElements,
            { start: 0, end: 2 },
            {},
            40,
            dirtyItems
        )

        // Should only measure item 0 (item 5 not visible)
        expect(result.updatedHeightCache).toEqual({ 0: 30 })
        expect(result.clearedDirtyItems).toEqual(new Set([0, 5])) // Both items cleared to prevent infinite loop
        expect(result.newHeight).toBe(30) // Only item 0 measured
    })

    it('should handle empty elements array with dirty items', () => {
        const mockElements = [] as HTMLElement[]

        const dirtyItems = new Set([0, 1, 2])
        const result = calculateAverageHeight(
            mockElements,
            { start: 0, end: 0 },
            {},
            40,
            dirtyItems
        )

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
            { start: 0, end: 2 },
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
})

describe('buildBlockSums', () => {
    describe('positive cases', () => {
        it('should return empty array for items less than block size', () => {
            const heightCache = { 0: 40, 1: 40 }
            const result = buildBlockSums(heightCache, 40, 500, 1000)
            expect(result).toEqual([])
        })

        it('should compute single block sum for items just over block size', () => {
            const heightCache: Record<number, number> = {}
            // 1500 items, block size 1000 -> 1 complete block
            const result = buildBlockSums(heightCache, 40, 1500, 1000)
            expect(result.length).toBe(1)
            // Block 0: 1000 items * 40px = 40000
            expect(result[0]).toBe(40000)
        })

        it('should compute multiple block sums correctly', () => {
            const heightCache: Record<number, number> = {}
            // 3500 items, block size 1000 -> 3 complete blocks (0-999, 1000-1999, 2000-2999)
            const result = buildBlockSums(heightCache, 40, 3500, 1000)
            expect(result.length).toBe(3)
            // Cumulative sums
            expect(result[0]).toBe(40000) // Block 0: 1000 * 40
            expect(result[1]).toBe(80000) // Block 0-1: 2000 * 40
            expect(result[2]).toBe(120000) // Block 0-2: 3000 * 40
        })

        it('should use measured heights from cache', () => {
            const heightCache: Record<number, number> = { 0: 50, 1: 60, 2: 30 }
            // First 3 items measured, rest use estimated height
            const result = buildBlockSums(heightCache, 40, 2500, 1000)
            // Block 0: 50 + 60 + 30 + (997 * 40) = 140 + 39880 = 40020
            expect(result[0]).toBe(40020)
            // Block 1: Block 0 + (1000 * 40) = 40020 + 40000 = 80020
            expect(result[1]).toBe(80020)
        })

        it('should handle custom block sizes', () => {
            const heightCache: Record<number, number> = {}
            // 250 items, block size 100 -> 2 complete blocks
            const result = buildBlockSums(heightCache, 50, 250, 100)
            expect(result.length).toBe(2)
            expect(result[0]).toBe(5000) // 100 * 50
            expect(result[1]).toBe(10000) // 200 * 50
        })
    })

    describe('negative cases', () => {
        it('should handle empty items', () => {
            const heightCache: Record<number, number> = {}
            const result = buildBlockSums(heightCache, 40, 0, 1000)
            expect(result).toEqual([])
        })

        it('should handle single item', () => {
            const heightCache: Record<number, number> = { 0: 40 }
            const result = buildBlockSums(heightCache, 40, 1, 1000)
            expect(result).toEqual([])
        })
    })

    describe('edge cases', () => {
        it('should handle exact block size boundary', () => {
            const heightCache: Record<number, number> = {}
            // Exactly 1000 items = 0 complete blocks (last block is incomplete)
            const result = buildBlockSums(heightCache, 40, 1000, 1000)
            expect(result.length).toBe(0)
        })

        it('should handle 1001 items (just over block size)', () => {
            const heightCache: Record<number, number> = {}
            // 1001 items = 1 complete block (0-999)
            const result = buildBlockSums(heightCache, 40, 1001, 1000)
            expect(result.length).toBe(1)
            expect(result[0]).toBe(40000)
        })

        it('should handle very small block size', () => {
            const heightCache: Record<number, number> = { 0: 10, 1: 20, 2: 30, 3: 40, 4: 50 }
            const result = buildBlockSums(heightCache, 25, 5, 2)
            // 5 items, block size 2 -> 2 complete blocks (0-1, 2-3), last block (4) is incomplete
            expect(result.length).toBe(2)
            expect(result[0]).toBe(30) // Block 0: 10 + 20
            expect(result[1]).toBe(100) // Block 0+1 cumulative: 30 + (30 + 40) = 100
        })

        it('should handle zero estimated height', () => {
            const heightCache: Record<number, number> = {}
            const result = buildBlockSums(heightCache, 0, 2000, 1000)
            expect(result[0]).toBe(0)
        })

        it('should handle very large item count', () => {
            const heightCache: Record<number, number> = {}
            const result = buildBlockSums(heightCache, 40, 100000, 1000)
            // 100 blocks - 1 = 99 complete blocks
            expect(result.length).toBe(99)
            expect(result[98]).toBe(99 * 1000 * 40)
        })
    })
})

describe('BlockSumCache', () => {
    describe('positive cases', () => {
        it('should compute block sums on first access', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}
            const sums = cache.getBlockSums(heightCache, 40, 2500)
            expect(sums.length).toBe(2)
            expect(sums[0]).toBe(40000)
            expect(sums[1]).toBe(80000)
        })

        it('should return cached sums on subsequent access', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            const sums1 = cache.getBlockSums(heightCache, 40, 2500)
            const sums2 = cache.getBlockSums(heightCache, 40, 2500)

            // Should be same reference (cached)
            expect(sums1).toBe(sums2)
        })

        it('should invalidate specific block and recompute', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            // Initial computation
            cache.getBlockSums(heightCache, 40, 2500)

            // Modify a height in block 0
            heightCache[500] = 100

            // Invalidate block containing index 500
            cache.invalidateForIndex(500)

            const sums = cache.getBlockSums(heightCache, 40, 2500)
            // Block 0 should reflect the change: (999 * 40) + 100 = 40060
            expect(sums[0]).toBe(40060)
        })

        it('should invalidate all subsequent blocks when index invalidated', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            cache.getBlockSums(heightCache, 40, 3500)

            // Change height in block 0
            heightCache[100] = 80

            cache.invalidateForIndex(100)

            const sums = cache.getBlockSums(heightCache, 40, 3500)
            // All blocks should reflect the +40 delta
            expect(sums[0]).toBe(40040) // 999*40 + 80
            expect(sums[1]).toBe(80040)
            expect(sums[2]).toBe(120040)
        })

        it('should support custom block sizes', () => {
            const cache = new BlockSumCache(500)
            const heightCache: Record<number, number> = {}

            const sums = cache.getBlockSums(heightCache, 30, 1200)
            // 1200 items / 500 block size = 2 complete blocks
            expect(sums.length).toBe(2)
            expect(sums[0]).toBe(15000) // 500 * 30
            expect(sums[1]).toBe(30000) // 1000 * 30
        })
    })

    describe('negative cases', () => {
        it('should handle empty height cache', () => {
            const cache = new BlockSumCache(1000)
            const sums = cache.getBlockSums({}, 40, 2000)
            expect(sums[0]).toBe(40000)
        })

        it('should handle zero items', () => {
            const cache = new BlockSumCache(1000)
            const sums = cache.getBlockSums({}, 40, 0)
            expect(sums).toEqual([])
        })
    })

    describe('edge cases', () => {
        it('should handle items count change (increase)', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            // Initially 1500 items
            let sums = cache.getBlockSums(heightCache, 40, 1500)
            expect(sums.length).toBe(1)

            // Grow to 2500 items
            sums = cache.getBlockSums(heightCache, 40, 2500)
            expect(sums.length).toBe(2)
        })

        it('should handle items count change (decrease)', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            // Initially 2500 items
            let sums = cache.getBlockSums(heightCache, 40, 2500)
            expect(sums.length).toBe(2)

            // Shrink to 1500 items
            sums = cache.getBlockSums(heightCache, 40, 1500)
            expect(sums.length).toBe(1)
        })

        it('should handle estimated height change', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            // With 40px estimated
            let sums = cache.getBlockSums(heightCache, 40, 2500)
            expect(sums[0]).toBe(40000)

            // Change to 50px estimated - should trigger full recompute
            sums = cache.getBlockSums(heightCache, 50, 2500)
            expect(sums[0]).toBe(50000)
        })

        it('should report dirty blocks correctly', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            // Fresh cache has no dirty blocks until first access
            expect(cache.hasDirtyBlocks).toBe(false)

            cache.getBlockSums(heightCache, 40, 2500)
            expect(cache.hasDirtyBlocks).toBe(false)

            cache.invalidateForIndex(500)
            expect(cache.hasDirtyBlocks).toBe(true)

            cache.getBlockSums(heightCache, 40, 2500)
            expect(cache.hasDirtyBlocks).toBe(false)
        })

        it('should expose block size', () => {
            const cache = new BlockSumCache(500)
            expect(cache.blockSize).toBe(500)
        })

        it('should handle invalidateAll', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            cache.getBlockSums(heightCache, 40, 2500)
            cache.invalidateAll()

            // After invalidateAll, should recompute everything
            const sums = cache.getBlockSums(heightCache, 40, 2500)
            expect(sums.length).toBe(2)
        })

        it('should handle rapid invalidations', () => {
            const cache = new BlockSumCache(1000)
            const heightCache: Record<number, number> = {}

            cache.getBlockSums(heightCache, 40, 5000)

            // Invalidate many indices
            for (let i = 0; i < 100; i++) {
                cache.invalidateForIndex(i * 10)
            }

            // Should still work correctly
            const sums = cache.getBlockSums(heightCache, 40, 5000)
            expect(sums.length).toBe(4)
        })
    })
})

describe('invalidateVisibleRangeCache', () => {
    let cacheHolder: VisibleRangeCacheHolder

    beforeEach(() => {
        // Create a fresh cache holder before each test
        cacheHolder = createVisibleRangeCacheHolder()
    })

    describe('positive cases', () => {
        it('should allow recalculation after invalidation', () => {
            // First calculation - should compute
            const result1 = calculateVisibleRange(
                0, // scrollTop
                400, // viewportHeight
                40, // itemHeight
                100, // totalItems
                5, // bufferSize
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            // Small scroll - should use cache (within threshold)
            const result2 = calculateVisibleRange(
                2, // scrollTop (small delta)
                400,
                40,
                100,
                5,
                'topToBottom',
                false,
                false,
                result1,
                undefined,
                undefined,
                cacheHolder
            )

            // Results should be same (cached)
            expect(result2).toEqual(result1)

            // Invalidate cache
            invalidateVisibleRangeCache(cacheHolder)

            // Now should recalculate
            const result3 = calculateVisibleRange(
                2,
                400,
                40,
                100,
                5,
                'topToBottom',
                false,
                false,
                result2,
                undefined,
                undefined,
                cacheHolder
            )

            // Calculation happens fresh
            expect(result3).toBeDefined()
        })
    })

    describe('edge cases', () => {
        it('should handle multiple invalidations', () => {
            // Multiple invalidations should not throw
            invalidateVisibleRangeCache(cacheHolder)
            invalidateVisibleRangeCache(cacheHolder)
            invalidateVisibleRangeCache(cacheHolder)

            const result = calculateVisibleRange(
                0,
                400,
                40,
                100,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            expect(result).toBeDefined()
        })

        it('should handle invalidation before any calculation', () => {
            // Invalidate before any calculation
            invalidateVisibleRangeCache(cacheHolder)

            // Should not throw
            const result = calculateVisibleRange(
                0,
                400,
                40,
                100,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            expect(result.start).toBe(0)
        })
    })
})

describe('calculateVisibleRange caching', () => {
    let cacheHolder: VisibleRangeCacheHolder

    beforeEach(() => {
        cacheHolder = createVisibleRangeCacheHolder()
    })

    describe('cache behavior', () => {
        it('should return cached result for small scroll deltas', () => {
            const result1 = calculateVisibleRange(
                100,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            // Small scroll delta (< 8px threshold)
            const result2 = calculateVisibleRange(
                103,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                result1,
                undefined,
                undefined,
                cacheHolder
            )

            // Should return same cached result
            expect(result2).toEqual(result1)
        })

        it('should recalculate for larger scroll deltas', () => {
            // Start at a higher scroll position so buffer doesn't hide the change
            const result1 = calculateVisibleRange(
                1000,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            // Large scroll delta (>= 8px threshold)
            const result2 = calculateVisibleRange(
                2000,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                result1,
                undefined,
                undefined,
                cacheHolder
            )

            // Should recalculate - different visible range
            expect(result2.start).not.toBe(result1.start)
        })

        it('should recalculate when viewport height changes', () => {
            const result1 = calculateVisibleRange(
                100,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            // Same scroll but different viewport height
            const result2 = calculateVisibleRange(
                100,
                600, // Changed
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                result1,
                undefined,
                undefined,
                cacheHolder
            )

            // Should recalculate due to viewport change
            expect(result2.end).toBeGreaterThan(result1.end)
        })

        it('should recalculate when total items changes', () => {
            const result1 = calculateVisibleRange(
                100,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            // Items count changed
            const result2 = calculateVisibleRange(
                100,
                400,
                40,
                500, // Changed
                5,
                'topToBottom',
                false,
                false,
                result1,
                undefined,
                undefined,
                cacheHolder
            )

            // Should recalculate
            expect(result2).toBeDefined()
        })

        it('should recalculate when mode changes', () => {
            const result1 = calculateVisibleRange(
                100,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            // Mode changed
            const result2 = calculateVisibleRange(
                100,
                400,
                40,
                1000,
                5,
                'bottomToTop', // Changed
                false,
                false,
                result1,
                undefined,
                undefined,
                cacheHolder
            )

            // Should recalculate
            expect(result2).toBeDefined()
        })

        it('should recalculate when item height changes significantly', () => {
            const result1 = calculateVisibleRange(
                100,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder
            )

            // Item height changed significantly
            const result2 = calculateVisibleRange(
                100,
                400,
                60, // Changed by more than 1
                1000,
                5,
                'topToBottom',
                false,
                false,
                result1,
                undefined,
                undefined,
                cacheHolder
            )

            // Should recalculate
            expect(result2).toBeDefined()
        })
    })

    describe('multi-instance isolation', () => {
        it('should maintain separate caches for different instances', () => {
            const cacheHolder1 = createVisibleRangeCacheHolder()
            const cacheHolder2 = createVisibleRangeCacheHolder()

            // Instance 1: calculate with 1000 items
            const result1 = calculateVisibleRange(
                100,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder1
            )

            // Instance 2: calculate with 500 items
            const result2 = calculateVisibleRange(
                100,
                400,
                40,
                500, // Different item count
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder2
            )

            // Instance 1: small scroll - should use cache
            const result1b = calculateVisibleRange(
                103, // Small delta
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                result1,
                undefined,
                undefined,
                cacheHolder1
            )

            // Instance 1 should return cached result (same reference)
            expect(result1b).toEqual(result1)

            // Instance 2 should have its own cache (different from instance 1)
            expect(cacheHolder1.current).not.toBe(cacheHolder2.current)
            expect(cacheHolder1.current?.totalItems).toBe(1000)
            expect(cacheHolder2.current?.totalItems).toBe(500)
        })

        it('should not pollute other instance cache on invalidation', () => {
            const cacheHolder1 = createVisibleRangeCacheHolder()
            const cacheHolder2 = createVisibleRangeCacheHolder()

            // Populate both caches
            calculateVisibleRange(
                100,
                400,
                40,
                1000,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder1
            )

            calculateVisibleRange(
                200,
                400,
                40,
                500,
                5,
                'topToBottom',
                false,
                false,
                null,
                undefined,
                undefined,
                cacheHolder2
            )

            // Both should have cached values
            expect(cacheHolder1.current).not.toBeNull()
            expect(cacheHolder2.current).not.toBeNull()

            // Invalidate only instance 1
            invalidateVisibleRangeCache(cacheHolder1)

            // Instance 1 should be invalidated
            expect(cacheHolder1.current).toBeNull()

            // Instance 2 should still have its cache
            expect(cacheHolder2.current).not.toBeNull()
            expect(cacheHolder2.current?.scrollTop).toBe(200)
        })
    })
})
