import { describe, expect, it } from 'vitest'
import type { ScrollTargetParams } from './scrollCalculation.js'
import { calculateScrollTarget } from './scrollCalculation.js'

describe('calculateScrollTarget', () => {
    const baseParams: ScrollTargetParams = {
        mode: 'topToBottom',
        align: 'auto',
        targetIndex: 10,
        itemsLength: 100,
        calculatedItemHeight: 50,
        height: 400,
        scrollTop: 200,
        firstVisibleIndex: 4,
        lastVisibleIndex: 12,
        heightCache: {}
    }

    describe('topToBottom mode', () => {
        describe('auto alignment', () => {
            it('should scroll to top when item is above viewport', () => {
                const params: ScrollTargetParams = {
                    ...baseParams,
                    targetIndex: 2, // Above firstVisibleIndex (4)
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                expect(result).toBe(100) // 2 * 50 = 100
            })

            it('should scroll to bottom when item is below viewport', () => {
                const params: ScrollTargetParams = {
                    ...baseParams,
                    targetIndex: 15, // Above lastVisibleIndex - 1 (11)
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                expect(result).toBe(400) // (15 + 1) * 50 - 400 = 800 - 400 = 400
            })

            it('should align to nearest edge when item is visible', () => {
                const params: ScrollTargetParams = {
                    ...baseParams,
                    targetIndex: 8, // Between firstVisibleIndex (4) and lastVisibleIndex (12)
                    scrollTop: 200,
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                // itemTop = 8 * 50 = 400, itemBottom = 9 * 50 = 450
                // distanceToTop = |200 - 400| = 200
                // distanceToBottom = |200 + 400 - 450| = |600 - 450| = 150
                // Closer to bottom, so align to bottom: 450 - 400 = 50
                expect(result).toBe(50)
            })
        })

        describe('top alignment', () => {
            it('should align item to top of viewport', () => {
                const params: ScrollTargetParams = {
                    ...baseParams,
                    align: 'top',
                    targetIndex: 10
                }

                const result = calculateScrollTarget(params)
                expect(result).toBe(500) // 10 * 50 = 500
            })
        })

        describe('bottom alignment', () => {
            it('should align item to bottom of viewport', () => {
                const params: ScrollTargetParams = {
                    ...baseParams,
                    align: 'bottom',
                    targetIndex: 10
                }

                const result = calculateScrollTarget(params)
                expect(result).toBe(150) // (10 + 1) * 50 - 400 = 550 - 400 = 150
            })
        })

        describe('nearest alignment', () => {
            it('should scroll to nearest edge when item is not visible', () => {
                const params: ScrollTargetParams = {
                    ...baseParams,
                    align: 'nearest',
                    targetIndex: 2, // Not visible
                    scrollTop: 200,
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                // Item is not visible, align to top
                expect(result).toBe(100) // 2 * 50 = 100
            })

            it('should return null when item is already visible', () => {
                const params: ScrollTargetParams = {
                    ...baseParams,
                    align: 'nearest',
                    targetIndex: 8, // Visible
                    scrollTop: 200,
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                expect(result).toBeNull()
            })
        })
    })

    describe('bottomToTop mode', () => {
        const bottomToTopParams: ScrollTargetParams = {
            ...baseParams,
            mode: 'bottomToTop' as const,
            itemsLength: 20 // Smaller list for easier calculations
        }

        describe('auto alignment', () => {
            it('should scroll to top when item is above viewport', () => {
                const params: ScrollTargetParams = {
                    ...bottomToTopParams,
                    targetIndex: 2, // Above firstVisibleIndex (4)
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                // totalHeight = 20 * 50 = 1000
                // itemOffset = 2 * 50 = 100, itemHeight = 50
                // Math.max(0, 1000 - (100 + 50)) = Math.max(0, 850) = 850
                expect(result).toBe(850)
            })

            it('should scroll to bottom when item is below viewport', () => {
                const params: ScrollTargetParams = {
                    ...bottomToTopParams,
                    targetIndex: 15, // Above lastVisibleIndex - 1 (11)
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                // totalHeight = 20 * 50 = 1000
                // itemOffset = 15 * 50 = 750
                // Math.max(0, 1000 - 750 - 400) = Math.max(0, -150) = 0
                expect(result).toBe(0)
            })

            it('should align to nearest edge when item is visible', () => {
                const params: ScrollTargetParams = {
                    ...bottomToTopParams,
                    targetIndex: 8,
                    scrollTop: 200,
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                // totalHeight = 20 * 50 = 1000
                // itemOffset = 8 * 50 = 400, itemHeight = 50
                // itemTop = 1000 - (400 + 50) = 550
                // itemBottom = 1000 - 400 = 600
                // distanceToTop = |200 - 550| = 350
                // distanceToBottom = |200 + 400 - 600| = 0
                // Closer to bottom, so: Math.max(0, 600 - 400) = 200
                expect(result).toBe(200)
            })
        })

        describe('top alignment', () => {
            it('should align item to top of viewport', () => {
                const params: ScrollTargetParams = {
                    ...bottomToTopParams,
                    align: 'top',
                    targetIndex: 10
                }

                const result = calculateScrollTarget(params)
                // totalHeight = 20 * 50 = 1000
                // itemOffset = 10 * 50 = 500, itemHeight = 50
                // Math.max(0, 1000 - (500 + 50)) = Math.max(0, 450) = 450
                expect(result).toBe(450)
            })
        })

        describe('bottom alignment', () => {
            it('should align item to bottom of viewport', () => {
                const params: ScrollTargetParams = {
                    ...bottomToTopParams,
                    align: 'bottom',
                    targetIndex: 10
                }

                const result = calculateScrollTarget(params)
                // totalHeight = 20 * 50 = 1000
                // itemOffset = 10 * 50 = 500
                // Math.max(0, 1000 - 500 - 400) = Math.max(0, 100) = 100
                expect(result).toBe(100)
            })
        })

        describe('nearest alignment', () => {
            it('should scroll to nearest edge when item is not visible', () => {
                const params: ScrollTargetParams = {
                    ...bottomToTopParams,
                    align: 'nearest',
                    targetIndex: 2,
                    scrollTop: 200,
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                // totalHeight = 20 * 50 = 1000
                // itemOffset = 2 * 50 = 100, itemHeight = 50
                // itemTop = 1000 - (100 + 50) = 850
                // itemBottom = 1000 - 100 = 900
                // scrollTop = 200, scrollTop + height = 200 + 400 = 600
                // Item is not visible: itemBottom (900) > scrollTop + height (600)
                // distanceToTop = |200 - 850| = 650
                // distanceToBottom = |600 - 900| = 300
                // Closer to bottom, so: Math.max(0, 900 - 400) = 500
                expect(result).toBe(500) // Should align to bottom (closer)
            })

            it('should return null when item is already visible', () => {
                const params: ScrollTargetParams = {
                    ...bottomToTopParams,
                    align: 'nearest',
                    targetIndex: 8,
                    scrollTop: 400,
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                // Make sure item is actually visible
                // totalHeight = 20 * 50 = 1000
                // itemOffset = 8 * 50 = 400, itemHeight = 50
                // itemTop = 1000 - (400 + 50) = 550
                // itemBottom = 1000 - 400 = 600
                // scrollTop = 400, scrollTop + height = 400 + 400 = 800
                // Item is visible: itemBottom (600) > scrollTop (400) and itemTop (550) < scrollTop + height (800)

                const result = calculateScrollTarget(params)
                expect(result).toBeNull()
            })
        })
    })

    describe('edge cases', () => {
        it('should handle zero height gracefully', () => {
            const params: ScrollTargetParams = {
                ...baseParams,
                height: 0
            }

            const result = calculateScrollTarget(params)
            expect(typeof result).toBe('number')
        })

        it('should handle single item list', () => {
            const params: ScrollTargetParams = {
                ...baseParams,
                itemsLength: 1,
                targetIndex: 0,
                firstVisibleIndex: 0,
                lastVisibleIndex: 1
            }

            const result = calculateScrollTarget(params)
            expect(typeof result).toBe('number')
        })

        it('should handle large item height', () => {
            const params: ScrollTargetParams = {
                ...baseParams,
                calculatedItemHeight: 1000,
                targetIndex: 5
            }

            const result = calculateScrollTarget(params)
            expect(typeof result).toBe('number')
        })

        it('should respect minimum scroll position of 0', () => {
            const params: ScrollTargetParams = {
                ...baseParams,
                mode: 'bottomToTop' as const,
                align: 'bottom',
                targetIndex: 0,
                itemsLength: 2,
                height: 1000 // Very large height
            }

            const result = calculateScrollTarget(params)
            expect(result).toBeGreaterThanOrEqual(0)
        })
    })
})
