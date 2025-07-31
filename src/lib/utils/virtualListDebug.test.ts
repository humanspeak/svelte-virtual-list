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

            const result = createDebugInfo(
                visibleRange,
                totalItems,
                processedItems,
                averageItemHeight
            )

            expect(result).toEqual({
                visibleItemsCount: 10,
                startIndex: 5,
                endIndex: 15,
                totalItems: 100,
                processedItems: 25, // Number of items with measured heights
                averageItemHeight: 50
            })
        })
    })
})
