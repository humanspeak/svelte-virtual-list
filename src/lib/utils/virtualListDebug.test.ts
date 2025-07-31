import { describe, expect, it } from 'vitest'
import { createDebugInfo, shouldShowDebugInfo } from './virtualListDebug.js'

describe('virtualListDebug utilities', () => {
    describe('shouldShowDebugInfo', () => {
        it('should return true when prevRange is null', () => {
            const result = shouldShowDebugInfo(null, { start: 0, end: 10 }, 100, 100)
            expect(result).toBe(true)
        })

        it('should return true when ranges differ', () => {
            const result = shouldShowDebugInfo(
                { start: 0, end: 10 },
                { start: 5, end: 15 },
                100,
                100
            )
            expect(result).toBe(true)
        })

        it('should return true when heights differ', () => {
            const result = shouldShowDebugInfo(
                { start: 0, end: 10 },
                { start: 0, end: 10 },
                100,
                150
            )
            expect(result).toBe(true)
        })

        it('should return false when nothing changes', () => {
            const result = shouldShowDebugInfo(
                { start: 0, end: 10 },
                { start: 0, end: 10 },
                100,
                100
            )
            expect(result).toBe(false)
        })
    })

    describe('createDebugInfo', () => {
        it('should create correct debug info object', () => {
            const visibleRange = { start: 5, end: 15 }
            const totalItems = 100
            const processedItems = 25 // Items with measured heights in heightCache
            const averageItemHeight = 50
            const scrollTop = 250 // Current scroll position
            const viewportHeight = 400 // Viewport height

            const result = createDebugInfo(
                visibleRange,
                totalItems,
                processedItems,
                averageItemHeight,
                scrollTop,
                viewportHeight
            )

            expect(result).toEqual({
                visibleItemsCount: 10,
                startIndex: 5,
                endIndex: 15,
                totalItems: 100,
                processedItems: 25, // Number of items with measured heights
                averageItemHeight: 50,
                atTop: false, // scrollTop (250) > 1
                atBottom: false, // scrollTop (250) < totalHeight (5000) - viewportHeight (400) - 1
                totalHeight: 5000 // 100 items * 50px average height
            })
        })

        it('should correctly detect at top position', () => {
            const result = createDebugInfo(
                { start: 0, end: 10 },
                100,
                10,
                50,
                0, // At top
                400
            )

            expect(result.atTop).toBe(true)
            expect(result.atBottom).toBe(false)
        })

        it('should correctly detect at bottom position', () => {
            const result = createDebugInfo(
                { start: 90, end: 100 },
                100,
                50,
                50,
                4600, // scrollTop = totalHeight (5000) - viewportHeight (400) = 4600
                400
            )

            expect(result.atTop).toBe(false)
            expect(result.atBottom).toBe(true)
        })

        it('should handle edge case with small tolerance', () => {
            const result = createDebugInfo(
                { start: 0, end: 10 },
                100,
                10,
                50,
                1, // Just at the tolerance boundary
                400
            )

            expect(result.atTop).toBe(true) // Should still be considered at top due to tolerance
        })
    })
})
