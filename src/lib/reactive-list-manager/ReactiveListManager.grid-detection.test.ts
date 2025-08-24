import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReactiveListManager } from './index.js'

// Simple ResizeObserver mock for jsdom
class ResizeObserverMock {
    private callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    // helper to trigger
    emit(entries: ResizeObserverEntry[] = []): void {
        this.callback(entries, this)
    }
}

// Helpers
function mockComputedStyle(display: string, template: string) {
    const spy = vi.spyOn(window, 'getComputedStyle')
    spy.mockImplementation(
        (elt: Element) =>
            ({
                // Minimal properties needed by detection logic
                display,
                gridTemplateColumns: template
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any
    )
    return spy
}

describe('ReactiveListManager - CSS grid detection', () => {
    beforeEach(() => {
        global.ResizeObserver = ResizeObserverMock
    })

    it('detects columns from repeat() syntax', () => {
        const manager = new ReactiveListManager({ itemLength: 0, itemHeight: 40 })
        const el = document.createElement('div')
        const spy = mockComputedStyle('grid', 'repeat(3, minmax(0, 1fr))')

        manager.itemsWrapperElement = el

        expect(manager.gridDetected).toBe(true)
        expect(manager.gridColumns).toBe(3)

        spy.mockRestore()
    })

    it('counts tracks from explicit template tokens', () => {
        const manager = new ReactiveListManager({ itemLength: 0, itemHeight: 40 })
        const el = document.createElement('div')
        const spy = mockComputedStyle('grid', '200px 1fr 2fr 100px')

        manager.itemsWrapperElement = el

        expect(manager.gridDetected).toBe(true)
        expect(manager.gridColumns).toBe(4)

        spy.mockRestore()
    })

    it('falls back to geometry-based detection when style is insufficient', () => {
        const manager = new ReactiveListManager({ itemLength: 0, itemHeight: 40 })
        const el = document.createElement('div')
        const spy = mockComputedStyle('block', 'none')

        // Create 3 items on first row, then a break
        for (let i = 0; i < 5; i += 1) {
            const child = document.createElement('div') as HTMLElement & {
                getBoundingClientRect: () => DOMRect
            }

            child.getBoundingClientRect = () =>
                ({
                    // Only top is read by detection
                    top: i < 3 ? 0 : 100,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 0,
                    width: 0,
                    x: 0,
                    y: 0,
                    toJSON: () => ({})
                }) as DOMRect
            el.appendChild(child)
        }

        manager.itemsWrapperElement = el

        expect(manager.gridDetected).toBe(true)
        expect(manager.gridColumns).toBe(3)

        spy.mockRestore()
    })

    it('recomputeGridDetection updates values after style change', () => {
        const manager = new ReactiveListManager({ itemLength: 0, itemHeight: 40 })
        const el = document.createElement('div')

        const spy = vi.spyOn(window, 'getComputedStyle')
        // First call: not a grid
        let call = 0
        spy.mockImplementation(() => {
            call += 1
            if (call < 2) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return { display: 'block', gridTemplateColumns: 'none' } as any
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' } as any
        })

        manager.itemsWrapperElement = el
        expect(manager.gridDetected).toBe(false)
        expect(manager.gridColumns).toBe(1)

        manager.recomputeGridDetection()
        expect(manager.gridDetected).toBe(true)
        expect(manager.gridColumns).toBe(2)

        spy.mockRestore()
    })
})
