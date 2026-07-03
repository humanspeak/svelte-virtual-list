import { describe, expect, it } from 'vitest'
import { uncoveredPx } from './coverage.js'

describe('uncoveredPx', () => {
    const viewport = { top: 0, bottom: 100 }

    it('reports the full height when nothing is rendered', () => {
        expect(uncoveredPx(viewport, [])).toBe(100)
    })

    it('reports 0 for exact tiling', () => {
        expect(
            uncoveredPx(viewport, [
                { top: 0, bottom: 40 },
                { top: 40, bottom: 100 }
            ])
        ).toBe(0)
    })

    it('reports 0 when rects overhang both viewport edges', () => {
        expect(
            uncoveredPx(viewport, [
                { top: -30, bottom: 55 },
                { top: 55, bottom: 140 }
            ])
        ).toBe(0)
    })

    it('measures a gap between rects', () => {
        expect(
            uncoveredPx(viewport, [
                { top: 0, bottom: 30 },
                { top: 50, bottom: 100 }
            ])
        ).toBe(20)
    })

    it('measures uncovered space at the bottom (the #416 shape)', () => {
        expect(uncoveredPx(viewport, [{ top: 0, bottom: 44 }])).toBe(56)
    })

    it('handles unsorted input', () => {
        expect(
            uncoveredPx(viewport, [
                { top: 60, bottom: 100 },
                { top: 0, bottom: 60 }
            ])
        ).toBe(0)
    })

    it('does not double-count overlapping rects', () => {
        expect(
            uncoveredPx(viewport, [
                { top: 0, bottom: 70 },
                { top: 30, bottom: 80 }
            ])
        ).toBe(20)
    })

    it('ignores rects entirely outside the viewport', () => {
        expect(
            uncoveredPx(viewport, [
                { top: -50, bottom: -10 },
                { top: 120, bottom: 200 },
                { top: 0, bottom: 100 }
            ])
        ).toBe(0)
    })

    it('rounds sub-pixel remainders', () => {
        expect(uncoveredPx(viewport, [{ top: 0, bottom: 99.6 }])).toBe(0)
    })
})
