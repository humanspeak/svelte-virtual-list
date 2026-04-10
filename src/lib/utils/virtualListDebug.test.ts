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
                viewportHeight,
                totalItems * averageItemHeight // totalHeight = 100 * 50 = 5000
            )

            expect(result).toMatchObject({
                visibleItemsCount: 10,
                startIndex: 5,
                endIndex: 15,
                totalItems: 100,
                processedItems: 25,
                averageItemHeight: 50,
                atTop: false,
                atBottom: false,
                totalHeight: 5000,
                engine: 'legacy',
                mode: 'topToBottom',
                measuredCount: 25,
                measuredPercent: 25,
                mountedCount: 10,
                renderedVisibleCount: 10,
                averageItemHeightPx: 50,
                totalHeightPx: 5000,
                scrollTopPx: 250,
                maxScrollTopPx: 4600,
                clientHeightPx: 400,
                scrollHeightPx: 5000,
                gapFromBottomPx: 4350,
                measurementQueueCount: 0,
                measurementLaneCount: 0,
                backfillPending: false,
                reconcileActive: false,
                logicalWindowStart: 5,
                logicalWindowEnd: 15
            })
        })

        it('should correctly detect at top position', () => {
            const result = createDebugInfo(
                { start: 0, end: 10 },
                100,
                10,
                50,
                0, // At top
                400,
                5000 // totalHeight = 100 * 50
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
                400,
                5000 // totalHeight = 100 * 50
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
                400,
                5000 // totalHeight = 100 * 50
            )

            expect(result.atTop).toBe(true) // Should still be considered at top due to tolerance
        })

        it('should preserve dedicated bottom-to-top staged drain extras', () => {
            const result = createDebugInfo({ start: 0, end: 10 }, 100, 10, 50, 4600, 400, 5000, {
                mode: 'bottomToTop',
                engine: 'dedicated-bottom-to-top',
                stagedMeasurementCount: 12,
                stagedPromotionPending: true,
                stagedDrainActive: true,
                stagedDrainScheduled: false
            })

            expect(result).toMatchObject({
                mode: 'bottomToTop',
                engine: 'dedicated-bottom-to-top',
                stagedMeasurementCount: 12,
                stagedPromotionPending: true,
                stagedDrainActive: true,
                stagedDrainScheduled: false
            })
        })
    })
})
