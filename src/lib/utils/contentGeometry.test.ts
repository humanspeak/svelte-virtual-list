import { describe, expect, it } from 'vitest'
import { accumulateResizeOffset, contentGeometry, projectRowViewport } from './contentGeometry.js'

describe('physical content geometry on either axis', () => {
    it('includes non-item extents exactly once', () => {
        expect(contentGeometry(60, 200, 80, 160)).toEqual({
            total: 340,
            laidOut: 340,
            maxOffset: 180,
            footerOffset: 260
        })
    })
    it('keeps short and empty content start aligned', () => {
        expect(contentGeometry(0, 0, 0, 160)).toEqual({
            total: 0,
            laidOut: 160,
            maxOffset: 0,
            footerOffset: 0
        })
        expect(contentGeometry(20, 40, 30, 160).footerOffset).toBe(60)
    })
    it.each([
        [0, 40, 60, 200, 0, 0],
        [40, 80, 60, 200, 0, 60],
        [220, 160, 60, 200, 160, 40],
        [280, 40, 60, 200, 200, 0],
        [0, 160, 0, 0, 0, 0]
    ])('projects offset %s and viewport %s onto rows', (s, v, h, r, start, size) => {
        expect(projectRowViewport(s, v, h, r)).toEqual({ start, size })
    })
})

describe('fractional resize correction', () => {
    it('carries rounding error across repeated small header changes', () => {
        let target = 100
        let remainder = 0
        for (let count = 0; count < 20; count++) {
            const next = accumulateResizeOffset(target, 0.4, remainder, 500)
            target = next.target
            remainder = next.remainder
        }
        expect(target).toBe(108)
        expect(Math.abs(remainder)).toBeLessThan(0.00001)
    })
    it('clears excess drift when the physical target is clamped', () => {
        expect(accumulateResizeOffset(100, 50, 0.4, 120)).toEqual({ target: 120, remainder: 0 })
    })
})
