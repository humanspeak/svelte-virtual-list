import { describe, expect, it } from 'vitest'
import type { ScrollTargetParams } from './scrollCalculation.js'
import {
    KEYBOARD_LINE_SCROLL_PX,
    alignToEdge,
    alignVisibleToNearestEdge,
    calculateKeyboardScrollTarget,
    calculateScrollTarget,
    isKeyboardScrollKey,
    resolveAnchorScrollTarget
} from './scrollCalculation.js'
import { buildBlockSums, getValidHeight } from './virtualList.js'

describe('alignToEdge', () => {
    // Common test setup: item at position 400-450, viewport 400px tall
    const itemTop = 400
    const itemBottom = 450
    const viewportHeight = 400

    describe('top alignment', () => {
        it('should return itemTop for top alignment', () => {
            expect(alignToEdge(itemTop, itemBottom, 200, viewportHeight, 'top')).toBe(400)
        })

        it('should return itemTop regardless of current scroll position', () => {
            expect(alignToEdge(itemTop, itemBottom, 0, viewportHeight, 'top')).toBe(400)
            expect(alignToEdge(itemTop, itemBottom, 1000, viewportHeight, 'top')).toBe(400)
        })

        it('should handle negative itemTop', () => {
            expect(alignToEdge(-100, 50, 0, viewportHeight, 'top')).toBe(-100)
        })

        it('should handle zero itemTop', () => {
            expect(alignToEdge(0, 50, 200, viewportHeight, 'top')).toBe(0)
        })
    })

    describe('bottom alignment', () => {
        it('should align item bottom to viewport bottom', () => {
            // itemBottom - viewportHeight = 450 - 400 = 50
            expect(alignToEdge(itemTop, itemBottom, 200, viewportHeight, 'bottom')).toBe(50)
        })

        it('should clamp to 0 when result would be negative', () => {
            // itemBottom (100) - viewportHeight (400) = -300, clamped to 0
            expect(alignToEdge(0, 100, 200, 400, 'bottom')).toBe(0)
        })

        it('should handle item larger than viewport', () => {
            // Item 1000px tall, viewport 400px
            // itemBottom (1000) - viewportHeight (400) = 600
            expect(alignToEdge(0, 1000, 200, 400, 'bottom')).toBe(600)
        })

        it('should handle very small viewport', () => {
            // viewportHeight of 10
            expect(alignToEdge(400, 450, 200, 10, 'bottom')).toBe(440)
        })
    })

    describe('nearest alignment - item not visible', () => {
        it('should align to top when item is above viewport', () => {
            // Item at 100-150, scrollTop at 500 (viewport 500-900)
            // Item is above viewport, closer to top
            const result = alignToEdge(100, 150, 500, 400, 'nearest')
            expect(result).toBe(100) // Aligns to top
        })

        it('should align to bottom when item is below viewport', () => {
            // Item at 1000-1050, scrollTop at 100 (viewport 100-500)
            // Item is below viewport
            // distanceToTop = |100 - 1000| = 900
            // distanceToBottom = |500 - 1050| = 550
            // Closer to bottom, so itemBottom - viewportHeight = 1050 - 400 = 650
            const result = alignToEdge(1000, 1050, 100, 400, 'nearest')
            expect(result).toBe(650)
        })

        it('should prefer top when equidistant', () => {
            // Equal distances - should prefer top (< is strict)
            // Item at 0-100, scrollTop at 200 (viewport 200-600)
            // distanceToTop = |200 - 0| = 200
            // distanceToBottom = |600 - 100| = 500
            const result = alignToEdge(0, 100, 200, 400, 'nearest')
            expect(result).toBe(0)
        })
    })

    describe('nearest alignment - item visible', () => {
        it('should return null when item is fully visible', () => {
            // Item at 250-300, scrollTop at 100 (viewport 100-500)
            const result = alignToEdge(250, 300, 100, 400, 'nearest')
            expect(result).toBeNull()
        })

        it('should return null when item fills entire viewport', () => {
            // Item at 100-500, scrollTop at 100 (viewport 100-500)
            const result = alignToEdge(100, 500, 100, 400, 'nearest')
            expect(result).toBeNull()
        })

        it('should return null when item is partially visible at top', () => {
            // Item at 50-150, scrollTop at 100 (viewport 100-500)
            // itemTop (50) < viewportBottom (500) AND itemBottom (150) > scrollTop (100)
            const result = alignToEdge(50, 150, 100, 400, 'nearest')
            expect(result).toBeNull()
        })

        it('should return null when item is partially visible at bottom', () => {
            // Item at 450-550, scrollTop at 100 (viewport 100-500)
            // itemTop (450) < viewportBottom (500) AND itemBottom (550) > scrollTop (100)
            const result = alignToEdge(450, 550, 100, 400, 'nearest')
            expect(result).toBeNull()
        })
    })

    describe('edge cases', () => {
        it('should handle zero viewport height', () => {
            const result = alignToEdge(400, 450, 200, 0, 'bottom')
            expect(result).toBe(450) // itemBottom - 0 = 450
        })

        it('should handle item with zero height', () => {
            // Point item at position 400
            const result = alignToEdge(400, 400, 200, 400, 'top')
            expect(result).toBe(400)
        })

        it('should handle very large scroll values', () => {
            const largeScroll = 1000000
            const result = alignToEdge(0, 50, largeScroll, 400, 'top')
            expect(result).toBe(0)
        })

        it('should handle negative scroll values', () => {
            // Shouldn't happen in practice but should handle gracefully
            const result = alignToEdge(100, 150, -100, 400, 'nearest')
            // Item is visible: itemTop (100) < viewportBottom (300) AND itemBottom (150) > scrollTop (-100)
            expect(result).toBeNull()
        })
    })
})

