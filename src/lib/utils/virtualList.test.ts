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
        const result = calculateVisibleRange(100, 300, 30, 100, 2, 'bottomToTop')
        expect(result).toEqual({
            start: 84, // (100 - ceil(300/30) - ceil(100/30) - 2)
            end: 99 // (100 - ceil(100/30) + 2)
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
        expect(calculateTransformY('topToBottom', 100, 20, 5, 30)).toBe(150)
    })

    it('should calculate transform for bottom-to-top mode', () => {
        expect(calculateTransformY('bottomToTop', 100, 20, 5, 30)).toBe(2400)
    })

    it('should handle edge case with zero visible items', () => {
        expect(calculateTransformY('topToBottom', 100, 0, 0, 30)).toBe(0)
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
        const result = calculateAverageHeight([], { start: 0 }, {}, 40)

        expect(result.newHeight).toBe(40)
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(result.updatedHeightCache).toEqual({})
    })

    it('should calculate average height from elements', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: 50 }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40)

        expect(result.newHeight).toBe(40) // (30 + 50) / 2
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(result.updatedHeightCache).toEqual({
            0: { currentHeight: 30, dirty: false },
            1: { currentHeight: 50, dirty: false }
        })
    })

    it('should use cached heights when available', () => {
        const mockElements = [{ getBoundingClientRect: () => ({ height: 30 }) }] as HTMLElement[]

        const existingCache = { 0: { currentHeight: 40, dirty: false } }

        const result = calculateAverageHeight(mockElements, { start: 0 }, existingCache, 40)

        expect(result.updatedHeightCache).toEqual(existingCache)
    })

    it('should handle invalid height measurements', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: NaN }) },
            { getBoundingClientRect: () => ({ height: -10 }) },
            { getBoundingClientRect: () => ({ height: Infinity }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40)

        expect(result.newHeight).toBe(40) // Should fallback to currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
    })

    it('should calculate average excluding invalid heights', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: NaN }) },
            { getBoundingClientRect: () => ({ height: 50 }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40)

        expect(result.newHeight).toBe(40) // (30 + 50) / 2
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(2)
    })

    it('should handle all invalid measurements', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: NaN }) },
            { getBoundingClientRect: () => ({ height: Infinity }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40)

        expect(result.newHeight).toBe(40) // Falls back to currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
    })

    it('should handle mixed cached and new measurements', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: 30 }) },
            { getBoundingClientRect: () => ({ height: 50 }) }
        ] as HTMLElement[]

        const existingCache = { 1: { currentHeight: 40, dirty: false } } // Cache for second element

        const result = calculateAverageHeight(mockElements, { start: 0 }, existingCache, 40)

        expect(result.newHeight).toBe(35) // (30 + 40) / 2
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(result.updatedHeightCache).toEqual({
            0: { currentHeight: 30, dirty: false },
            1: { currentHeight: 40, dirty: false }
        })
    })

    it('should handle empty height cache gracefully', () => {
        const mockElements = [] as HTMLElement[]
        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 40)

        expect(result.newHeight).toBe(40)
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
    })

    it('should fallback to currentItemHeight when no valid heights exist', () => {
        const mockElements = [
            { getBoundingClientRect: () => ({ height: NaN }) },
            { getBoundingClientRect: () => ({ height: -1 }) }
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 45)

        expect(result.newHeight).toBe(45) // Should use currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
    })

    it('should use currentItemHeight when no heights are collected', () => {
        const mockElements = [null] as unknown as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 45)

        expect(result.newHeight).toBe(45)
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
    })

    it('should use currentItemHeight when getBoundingClientRect throws', () => {
        const mockElements = [
            {
                getBoundingClientRect: () => {
                    throw new Error('getBoundingClientRect error')
                }
            } as unknown as HTMLElement
        ] as HTMLElement[]

        const result = calculateAverageHeight(mockElements, { start: 0 }, {}, 45)

        expect(result.newHeight).toBe(45) // Should use currentItemHeight
        expect(result.newLastMeasuredIndex).toBe(0)
        expect(Object.keys(result.updatedHeightCache).length).toBe(0)
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
        const heightCache = {
            0: { currentHeight: 30, dirty: false },
            2: { currentHeight: 50, dirty: false },
            3: { currentHeight: 60, dirty: false }
        }
        const calculatedItemHeight = 40
        const idx = 5
        // Expected offset: 30 (idx 0) + 40 (idx 1) + 50 (idx 2) + 60 (idx 3) + 40 (idx 4) = 220
        const offset = getScrollOffsetForIndex(heightCache, calculatedItemHeight, idx)
        expect(offset).toBe(220)
    })

    it('computes offset using a full heightCache (all heights measured)', () => {
        const heightCache = {
            0: { currentHeight: 30, dirty: false },
            1: { currentHeight: 40, dirty: false },
            2: { currentHeight: 50, dirty: false },
            3: { currentHeight: 60, dirty: false },
            4: { currentHeight: 70, dirty: false }
        }
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
            const heightCache = {
                0: { currentHeight: 5, dirty: false },
                2: { currentHeight: 15, dirty: false },
                19: { currentHeight: 100, dirty: false }
            }
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
            const heightCache = {
                0: { currentHeight: 1, dirty: false },
                1: { currentHeight: 2, dirty: false },
                2: { currentHeight: 3, dirty: false },
                3: { currentHeight: 4, dirty: false },
                4: { currentHeight: 5, dirty: false },
                5: { currentHeight: 6, dirty: false },
                6: { currentHeight: 7, dirty: false },
                7: { currentHeight: 8, dirty: false },
                8: { currentHeight: 9, dirty: false },
                9: { currentHeight: 10, dirty: false }
            }
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
        const heightCache = {
            0: { currentHeight: 10, dirty: false },
            1: { currentHeight: 20, dirty: false },
            2: { currentHeight: 30, dirty: false },
            3: { currentHeight: 40, dirty: false },
            4: { currentHeight: 50, dirty: false }
        }
        const sums = buildBlockSums(heightCache, 99, 5, 2)
        // Blocks: [0,1]=30, [2,3]=100, [4]=150 (cumulative sums)
        expect(sums).toEqual([30, 100, 150])
    })

    it('returns correct sums for partial measured heights', () => {
        const heightCache = {
            1: { currentHeight: 20, dirty: false },
            3: { currentHeight: 40, dirty: false }
        }
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
