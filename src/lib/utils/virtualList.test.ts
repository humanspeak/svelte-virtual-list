import { afterEach, describe, expect, it } from 'vitest'
import {
    calculateScrollPosition,
    calculateTransformY,
    calculateVisibleRange,
    clampValue,
    collectPitchChanges,
    getScrollOffsetForIndex,
    getValidHeight
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

describe('collectPitchChanges', () => {
    /** Build a connected item wrapper with a mocked measured height. */
    const makeItem = (index: number | null, height: number): HTMLElement => {
        const el = document.createElement('div')
        if (index !== null) el.dataset.originalIndex = String(index)
        el.getBoundingClientRect = () =>
            ({ top: 0, bottom: height, height, left: 0, right: 0, width: 0, x: 0, y: 0 }) as DOMRect
        document.body.appendChild(el)
        return el
    }

    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('reports a fresh measurement with oldHeight undefined', () => {
        const el = makeItem(5, 120)
        const changes = collectPitchChanges([el], {})
        expect(changes).toEqual([{ index: 5, oldHeight: undefined, newHeight: 120 }])
    })

    it('reports a changed measurement with the cached oldHeight', () => {
        const el = makeItem(5, 120)
        const changes = collectPitchChanges([el], { 5: 100 })
        expect(changes).toEqual([{ index: 5, oldHeight: 100, newHeight: 120 }])
    })

    it('skips insignificant changes within the tolerance', () => {
        const el = makeItem(5, 100.05)
        expect(collectPitchChanges([el], { 5: 100 })).toEqual([])
    })

    it('honors a custom tolerance', () => {
        const el = makeItem(5, 104)
        expect(collectPitchChanges([el], { 5: 100 }, 5)).toEqual([])
        expect(collectPitchChanges([el], { 5: 100 }, 3)).toEqual([
            { index: 5, oldHeight: 100, newHeight: 104 }
        ])
    })

    it('skips elements without a data-original-index', () => {
        const el = makeItem(null, 120)
        expect(collectPitchChanges([el], {})).toEqual([])
    })

    it('skips disconnected elements', () => {
        const el = makeItem(5, 120)
        el.remove()
        expect(collectPitchChanges([el], {})).toEqual([])
    })

    it('skips zero and non-finite measurements', () => {
        const zero = makeItem(1, 0)
        const nan = makeItem(2, Number.NaN)
        expect(collectPitchChanges([zero, nan], {})).toEqual([])
    })

    it('collects a mixed batch in element order', () => {
        const fresh = makeItem(1, 40)
        const unchanged = makeItem(2, 40)
        const changed = makeItem(3, 80)
        const changes = collectPitchChanges([fresh, unchanged, changed], { 2: 40, 3: 40 })
        expect(changes).toEqual([
            { index: 1, oldHeight: undefined, newHeight: 40 },
            { index: 3, oldHeight: 40, newHeight: 80 }
        ])
    })
})