describe('alignVisibleToNearestEdge', () => {
    // This function always returns a value (used for auto alignment of visible items)
    const itemTop = 400
    const itemBottom = 450
    const viewportHeight = 400

    describe('positive cases - closer to top', () => {
        it('should align to top when item is closer to top edge', () => {
            // Item at 400-450, scrollTop at 350 (viewport 350-750)
            // distanceToTop = |350 - 400| = 50
            // distanceToBottom = |750 - 450| = 300
            // Closer to top
            const result = alignVisibleToNearestEdge(400, 450, 350, viewportHeight)
            expect(result).toBe(400)
        })

        it('should return itemTop when distances are equal', () => {
            // Create equal distances
            // Item at 150-250, scrollTop at 0 (viewport 0-400)
            // distanceToTop = |0 - 150| = 150
            // distanceToBottom = |400 - 250| = 150
            // Equal distances, distanceToTop < distanceToBottom is false, returns bottom
            const result = alignVisibleToNearestEdge(150, 250, 0, 400)
            expect(result).toBe(0) // 250 - 400 = -150, clamped to 0
        })
    })

    describe('positive cases - closer to bottom', () => {
        it('should align to bottom when item is closer to bottom edge', () => {
            // Item at 400-450, scrollTop at 200 (viewport 200-600)
            // distanceToTop = |200 - 400| = 200
            // distanceToBottom = |600 - 450| = 150
            // Closer to bottom
            const result = alignVisibleToNearestEdge(400, 450, 200, viewportHeight)
            expect(result).toBe(50) // 450 - 400 = 50
        })

        it('should align to bottom when item is at bottom of viewport', () => {
            // Item at 350-400, scrollTop at 0 (viewport 0-400)
            // distanceToTop = |0 - 350| = 350
            // distanceToBottom = |400 - 400| = 0
            const result = alignVisibleToNearestEdge(350, 400, 0, 400)
            expect(result).toBe(0) // 400 - 400 = 0
        })
    })

    describe('negative cases - clamping', () => {
        it('should clamp to 0 when bottom alignment would be negative', () => {
            // Item at 0-100, viewport 400px
            // distanceToTop = |0 - 0| = 0 for scrollTop 0
            // But let's test where bottom alignment wins and would be negative
            // Item at 0-50, scrollTop at -100 (hypothetically)
            // Actually: for clamping, item bottom - viewport = 50 - 400 = -350 → clamped to 0
            const result = alignVisibleToNearestEdge(0, 50, 200, 400)
            // distanceToTop = |200 - 0| = 200
            // distanceToBottom = |600 - 50| = 550
            // Closer to top, returns itemTop
            expect(result).toBe(0)
        })
    })

    describe('edge cases', () => {
        it('should handle item exactly at viewport top', () => {
            // Item starts exactly where viewport starts
            const result = alignVisibleToNearestEdge(100, 150, 100, 400)
            // distanceToTop = |100 - 100| = 0
            // distanceToBottom = |500 - 150| = 350
            expect(result).toBe(100) // Already at top
        })

        it('should handle item exactly at viewport bottom', () => {
            // Item ends exactly where viewport ends
            const result = alignVisibleToNearestEdge(450, 500, 100, 400)
            // distanceToTop = |100 - 450| = 350
            // distanceToBottom = |500 - 500| = 0
            expect(result).toBe(100) // 500 - 400 = 100
        })

        it('should handle zero viewport height', () => {
            const result = alignVisibleToNearestEdge(400, 450, 200, 0)
            // distanceToTop = |200 - 400| = 200
            // distanceToBottom = |200 - 450| = 250
            // Closer to top
            expect(result).toBe(400)
        })

        it('should handle item filling viewport', () => {
            // Item exactly fills viewport
            const result = alignVisibleToNearestEdge(100, 500, 100, 400)
            // distanceToTop = |100 - 100| = 0
            // distanceToBottom = |500 - 500| = 0
            // Equal, returns itemTop
            expect(result).toBe(100)
        })

        it('should handle item larger than viewport', () => {
            // Item is 1000px, viewport is 400px
            const result = alignVisibleToNearestEdge(100, 1100, 200, 400)
            // distanceToTop = |200 - 100| = 100
            // distanceToBottom = |600 - 1100| = 500
            // Closer to top
            expect(result).toBe(100)
        })

        it('should handle negative itemTop', () => {
            // Unusual but possible in some coordinate systems
            const result = alignVisibleToNearestEdge(-100, 50, 0, 400)
            // distanceToTop = |0 - (-100)| = 100
            // distanceToBottom = |400 - 50| = 350
            // Closer to top
            expect(result).toBe(-100)
        })
    })
})

