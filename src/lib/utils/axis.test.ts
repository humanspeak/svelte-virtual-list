import { describe, expect, it, vi } from 'vitest'
import { getAxisAdapter } from './axis.js'

const createElement = () =>
    ({
        scrollTop: 12,
        scrollLeft: 34,
        clientHeight: 400,
        clientWidth: 600,
        scrollHeight: 4000,
        scrollWidth: 6000,
        scrollTo: vi.fn()
    }) as unknown as HTMLElement

describe('axis adapter', () => {
    it('maps vertical scroll geometry, edges, styles, transforms, and keys', () => {
        const axis = getAxisAdapter('vertical')
        const element = createElement()
        const rect = { top: 10, bottom: 70, left: 20, right: 100, height: 60, width: 80 }

        expect(axis.getScrollOffset(element)).toBe(12)
        expect(axis.getViewportSize(element)).toBe(400)
        expect(axis.getScrollSize(element)).toBe(4000)
        expect(axis.getStart(rect)).toBe(10)
        expect(axis.getEnd(rect)).toBe(70)
        expect(axis.getSize(rect)).toBe(60)
        expect(axis.contentSizeStyle(900)).toBe('height: 900px')
        expect(axis.transform(45)).toBe('translateY(45px)')
        expect(axis.isScrollKey('ArrowDown')).toBe(true)
        expect(axis.isScrollKey('ArrowRight')).toBe(false)

        axis.setScrollOffset(element, 55)
        expect(element.scrollTop).toBe(55)
        axis.scrollTo(element, 80, 'smooth')
        expect(element.scrollTo).toHaveBeenCalledWith({ top: 80, behavior: 'smooth' })
    })

    it('maps horizontal geometry without enabling horizontal rendering', () => {
        const axis = getAxisAdapter('horizontal')
        const element = createElement()
        const rect = { top: 10, bottom: 70, left: 20, right: 100, height: 60, width: 80 }

        expect(axis.getScrollOffset(element)).toBe(34)
        expect(axis.getViewportSize(element)).toBe(600)
        expect(axis.getScrollSize(element)).toBe(6000)
        expect(axis.getStart(rect)).toBe(20)
        expect(axis.getEnd(rect)).toBe(100)
        expect(axis.getSize(rect)).toBe(80)
        expect(axis.contentSizeStyle(900)).toBe('width: 900px')
        expect(axis.transform(45)).toBe('translateX(45px)')
        expect(axis.isScrollKey('ArrowRight')).toBe(true)
        expect(axis.isScrollKey('ArrowDown')).toBe(false)

        axis.setScrollOffset(element, 55)
        expect(element.scrollLeft).toBe(55)
        axis.scrollTo(element, 80, 'auto')
        expect(element.scrollTo).toHaveBeenCalledWith({ left: 80, behavior: 'auto' })
    })
})
