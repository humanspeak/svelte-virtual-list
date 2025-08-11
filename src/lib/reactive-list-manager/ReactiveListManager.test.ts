import { beforeEach, describe, expect, it } from 'vitest'
import { ReactiveListManager } from './index.js'
import type { HeightChange } from './types.js'

describe('ReactiveListManager (alias)', () => {
    let manager: ReactiveListManager

    beforeEach(() => {
        manager = new ReactiveListManager({
            itemLength: 10000,
            itemHeight: 40
        })
    })

    describe('Initialization', () => {
        it('should initialize with correct default values', () => {
            expect(manager.totalMeasuredHeight).toBe(0)
            expect(manager.measuredCount).toBe(0)
            expect(manager.itemLength).toBe(10000)
            expect(manager.itemHeight).toBe(40)
        })

        it('should calculate initial total height correctly', () => {
            const totalHeight = manager.totalHeight
            expect(totalHeight).toBe(10000 * 40) // All items estimated
        })

        it('should allow initialized=true once and then throw on subsequent true sets', () => {
            expect(manager.initialized).toBe(false)
            manager.initialized = true
            expect(manager.initialized).toBe(true)
            expect(() => {
                // intentional double set to verify invariant
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                manager.initialized = true
            }).toThrowError(
                'ReactiveListManager: initialized flag cannot be set to true after it has been set to true'
            )
        })
    })

    describe('Performance Tests', () => {
        it('should handle 1000 dirty updates in <1ms', () => {
            const dirtyResults: HeightChange[] = Array.from({ length: 1000 }, (_, i) => ({
                index: i,
                oldHeight: undefined,
                newHeight: 40 + Math.random() * 20
            }))

            const start = performance.now()
            manager.processDirtyHeights(dirtyResults)
            const end = performance.now()

            expect(end - start).toBeLessThan(1)
            expect(manager.measuredCount).toBe(1000)
        })

        it('should handle 10,000 dirty updates efficiently', () => {
            const dirtyResults: HeightChange[] = Array.from({ length: 10000 }, (_, i) => ({
                index: i,
                oldHeight: undefined,
                newHeight: 45
            }))

            const start = performance.now()
            manager.processDirtyHeights(dirtyResults)
            const end = performance.now()

            expect(end - start).toBeLessThan(10) // Should be much faster in practice
            expect(manager.measuredCount).toBe(10000)
            expect(manager.totalMeasuredHeight).toBe(450000) // 10000 * 45
        })

        it('should handle height updates (old -> new) efficiently', () => {
            // First measurement
            manager.processDirtyHeights([{ index: 0, oldHeight: undefined, newHeight: 50 }])

            expect(manager.totalMeasuredHeight).toBe(50)
            expect(manager.measuredCount).toBe(1)

            // Update same item
            const start = performance.now()
            manager.processDirtyHeights([{ index: 0, oldHeight: 50, newHeight: 60 }])
            const end = performance.now()

            expect(end - start).toBeLessThan(0.1)
            expect(manager.totalMeasuredHeight).toBe(60)
            expect(manager.measuredCount).toBe(1) // Count shouldn't change
        })
    })

    describe('Accuracy Tests', () => {
        it('should maintain accuracy with alternating heights', () => {
            const dirtyResults: HeightChange[] = Array.from({ length: 5000 }, (_, i) => ({
                index: i,
                oldHeight: undefined,
                newHeight: i % 2 === 0 ? 30 : 50 // Alternating heights
            }))

            manager.processDirtyHeights(dirtyResults)

            // Manual calculation: 2500 * 30 + 2500 * 50 = 200,000
            expect(manager.totalMeasuredHeight).toBe(200000)
            expect(manager.measuredCount).toBe(5000)

            const totalHeight = manager.totalHeight
            // 200,000 (measured) + 5000 * 40 (estimated average) = 400,000
            expect(totalHeight).toBe(400000)
        })

        it('should handle complex update scenarios', () => {
            // Initial measurements
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 100 },
                { index: 1, oldHeight: undefined, newHeight: 200 },
                { index: 2, oldHeight: undefined, newHeight: 150 }
            ])

            expect(manager.totalMeasuredHeight).toBe(450)
            expect(manager.measuredCount).toBe(3)

            // Update existing items
            manager.processDirtyHeights([
                { index: 0, oldHeight: 100, newHeight: 120 },
                { index: 1, oldHeight: 200, newHeight: 180 }
            ])

            // 450 - 100 - 200 + 120 + 180 = 450
            expect(manager.totalMeasuredHeight).toBe(450)
            expect(manager.measuredCount).toBe(3)
        })
    })

    describe('State Management', () => {
        it('should update item length correctly', () => {
            manager.updateItemLength(20000)
            expect(manager.itemLength).toBe(20000)

            const totalHeight = manager.totalHeight
            expect(totalHeight).toBe(20000 * 40)
        })

        it('should update item height correctly', () => {
            manager.itemHeight = 50
            expect(manager.itemHeight).toBe(50)
        })

        it('should reset state correctly', () => {
            manager.processDirtyHeights([{ index: 0, oldHeight: undefined, newHeight: 100 }])

            expect(manager.totalMeasuredHeight).toBe(100)
            expect(manager.measuredCount).toBe(1)

            manager.reset()

            expect(manager.totalMeasuredHeight).toBe(0)
            expect(manager.measuredCount).toBe(0)
        })

        it('reset should not change initialized; updateItemLength should not change initialized', () => {
            expect(manager.initialized).toBe(false)
            manager.updateItemLength(15000)
            expect(manager.initialized).toBe(false)
            manager.initialized = true
            expect(manager.initialized).toBe(true)
            manager.reset()
            expect(manager.initialized).toBe(true)
        })
    })

    describe('ScrollTop state', () => {
        it('should default to 0 and allow set/get', () => {
            expect(manager.scrollTop).toBe(0)
            manager.scrollTop = 123
            expect(manager.scrollTop).toBe(123)
        })

        it('changing scrollTop should not affect height math', () => {
            const before = {
                totalMeasuredHeight: manager.totalMeasuredHeight,
                measuredCount: manager.measuredCount,
                averageHeight: manager.averageHeight,
                totalHeight: manager.totalHeight
            }

            manager.scrollTop = 500

            expect(manager.totalMeasuredHeight).toBe(before.totalMeasuredHeight)
            expect(manager.measuredCount).toBe(before.measuredCount)
            expect(manager.averageHeight).toBe(before.averageHeight)
            expect(manager.totalHeight).toBe(before.totalHeight)
        })

        it('reset and updateItemLength should not change scrollTop', () => {
            manager.scrollTop = 777
            manager.updateItemLength(12345)
            expect(manager.scrollTop).toBe(777)
            manager.reset()
            expect(manager.scrollTop).toBe(777)
        })

        it('can set scrollTop before and after initialized', () => {
            manager.scrollTop = 42
            expect(manager.scrollTop).toBe(42)
            manager.initialized = true
            manager.scrollTop = 88
            expect(manager.scrollTop).toBe(88)
        })
    })

    describe('Utility Methods', () => {
        it('should calculate coverage percentage correctly', () => {
            expect(manager.getMeasurementCoverage()).toBe(0)

            manager.processDirtyHeights([{ index: 0, oldHeight: undefined, newHeight: 40 }])

            expect(manager.getMeasurementCoverage()).toBe(0.01) // 1/10000 * 100
        })

        it('should check sufficient measurements correctly', () => {
            expect(manager.hasSufficientMeasurements(10)).toBe(false)

            // Add 1000 measurements (10% of 10000)
            const dirtyResults: HeightChange[] = Array.from({ length: 1000 }, (_, i) => ({
                index: i,
                oldHeight: undefined,
                newHeight: 40
            }))

            manager.processDirtyHeights(dirtyResults)
            expect(manager.hasSufficientMeasurements(10)).toBe(true)
        })

        it('should provide accurate debug info', () => {
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 100 },
                { index: 1, oldHeight: undefined, newHeight: 200 }
            ])

            const debugInfo = manager.getDebugInfo()

            expect(debugInfo.totalMeasuredHeight).toBe(300)
            expect(debugInfo.measuredCount).toBe(2)
            expect(debugInfo.itemLength).toBe(10000)
            expect(debugInfo.coveragePercent).toBe(0.02) // 2/10000 * 100
            expect(debugInfo.itemHeight).toBe(40)
        })

        it('hasSufficientMeasurements threshold edges', () => {
            expect(manager.hasSufficientMeasurements(0)).toBe(true)
            expect(manager.hasSufficientMeasurements(0.01)).toBe(false)

            const dirty100 = Array.from({ length: 100 }, (_, i) => ({
                index: i,
                oldHeight: undefined,
                newHeight: 40
            })) as HeightChange[]
            manager.processDirtyHeights(dirty100)

            expect(manager.getMeasurementCoverage()).toBeCloseTo(1, 5)
            expect(manager.hasSufficientMeasurements(1)).toBe(true)
            expect(manager.hasSufficientMeasurements(1.01)).toBe(false)
        })
    })

    describe('Average Height Calculations', () => {
        it('should return itemHeight when no items measured', () => {
            const manager = new ReactiveListManager({ itemLength: 100, itemHeight: 42 })

            expect(manager.averageHeight).toBe(42)
        })

        it('should calculate correct average from measured items', () => {
            const manager = new ReactiveListManager({ itemLength: 100, itemHeight: 40 })

            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 50 },
                { index: 1, oldHeight: undefined, newHeight: 30 },
                { index: 2, oldHeight: undefined, newHeight: 60 }
            ])

            // Average = (50 + 30 + 60) / 3 = 46.67
            expect(manager.averageHeight).toBeCloseTo(46.67, 2)
        })

        it('should update average when items change height', () => {
            const manager = new ReactiveListManager({ itemLength: 100, itemHeight: 40 })

            // Initial measurements
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 40 },
                { index: 1, oldHeight: undefined, newHeight: 40 }
            ])

            expect(manager.averageHeight).toBe(40)

            // Update item 0 height
            manager.processDirtyHeights([{ index: 0, oldHeight: 40, newHeight: 80 }])

            // Average = (80 + 40) / 2 = 60
            expect(manager.averageHeight).toBe(60)
        })

        it('should handle complex height change scenarios', () => {
            const manager = new ReactiveListManager({ itemLength: 100, itemHeight: 30 })

            // Measure some initial items
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 20 },
                { index: 1, oldHeight: undefined, newHeight: 40 },
                { index: 2, oldHeight: undefined, newHeight: 60 }
            ])

            expect(manager.averageHeight).toBe(40) // (20+40+60)/3

            // Remove one item and add a new one
            manager.processDirtyHeights([
                { index: 1, oldHeight: 40, newHeight: undefined }, // Remove
                { index: 3, oldHeight: undefined, newHeight: 100 } // Add
            ])

            // Now we have: 20, 60, 100 = average 60
            expect(manager.averageHeight).toBe(60)
            expect(manager.measuredCount).toBe(3)
        })

        it('should fall back to itemHeight after all items removed', () => {
            const manager = new ReactiveListManager({ itemLength: 100, itemHeight: 35 })

            // Add some measurements
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 50 },
                { index: 1, oldHeight: undefined, newHeight: 70 }
            ])

            expect(manager.averageHeight).toBe(60) // (50+70)/2

            // Remove all measurements
            manager.processDirtyHeights([
                { index: 0, oldHeight: 50, newHeight: undefined },
                { index: 1, oldHeight: 70, newHeight: undefined }
            ])

            expect(manager.averageHeight).toBe(35) // Back to itemHeight
            expect(manager.measuredCount).toBe(0)
        })

        it('should compute averages correctly with fractional heights', () => {
            const manager = new ReactiveListManager({ itemLength: 10, itemHeight: 10 })
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 10.5 },
                { index: 1, oldHeight: undefined, newHeight: 9.25 },
                { index: 2, oldHeight: undefined, newHeight: 11.75 }
            ])
            expect(manager.averageHeight).toBeCloseTo(10.5, 6)
        })
    })

    describe('Testing Limitations', () => {
        it('should document that reactivity cannot be unit tested', () => {
            // ❌ LIMITATION: We cannot test reactivity in isolation
            // Svelte's reactive system requires proper component context
            // $effect can only be used during component initialization

            // ✅ What we CAN test:
            expect(manager.totalHeight).toBe(10000 * 40) // Logic works

            manager.processDirtyHeights([{ index: 0, oldHeight: undefined, newHeight: 100 }])
            // When we add one measurement of 100, the average becomes 100
            // So: 1 * 100 (measured) + 9999 * 100 (estimated from average) = 1,000,000
            expect(manager.totalHeight).toBe(1000000) // State updates

            // ❌ What we CANNOT test:
            // - Does totalHeight trigger reactive updates?
            // - Do components re-render when state changes?
            // - Does the reactive system actually work?

            // 📝 SOLUTION: Test reactivity at integration level using real components
        })

        it('should verify state changes work (non-reactive)', () => {
            // Test that our state management logic is correct
            // Even though we can't test reactivity, we can verify state updates

            const initialTotal = manager.totalHeight
            const initialCount = manager.measuredCount

            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 50 },
                { index: 1, oldHeight: undefined, newHeight: 60 }
            ])

            // Verify state changed correctly
            expect(manager.measuredCount).toBe(initialCount + 2)
            expect(manager.totalHeight).not.toBe(initialTotal)

            // Test that getters return updated values
            const debugInfo = manager.getDebugInfo()
            expect(debugInfo.totalMeasuredHeight).toBe(110)
            expect(debugInfo.measuredCount).toBe(2)
        })
    })

    describe('Mutations and removals', () => {
        it('processDirtyHeights should remove measurements when newHeight is undefined', () => {
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 50 },
                { index: 1, oldHeight: undefined, newHeight: 60 }
            ])
            expect(manager.measuredCount).toBe(2)
            expect(manager.totalMeasuredHeight).toBe(110)

            manager.processDirtyHeights([{ index: 1, oldHeight: 60, newHeight: undefined }])
            expect(manager.measuredCount).toBe(1)
            expect(manager.totalMeasuredHeight).toBe(50)
            expect(manager.averageHeight).toBe(50)
        })

        it('setMeasuredHeight should increment count once and update on replacement', () => {
            const manager = new ReactiveListManager({ itemLength: 100, itemHeight: 40 })
            manager.setMeasuredHeight(5, 70)
            expect(manager.measuredCount).toBe(1)
            expect(manager.totalMeasuredHeight).toBe(70)

            manager.setMeasuredHeight(5, 80)
            expect(manager.measuredCount).toBe(1)
            expect(manager.totalMeasuredHeight).toBe(80)

            manager.setMeasuredHeight(-1, 50)
            manager.setMeasuredHeight(1000, 90)
            expect(manager.measuredCount).toBe(1)
            expect(manager.totalMeasuredHeight).toBe(80)
        })

        it('decreasing item length recomputes totals without changing measured count (document behavior)', () => {
            const manager = new ReactiveListManager({ itemLength: 5000, itemHeight: 40 })
            const dirty: HeightChange[] = Array.from({ length: 100 }, (_, i) => ({
                index: i,
                oldHeight: undefined,
                newHeight: 50
            }))
            manager.processDirtyHeights(dirty)
            expect(manager.measuredCount).toBe(100)

            manager.updateItemLength(2000)
            expect(manager.itemLength).toBe(2000)

            const expectedAverage = manager.averageHeight
            const expectedTotal =
                manager.totalMeasuredHeight + (2000 - manager.measuredCount) * expectedAverage
            expect(manager.totalHeight).toBe(expectedTotal)
        })

        it('getHeightCache exposure does not affect totals when mutated externally', () => {
            const manager = new ReactiveListManager({ itemLength: 100, itemHeight: 40 })
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 50 },
                { index: 1, oldHeight: undefined, newHeight: 60 }
            ])
            const prevTotal = manager.totalHeight
            const prevAvg = manager.averageHeight

            const cache = manager.getHeightCache() as Record<number, number>
            cache[0] = 999999

            expect(manager.totalHeight).toBe(prevTotal)
            expect(manager.averageHeight).toBe(prevAvg)
        })
    })
})