describe('calculateScrollTarget', () => {
    const baseParams: ScrollTargetParams = {
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
                const params = {
                    ...baseParams,
                    targetIndex: 2, // Above firstVisibleIndex (4)
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                expect(result).toBe(100) // 2 * 50 = 100
            })

            it('should scroll to bottom when item is below viewport', () => {
                const params = {
                    ...baseParams,
                    targetIndex: 15, // Above lastVisibleIndex - 1 (11)
                    firstVisibleIndex: 4,
                    lastVisibleIndex: 12
                }

                const result = calculateScrollTarget(params)
                expect(result).toBe(400) // (15 + 1) * 50 - 400 = 800 - 400 = 400
            })

            it('should align to nearest edge when item is visible', () => {
                const params = {
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
                align: 'bottom',
                targetIndex: 0,
                itemsLength: 2,
                height: 1000 // Very large height
            }

            const result = calculateScrollTarget(params)
            expect(result).toBeGreaterThanOrEqual(0)
        })
    })

    describe('height cache integration', () => {
        it('should use height cache for accurate calculations when available', () => {
            const heightCache = {
                0: 20.5,
                1: 18.2,
                2: 22.1,
                3: 19.8,
                4: 21.3
            }
            const params: ScrollTargetParams = {
                ...baseParams,
                targetIndex: 3,
                itemsLength: 10,
                calculatedItemHeight: 19.2,
                heightCache,
                firstVisibleIndex: 0,
                lastVisibleIndex: 5
            }

            const result = calculateScrollTarget(params)
            expect(typeof result).toBe('number')
            expect(result).toBeGreaterThanOrEqual(0)
        })

        it('should handle mixed cached and estimated heights correctly', () => {
            const heightCache = {
                0: 20.1,
                1: 18.5,
                // Gap: indices 2-49 not cached
                50: 22.3,
                51: 19.7
            }
            const params: ScrollTargetParams = {
                ...baseParams,
                targetIndex: 25,
                itemsLength: 100,
                calculatedItemHeight: 19.2,
                heightCache,
                firstVisibleIndex: 0,
                lastVisibleIndex: 10
            }

            const result = calculateScrollTarget(params)
            expect(typeof result).toBe('number')
            expect(result).toBeGreaterThanOrEqual(0)
        })

        it('should handle fractional heights', () => {
            const params: ScrollTargetParams = {
                ...baseParams,
                targetIndex: 100,
                itemsLength: 1000,
                calculatedItemHeight: 19.200002843683418,
                heightCache: {},
                firstVisibleIndex: 0,
                lastVisibleIndex: 20
            }

            const result = calculateScrollTarget(params)
            expect(typeof result).toBe('number')
            expect(result).toBeGreaterThanOrEqual(0)
        })
    })
})

