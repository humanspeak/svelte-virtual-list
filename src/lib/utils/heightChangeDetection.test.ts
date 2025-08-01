import { describe, expect, it } from 'vitest'
import { isSignificantHeightChange } from './heightChangeDetection.js'

describe('heightChangeDetection', () => {
    describe('isSignificantHeightChange', () => {
        it('should return true for first time seeing an item (no cached height)', () => {
            const heightCache = {}
            const result = isSignificantHeightChange(0, 100, heightCache)
            expect(result).toBe(true)
        })

        it('should return false for height change within margin of error (default 1px)', () => {
            const heightCache = { 0: 100 }

            // Exactly 1px difference should be false (not greater than 1)
            expect(isSignificantHeightChange(0, 101, heightCache)).toBe(false)
            expect(isSignificantHeightChange(0, 99, heightCache)).toBe(false)

            // Less than 1px difference should be false
            expect(isSignificantHeightChange(0, 100.5, heightCache)).toBe(false)
            expect(isSignificantHeightChange(0, 99.5, heightCache)).toBe(false)

            // No change should be false
            expect(isSignificantHeightChange(0, 100, heightCache)).toBe(false)
        })

        it('should return true for height change exceeding margin of error (default 1px)', () => {
            const heightCache = { 0: 100 }

            // Greater than 1px difference should be true
            expect(isSignificantHeightChange(0, 102, heightCache)).toBe(true)
            expect(isSignificantHeightChange(0, 98, heightCache)).toBe(true)
            expect(isSignificantHeightChange(0, 101.1, heightCache)).toBe(true)
            expect(isSignificantHeightChange(0, 98.9, heightCache)).toBe(true)
        })

        it('should work with custom margin of error', () => {
            const heightCache = { 0: 100 }
            const customMargin = 5

            // Within custom margin should be false
            expect(isSignificantHeightChange(0, 105, heightCache, customMargin)).toBe(false)
            expect(isSignificantHeightChange(0, 95, heightCache, customMargin)).toBe(false)
            expect(isSignificantHeightChange(0, 102, heightCache, customMargin)).toBe(false)

            // Exceeding custom margin should be true
            expect(isSignificantHeightChange(0, 106, heightCache, customMargin)).toBe(true)
            expect(isSignificantHeightChange(0, 94, heightCache, customMargin)).toBe(true)
        })

        it('should handle zero height correctly', () => {
            const heightCache = { 0: 0 }

            expect(isSignificantHeightChange(0, 0, heightCache)).toBe(false)
            expect(isSignificantHeightChange(0, 1, heightCache)).toBe(false) // Within 1px margin
            expect(isSignificantHeightChange(0, 2, heightCache)).toBe(true) // Exceeds 1px margin
        })

        it('should handle negative height values', () => {
            const heightCache = { 0: -10 } // Shouldn't happen in real usage but test robustness

            expect(isSignificantHeightChange(0, -10, heightCache)).toBe(false)
            expect(isSignificantHeightChange(0, -9, heightCache)).toBe(false) // Within 1px
            expect(isSignificantHeightChange(0, -8, heightCache)).toBe(true) // Exceeds 1px
        })

        it('should work with different item indices', () => {
            const heightCache = {
                0: 100,
                5: 200,
                999: 50
            }

            // Different items should be handled independently
            expect(isSignificantHeightChange(0, 100, heightCache)).toBe(false)
            expect(isSignificantHeightChange(5, 200, heightCache)).toBe(false)
            expect(isSignificantHeightChange(999, 50, heightCache)).toBe(false)

            // New item not in cache should return true
            expect(isSignificantHeightChange(123, 75, heightCache)).toBe(true)

            // Significant changes should return true
            expect(isSignificantHeightChange(0, 103, heightCache)).toBe(true)
            expect(isSignificantHeightChange(5, 205, heightCache)).toBe(true)
        })

        it('should handle fractional heights properly', () => {
            const heightCache = { 0: 100.5 }

            expect(isSignificantHeightChange(0, 100.5, heightCache)).toBe(false)
            expect(isSignificantHeightChange(0, 101.5, heightCache)).toBe(false) // Exactly 1px
            expect(isSignificantHeightChange(0, 99.5, heightCache)).toBe(false) // Exactly 1px
            expect(isSignificantHeightChange(0, 101.6, heightCache)).toBe(true) // > 1px
            expect(isSignificantHeightChange(0, 99.4, heightCache)).toBe(true) // > 1px
        })

        it('should handle edge case with zero margin of error', () => {
            const heightCache = { 0: 100 }
            const zeroMargin = 0

            // Any change should be significant with zero margin
            expect(isSignificantHeightChange(0, 100, heightCache, zeroMargin)).toBe(false) // No change
            expect(isSignificantHeightChange(0, 100.1, heightCache, zeroMargin)).toBe(true) // Any change
            expect(isSignificantHeightChange(0, 99.9, heightCache, zeroMargin)).toBe(true) // Any change
        })
    })
})
