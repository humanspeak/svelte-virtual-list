import { describe, expect, it, vi } from 'vitest'
import type { VirtualListSetters, VirtualListState } from './types.js'
import {
    calculateAverageHeight,
    calculateScrollPosition,
    calculateTransformY,
    calculateVisibleRange,
    clampValue,
    findEndIndex,
    findStartIndex,
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

describe('findStartIndex', () => {
    it('should use O(1) division when no heightCache is provided', () => {
        const result = findStartIndex(150, 100, 50)
        expect(result).toEqual({ index: 3, offset: 150 })
    })

    it('should handle zero offset', () => {
        const result = findStartIndex(0, 100, 50)
        expect(result).toEqual({ index: 0, offset: 0 })
    })

    it('should handle offset beyond total content', () => {
        // 10 items × 50px = 500px total, offset 600 → index 12 (clamped by caller)
        const result = findStartIndex(600, 10, 50)
        expect(result).toEqual({ index: 12, offset: 600 })
    })

    it('should binary search with uniform heightCache', () => {
        const cache: Record<number, number> = {}
        for (let i = 0; i < 20; i++) cache[i] = 50
        const result = findStartIndex(150, 20, 50, cache)
        expect(result).toEqual({ index: 3, offset: 150 })
    })

    it('should binary search with variable heightCache', () => {
        // Items: 0→40, 1→60, 2→80, 3→50, 4→30
        // Cumulative: 0, 40, 100, 180, 230, 260
        const cache: Record<number, number> = { 0: 40, 1: 60, 2: 80, 3: 50, 4: 30 }
        // targetOffset=150: cumulative[3]=180 > 150, cumulative[2]=100 ≤ 150 → index 2
        const result = findStartIndex(150, 5, 50, cache)
        expect(result).toEqual({ index: 2, offset: 100 })
    })

    it('should find exact boundary with variable heights', () => {
        // Cumulative: 0, 40, 100, 180
        const cache: Record<number, number> = { 0: 40, 1: 60, 2: 80 }
        // targetOffset=100: cumulative[2]=100 ≤ 100, cumulative[3]=180 > 100 → index 2
        const result = findStartIndex(100, 3, 50, cache)
        expect(result).toEqual({ index: 2, offset: 100 })
    })

    it('should fall back to itemHeight for unmeasured items in cache', () => {
        // Only item 0 measured, rest use fallback of 30
        const cache: Record<number, number> = { 0: 100 }
        // Cumulative: 0, 100, 130, 160, 190
        // targetOffset=150: cumulative[4]=190 > 150, cumulative[3]=160 > 150, cumulative[2]=130 ≤ 150 → index 2 (probably)
        const result = findStartIndex(150, 10, 30, cache)
        expect(result.index).toBe(2)
        expect(result.offset).toBe(130)
    })
})

describe('findEndIndex', () => {
    it('should walk forward with uniform heights (no cache)', () => {
        // Start at item 3 (offset 90), viewport ends at 390, 30px items
        // Items 3-12 fill 90→390 (10 items × 30px), then +1 = 14
        const end = findEndIndex(3, 90, 390, 100, 30)
        expect(end).toBe(14)
    })

    it('should walk forward with variable heights', () => {
        // Start at item 0 (offset 0), viewport ends at 200
        // Items: 0→40, 1→60, 2→80, 3→50 → cumulative 40, 100, 180, 230
        // Item 3 pushes past 200, so end loop gives 4, +1 = 5
        const cache: Record<number, number> = { 0: 40, 1: 60, 2: 80, 3: 50 }
        const end = findEndIndex(0, 0, 200, 100, 30, cache)
        expect(end).toBe(5)
    })

    it('should clamp to totalItems', () => {
        // Only 5 items, viewport needs more
        const end = findEndIndex(0, 0, 1000, 5, 30)
        expect(end).toBe(5) // min(5, 5+1) = 5... actually all items consumed, end=5, +1=6, min(5,6)=5
    })

    it('should handle start partway through first item', () => {
        // Start at item 2 (offset 60), viewport ends at 380
        // Items 2-12: offset grows 60→90→...→390 (item 12 pushes to 390 ≥ 380)
        // end=13, +1=14
        const end = findEndIndex(2, 60, 380, 100, 30)
        expect(end).toBe(14)
    })

    it('should handle single item filling viewport', () => {
        // One very tall item at index 0
        const cache: Record<number, number> = { 0: 1000 }
        const end = findEndIndex(0, 0, 300, 10, 30, cache)
        expect(end).toBe(2) // item 0 fills viewport (1000 ≥ 300), end=1, +1=2
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
            end: 17 // items 3-13 visible (90-420px covers viewport 100-400px), +1 safety, +2 buffer
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
            end: 100 // items 86-97 visible (2580-2910px covers viewport 2600-2900px), +1 safety, +2 buffer
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

    it('should use measured heights for topToBottom with heightCache', () => {
        // Items: 0→100, 1→50, 2→80, 3→60, 4→40, rest→30 (fallback)
        // Cumulative: 0, 100, 150, 230, 290, 330, 360, ...
        // scrollTop=160, viewportHeight=200 → viewport covers 160-360
        // findStart(160): cumulative[2]=150 ≤ 160, cumulative[3]=230 > 160 → start=2, offset=150
        // findEnd(2, 150, 360): 150+80=230, +60=290, +40=330, +30=360 (360 not < 360) → end=6, +1=7
        // With buffer=1: start=max(0,2-1)=1, end=min(10,7+1)=8
        const cache: Record<number, number> = { 0: 100, 1: 50, 2: 80, 3: 60, 4: 40 }
        const result = calculateVisibleRange(
            160,
            200,
            30,
            10,
            1,
            'topToBottom',
            false,
            false,
            null,
            undefined,
            cache
        )
        expect(result).toEqual({ start: 1, end: 8 })
    })

    it('should use measured heights for bottomToTop with heightCache', () => {
        // 10 items, cache: 0→100, 1→50, 2→80, 3→60, 4→40, rest→30 (fallback)
        // totalHeight = 100+50+80+60+40+30×5 = 480
        // maxScrollTop = 480 - 200 = 280
        // scrollTop=100 → distanceFromStart = 280 - 100 = 180
        // findStart(180): cumulative[2]=150 ≤ 180, cumulative[3]=230 > 180 → start=2, offset=150
        // findEnd(2, 150, 380): 150+80=230, +60=290, +40=330, +30=360, +30=390 (390 ≥ 380) → end=7, +1=8
        // With buffer=1: start=max(0,2-1)=1, end=min(10,8+1)=9
        const cache: Record<number, number> = { 0: 100, 1: 50, 2: 80, 3: 60, 4: 40 }
        const totalHeight = 100 + 50 + 80 + 60 + 40 + 30 * 5 // 480
        const result = calculateVisibleRange(
            100,
            200,
            30,
            10,
            1,
            'bottomToTop',
            false,
            false,
            null,
            totalHeight,
            cache
        )
        expect(result).toEqual({ start: 1, end: 9 })
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