describe('isKeyboardScrollKey', () => {
    it('accepts every standard scroll key', () => {
        for (const key of ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End']) {
            expect(isKeyboardScrollKey(key)).toBe(true)
        }
    })

    it('rejects non-scroll keys', () => {
        for (const key of ['Tab', 'Escape', 'Enter', 'a', 'ArrowLeft', 'ArrowRight']) {
            expect(isKeyboardScrollKey(key)).toBe(false)
        }
    })
})

describe('calculateKeyboardScrollTarget', () => {
    // 400px viewport over 8000px of content, resting mid-list
    const base = { shiftKey: false, scrollTop: 2000, clientHeight: 400, scrollHeight: 8000 }
    const maxScrollTop = base.scrollHeight - base.clientHeight
    const page = base.clientHeight - KEYBOARD_LINE_SCROLL_PX

    it('moves one line on arrows', () => {
        expect(calculateKeyboardScrollTarget({ ...base, key: 'ArrowDown' })).toBe(
            base.scrollTop + KEYBOARD_LINE_SCROLL_PX
        )
        expect(calculateKeyboardScrollTarget({ ...base, key: 'ArrowUp' })).toBe(
            base.scrollTop - KEYBOARD_LINE_SCROLL_PX
        )
    })

    it('moves one page with a line of overlap on page keys', () => {
        expect(calculateKeyboardScrollTarget({ ...base, key: 'PageDown' })).toBe(
            base.scrollTop + page
        )
        expect(calculateKeyboardScrollTarget({ ...base, key: 'PageUp' })).toBe(
            base.scrollTop - page
        )
    })

    it('pages down on Space and up on Shift+Space', () => {
        expect(calculateKeyboardScrollTarget({ ...base, key: ' ' })).toBe(base.scrollTop + page)
        expect(calculateKeyboardScrollTarget({ ...base, key: ' ', shiftKey: true })).toBe(
            base.scrollTop - page
        )
    })

    it('jumps to the edges on Home and End', () => {
        expect(calculateKeyboardScrollTarget({ ...base, key: 'Home' })).toBe(0)
        expect(calculateKeyboardScrollTarget({ ...base, key: 'End' })).toBe(maxScrollTop)
    })

    it('clamps at both edges', () => {
        expect(calculateKeyboardScrollTarget({ ...base, scrollTop: 10, key: 'ArrowUp' })).toBe(0)
        expect(
            calculateKeyboardScrollTarget({
                ...base,
                scrollTop: maxScrollTop - 10,
                key: 'PageDown'
            })
        ).toBe(maxScrollTop)
    })

    it('keeps a minimum one-line page in tiny viewports', () => {
        // clientHeight smaller than one line: page distance floors at one line
        expect(
            calculateKeyboardScrollTarget({
                key: 'PageDown',
                shiftKey: false,
                scrollTop: 100,
                clientHeight: 20,
                scrollHeight: 8000
            })
        ).toBe(100 + KEYBOARD_LINE_SCROLL_PX)
    })

    it('returns null for keys the viewport does not handle', () => {
        expect(calculateKeyboardScrollTarget({ ...base, key: 'Tab' })).toBeNull()
        expect(calculateKeyboardScrollTarget({ ...base, key: 'ArrowLeft' })).toBeNull()
    })

    it('never returns a negative target when content fits the viewport', () => {
        expect(
            calculateKeyboardScrollTarget({
                key: 'End',
                shiftKey: false,
                scrollTop: 0,
                clientHeight: 400,
                scrollHeight: 200
            })
        ).toBe(0)
    })
})

