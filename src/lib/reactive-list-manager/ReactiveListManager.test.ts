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

    describe('DOM References', () => {
        it('should start not ready with null element refs', () => {
            expect(manager.isReady).toBe(false)
            expect(manager.containerElement).toBeNull()
            expect(manager.viewportElement).toBeNull()
        })

        it('should throw when accessing non-null accessors before ready', () => {
            expect(() => manager.container).toThrowError('container is not ready')
            expect(() => manager.viewport).toThrowError('viewport is not ready')
        })

        it('should allow setting container then viewport and become ready', () => {
            const container = document.createElement('div')
            const viewport = document.createElement('div')

            manager.containerElement = container
            expect(manager.containerElement).toBe(container)
            expect(manager.isReady).toBe(false)

            manager.viewportElement = viewport
            expect(manager.viewportElement).toBe(viewport)
            expect(manager.isReady).toBe(true)

            expect(manager.container).toBe(container)
            expect(manager.viewport).toBe(viewport)
        })

        it('should allow setting viewport then container and become ready', () => {
            const m = new ReactiveListManager({ itemLength: 1, itemHeight: 1 })
            const container = document.createElement('div')
            const viewport = document.createElement('div')

            m.viewportElement = viewport
            expect(m.viewportElement).toBe(viewport)
            expect(m.isReady).toBe(false)

            m.containerElement = container
            expect(m.containerElement).toBe(container)
            expect(m.isReady).toBe(true)

            expect(m.container).toBe(container)
            expect(m.viewport).toBe(viewport)
        })
    })

    describe('runDynamicUpdate', () => {
        it('should keep overflow-anchor as none around sync updates', async () => {
            const container = document.createElement('div')
            const viewport = document.createElement('div')
            manager.containerElement = container
            manager.viewportElement = viewport

            expect(manager.isDynamicUpdateInProgress).toBe(false)

            await manager.runDynamicUpdate(() => {
                expect(manager.isDynamicUpdateInProgress).toBe(true)
                expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')
            })

            expect(manager.isDynamicUpdateInProgress).toBe(false)
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')
        })

        it('should work when not ready (no elements set)', async () => {
            const m = new ReactiveListManager({ itemLength: 1, itemHeight: 1 })
            let ran = false
            await m.runDynamicUpdate(() => {
                ran = true
            })
            expect(ran).toBe(true)
            expect(m.isDynamicUpdateInProgress).toBe(false)
        })

        it('should keep overflow-anchor as none after async function resolves', async () => {
            const container = document.createElement('div')
            const viewport = document.createElement('div')
            manager.containerElement = container
            manager.viewportElement = viewport

            await manager.runDynamicUpdate(async () => {
                expect(manager.isDynamicUpdateInProgress).toBe(true)
                await Promise.resolve()
                expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')
            })
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')
            expect(manager.isDynamicUpdateInProgress).toBe(false)
        })
    })

    describe('startDynamicUpdate / endDynamicUpdate', () => {
        it('should keep overflow-anchor as none with manual start/end when ready (no nesting)', () => {
            const container = document.createElement('div')
            const viewport = document.createElement('div')
            manager.containerElement = container
            manager.viewportElement = viewport

            expect(manager.isDynamicUpdateInProgress).toBe(false)

            manager.startDynamicUpdate()
            expect(manager.isDynamicUpdateInProgress).toBe(true)
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')

            manager.endDynamicUpdate()
            expect(manager.isDynamicUpdateInProgress).toBe(false)
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')
        })

        it('should handle nested start/end correctly and only re-enable on final end', () => {
            const container = document.createElement('div')
            const viewport = document.createElement('div')
            manager.containerElement = container
            manager.viewportElement = viewport

            manager.startDynamicUpdate() // depth 1
            expect(manager.isDynamicUpdateInProgress).toBe(true)
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')

            manager.startDynamicUpdate() // depth 2
            expect(manager.isDynamicUpdateInProgress).toBe(true)
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')

            manager.endDynamicUpdate() // depth 1
            expect(manager.isDynamicUpdateInProgress).toBe(true)
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')

            manager.endDynamicUpdate() // depth 0
            expect(manager.isDynamicUpdateInProgress).toBe(false)
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')

            // extra end should be a no-op (underflow guard)
            manager.endDynamicUpdate()
            expect(manager.isDynamicUpdateInProgress).toBe(false)
            expect(viewport.style.getPropertyValue('overflow-anchor')).toBe('none')
        })

        it('should work without elements set: flips inProgress but does not touch styles', () => {
            const m = new ReactiveListManager({ itemLength: 1, itemHeight: 1 })
            const dummy = document.createElement('div')
            expect(m.isReady).toBe(false)

            m.startDynamicUpdate()
            expect(m.isDynamicUpdateInProgress).toBe(true)
            expect(dummy.style.getPropertyValue('overflow-anchor')).toBe('')

            m.endDynamicUpdate()
            expect(m.isDynamicUpdateInProgress).toBe(false)
            expect(dummy.style.getPropertyValue('overflow-anchor')).toBe('')
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

    describe('Block Sum Caching', () => {
        it('should return block sums array from getBlockSums', () => {
            const manager = new ReactiveListManager({ itemLength: 3000, itemHeight: 40 })

            const blockSums = manager.getBlockSums()

            expect(Array.isArray(blockSums)).toBe(true)
            // With 3000 items and blockSize=1000, we have 3 blocks
            // Block sums has blocks-1 entries (prefix sums) = 2
            expect(blockSums.length).toBe(2)
        })

        it('should cache block sums and return same array on repeated calls', () => {
            const manager = new ReactiveListManager({ itemLength: 3000, itemHeight: 40 })

            const blockSums1 = manager.getBlockSums()
            const blockSums2 = manager.getBlockSums()

            expect(blockSums1).toBe(blockSums2) // Same reference
        })

        it('should calculate correct block sums with uniform heights', () => {
            const manager = new ReactiveListManager({ itemLength: 2500, itemHeight: 40 })

            const blockSums = manager.getBlockSums()

            // With 2500 items, we have 3 blocks (0-999, 1000-1999, 2000-2499)
            // Block sums has 2 entries (prefix sums for blocks 0 and 1)
            // Entry 0: sum of items 0-999 = 1000 * 40 = 40000
            // Entry 1: sum of items 0-1999 = 2000 * 40 = 80000
            expect(blockSums.length).toBe(2)
            expect(blockSums[0]).toBe(40000)
            expect(blockSums[1]).toBe(80000)
        })

        it('should use measured heights in block sum calculation', () => {
            const manager = new ReactiveListManager({ itemLength: 2000, itemHeight: 40 })

            // Measure some items in block 0
            manager.processDirtyHeights([
                { index: 0, oldHeight: undefined, newHeight: 100 },
                { index: 1, oldHeight: undefined, newHeight: 100 }
            ])

            const blockSums = manager.getBlockSums()

            // Block 0: 2 measured at 100 + 998 estimated at average (100)
            // Average = 100, so block 0 = 1000 * 100 = 100000
            expect(blockSums[0]).toBe(100000)
        })

        it('should invalidate block sums when heights change', () => {
            const manager = new ReactiveListManager({ itemLength: 2000, itemHeight: 40 })

            const blockSums1 = manager.getBlockSums()

            // Measure an item
            manager.processDirtyHeights([{ index: 0, oldHeight: undefined, newHeight: 100 }])

            const blockSums2 = manager.getBlockSums()

            // Should be different arrays (cache was invalidated)
            expect(blockSums1).not.toBe(blockSums2)
        })

        it('should invalidate only affected blocks when invalidateBlockSumsFrom is called', () => {
            const manager = new ReactiveListManager({ itemLength: 5000, itemHeight: 40 })

            // Build initial cache
            manager.getBlockSums()

            // Invalidate from index 1500 (block 1)
            manager.invalidateBlockSumsFrom(1500)

            // Getting block sums should rebuild from block 1 onwards
            const blockSums = manager.getBlockSums()

            // 5000 items = 5 blocks, so 4 prefix sums
            expect(blockSums.length).toBe(4)
        })

        it('should invalidate all block sums on reset', () => {
            const manager = new ReactiveListManager({ itemLength: 3000, itemHeight: 40 })

            const blockSums1 = manager.getBlockSums()

            manager.reset()

            const blockSums2 = manager.getBlockSums()

            expect(blockSums1).not.toBe(blockSums2)
        })

        it('should invalidate block sums on updateItemLength', () => {
            const manager = new ReactiveListManager({ itemLength: 3000, itemHeight: 40 })

            const blockSums1 = manager.getBlockSums()
            // 3000 items = 3 blocks, so 2 prefix sums
            expect(blockSums1.length).toBe(2)

            manager.updateItemLength(5000)

            const blockSums2 = manager.getBlockSums()
            // 5000 items = 5 blocks, so 4 prefix sums
            expect(blockSums2.length).toBe(4)
            expect(blockSums1).not.toBe(blockSums2)
        })

        it('should invalidate block sums on setMeasuredHeight', () => {
            const manager = new ReactiveListManager({ itemLength: 2000, itemHeight: 40 })

            const blockSums1 = manager.getBlockSums()

            manager.setMeasuredHeight(500, 100)

            const blockSums2 = manager.getBlockSums()

            expect(blockSums1).not.toBe(blockSums2)
        })

        it('should handle edge case with zero items', () => {
            const manager = new ReactiveListManager({ itemLength: 0, itemHeight: 40 })

            const blockSums = manager.getBlockSums()

            expect(blockSums).toEqual([])
        })

        it('should handle items less than one block', () => {
            const manager = new ReactiveListManager({ itemLength: 500, itemHeight: 40 })

            const blockSums = manager.getBlockSums()

            // With only 1 block, there are no prefix sums needed
            expect(blockSums.length).toBe(0)
        })

        it('should handle exactly one block of items', () => {
            const manager = new ReactiveListManager({ itemLength: 1000, itemHeight: 40 })

            const blockSums = manager.getBlockSums()

            // With exactly 1 block, there are no prefix sums needed
            expect(blockSums.length).toBe(0)
        })

        it('should perform efficiently with large item counts', () => {
            const manager = new ReactiveListManager({ itemLength: 100000, itemHeight: 40 })

            const start = performance.now()
            const blockSums = manager.getBlockSums()
            const firstCall = performance.now() - start

            // First call should be fast (< 10ms)
            expect(firstCall).toBeLessThan(10)
            // Block sums has blocks-1 entries (prefix sums for 100 blocks = 99 entries)
            expect(blockSums.length).toBe(99)

            // Second call should be near instant (cached)
            const start2 = performance.now()
            manager.getBlockSums()
            const secondCall = performance.now() - start2

            expect(secondCall).toBeLessThan(1)
        })
    })
})
