import { describe, expect, it, vi } from 'vitest'
import type { VirtualListSetters, VirtualListState } from './types.js'
import {
    calculateAverageHeight,
    calculateScrollPosition,
    calculateTransformY,
    calculateVisibleRange,
    clampValue,
    getScrollOffsetForIndex,
    getValidHeight,
    updateHeightAndScroll
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
        const result = calculateVisibleRange({
            scrollTop: 100,
            viewportHeight: 300,
            itemHeight: 30,
            totalItems: 100,
            bufferSize: 2
        })
        expect(result).toEqual({
            start: 1, // (100/30 - 2) rounded down
            end: 16 // (floor(100/30) + ceil(300/30) + 1 + 2) = 3 + 10 + 1 + 2
        })
    })

    it('should handle edge cases with buffer exceeding bounds', () => {
        const result = calculateVisibleRange({
            scrollTop: 0,
            viewportHeight: 300,
            itemHeight: 30,
            totalItems: 10,
            bufferSize: 5
        })
        expect(result).toEqual({
            start: 0,
            end: 10
        })
    })

    it('should use measured heights for topToBottom start index when heightCache provided', () => {
        // Items: 0→100, 1→50, 2→80, rest→30 (fallback)
        // Cumulative: 0, 100, 150, 230, 260, 290, ...
        // scrollTop=160: item 2 starts at 150, item 3 starts at 230 → start=2
        const cache: Record<number, number> = { 0: 100, 1: 50, 2: 80 }
        const result = calculateVisibleRange({
            scrollTop: 160,
            viewportHeight: 300,
            itemHeight: 30,
            totalItems: 100,
            bufferSize: 2,
            heightCache: cache
        })
        expect(result.start).toBe(0) // start=2 minus buffer=2
    })

    it('should use measured heights for topToBottom end calculation', () => {
        // Items all 30px, scrollTop=0, viewportHeight=100
        // Walk: 0→30, 30→60, 60→90, 90→120 (>100) → end=4, +1=5
        // With buffer=1: end=min(20, 5+1)=6
        const result = calculateVisibleRange({
            scrollTop: 0,
            viewportHeight: 100,
            itemHeight: 30,
            totalItems: 20,
            bufferSize: 1
        })
        expect(result.end).toBe(6)
    })

    it('should handle variable heights correctly in topToBottom visible range', () => {
        // 5 items with known heights: 40, 60, 80, 50, 30
        // Cumulative: 0, 40, 100, 180, 230, 260
        // scrollTop=50, viewportHeight=120 → viewport covers 50-170
        // Start walk: 0→40 (40≤50), 1→100 (100>50) → start=1
        // End walk from 1: viewAcc=0+60=60, +80=140 (≥120) → end=3, +1=4
        // With buffer=0: start=1, end=4
        const cache: Record<number, number> = { 0: 40, 1: 60, 2: 80, 3: 50, 4: 30 }
        const result = calculateVisibleRange({
            scrollTop: 50,
            viewportHeight: 120,
            itemHeight: 40,
            totalItems: 5,
            bufferSize: 0,
            heightCache: cache
        })
        expect(result).toEqual({ start: 1, end: 4 })
    })

    it('should fall back to itemHeight for unmeasured items in heightCache', () => {
        // Only item 0 measured at 100px, rest use fallback of 30px
        // Cumulative: 0, 100, 130, 160, 190
        // scrollTop=140: item 2 at 130 (130≤140), item 3 at 160 (160>140) → start=2
        const cache: Record<number, number> = { 0: 100 }
        const result = calculateVisibleRange({
            scrollTop: 140,
            viewportHeight: 300,
            itemHeight: 30,
            totalItems: 100,
            bufferSize: 0,
            heightCache: cache
        })
        expect(result.start).toBe(2)
    })

    it('should produce same result with uniform heights whether cache present or not', () => {
        // All items 40px — cache and no-cache should agree
        const cache: Record<number, number> = {}
        for (let i = 0; i < 50; i++) cache[i] = 40

        const withCache = calculateVisibleRange({
            scrollTop: 200,
            viewportHeight: 400,
            itemHeight: 40,
            totalItems: 50,
            bufferSize: 2,
            heightCache: cache
        })
        const withoutCache = calculateVisibleRange({
            scrollTop: 200,
            viewportHeight: 400,
            itemHeight: 40,
            totalItems: 50,
            bufferSize: 2
        })
        expect(withCache).toEqual(withoutCache)
    })
})

describe('calculateTransformY', () => {
    it('should calculate transform using estimated heights', () => {
        expect(calculateTransformY(100, 5, 30)).toBe(150)
    })

    it('should calculate transform using heightCache when provided', () => {
        const heightCache = { 0: 35, 1: 45, 2: 25, 3: 50, 4: 60 }
        // visibleStart = 5 → offset = sum(0..4) = 35+45+25+50+60 = 215
        expect(calculateTransformY(100, 5, 30, heightCache)).toBe(215)
    })

    it('should handle edge case with zero visible items', () => {
        expect(calculateTransformY(100, 0, 30)).toBe(0)
    })
})

describe('updateHeightAndScroll', () => {
    it('should not update when immediate is false', () => {
        const state: VirtualListState = {
            initialized: true,
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