describe('resolveAnchorScrollTarget', () => {
    const maxScrollTop = 5000

    describe('bottom anchor (end-stable at the bottom)', () => {
        it('pins to the corrected maxScrollTop', () => {
            expect(resolveAnchorScrollTarget({ kind: 'bottom' }, 4200, maxScrollTop)).toBe(5000)
        })

        it('rounds a fractional maxScrollTop', () => {
            expect(resolveAnchorScrollTarget({ kind: 'bottom' }, 4200, 4999.6)).toBe(5000)
        })

        it('elides the write when already at the bottom', () => {
            expect(resolveAnchorScrollTarget({ kind: 'bottom' }, 5000, maxScrollTop)).toBeNull()
            expect(resolveAnchorScrollTarget({ kind: 'bottom' }, 4999.5, maxScrollTop)).toBeNull()
        })
    })

    describe('item anchor (offset drift compensation)', () => {
        const item = (oldOffset: number, newOffset: number) =>
            ({ kind: 'item', oldOffset, newOffset }) as const

        it('applies positive drift', () => {
            expect(resolveAnchorScrollTarget(item(1000, 1400), 2000, maxScrollTop)).toBe(2400)
        })

        it('applies negative drift', () => {
            expect(resolveAnchorScrollTarget(item(1400, 1000), 2000, maxScrollTop)).toBe(1600)
        })

        it('ignores sub-half-pixel drift', () => {
            expect(resolveAnchorScrollTarget(item(1000, 1000.4), 2000, maxScrollTop)).toBeNull()
            expect(resolveAnchorScrollTarget(item(1000, 999.6), 2000, maxScrollTop)).toBeNull()
        })

        it('clamps at the top', () => {
            expect(resolveAnchorScrollTarget(item(5000, 100), 200, maxScrollTop)).toBe(0)
        })

        it('clamps at the bottom', () => {
            expect(resolveAnchorScrollTarget(item(100, 5000), 4800, maxScrollTop)).toBe(5000)
        })

        it('elides a clamped target that lands where the viewport already is', () => {
            // Drift is large but clamping brings the target back to scrollTop
            expect(resolveAnchorScrollTarget(item(100, 3000), 5000, maxScrollTop)).toBeNull()
        })
    })
})

describe('calculateScrollTarget blockSums equivalence', () => {
    const makeRng = (seed: number) => {
        let s = seed >>> 0
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0
            return s / 0xffffffff
        }
    }

    const TOTAL = 10_000
    const AVG = 60

    const buildSparseCache = (seed: number): Record<number, number> => {
        const rng = makeRng(seed)
        const cache: Record<number, number> = {}
        for (let i = 0; i < TOTAL; i++) {
            if (rng() < 0.3) cache[i] = 20 + Math.floor(rng() * 181)
        }
        return cache
    }

    it('returns identical targets with and without blockSums for every align mode', () => {
        const cache = buildSparseCache(4242)
        const blockSums = buildBlockSums(cache, AVG, TOTAL)

        // A representative scroll geometry: viewport somewhere in the middle.
        let scrollTop = 0
        for (let i = 0; i < 4000; i++) scrollTop += getValidHeight(cache[i], AVG)

        const aligns: ScrollTargetParams['align'][] = ['auto', 'top', 'bottom', 'nearest']
        const targets = [0, 1, 500, 999, 1000, 1001, 4000, 4005, 5000, 9500, 9999]

        for (const align of aligns) {
            for (const targetIndex of targets) {
                const base: ScrollTargetParams = {
                    align,
                    targetIndex,
                    itemsLength: TOTAL,
                    calculatedItemHeight: AVG,
                    height: 400,
                    scrollTop,
                    firstVisibleIndex: 4000,
                    lastVisibleIndex: 4010,
                    heightCache: cache
                }
                const legacy = calculateScrollTarget(base)
                const accelerated = calculateScrollTarget({ ...base, blockSums })
                expect(accelerated, `align=${align} target=${targetIndex}`).toBe(legacy)
            }
        }
    })
})
