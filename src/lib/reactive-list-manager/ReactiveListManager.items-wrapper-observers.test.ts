import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReactiveListManager } from './index.js'

// Mocks that let us trigger observer callbacks
class ResizeObserverMock {
    private callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        ;(globalThis as any).__lastRO = this
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    emit(entries: ResizeObserverEntry[] = []): void {
        this.callback(entries, this)
    }
}

class MutationObserverMock {
    private callback: MutationCallback
    constructor(callback: MutationCallback) {
        this.callback = callback
        ;(globalThis as any).__lastMO = this
    }
    observe(): void {}
    disconnect(): void {}
    takeRecords(): MutationRecord[] {
        return []
    }
    emit(records: MutationRecord[]): void {
        this.callback(records, this)
    }
}

function mockComputedStyle(display: string, template: string) {
    const spy = vi.spyOn(window, 'getComputedStyle')
    spy.mockImplementation(
        () =>
            ({
                display,
                gridTemplateColumns: template
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any
    )
    return spy
}

describe('ReactiveListManager - items wrapper observers', () => {
    beforeEach(() => {
        global.ResizeObserver = ResizeObserverMock
        global.MutationObserver = MutationObserverMock
        ;(globalThis as any).__lastRO = undefined
        ;(globalThis as any).__lastMO = undefined
        vi.restoreAllMocks()
    })

    it('reacts to class attribute changes via MutationObserver', () => {
        const manager = new ReactiveListManager({ itemLength: 0, itemHeight: 40 })
        const el = document.createElement('div')

        // Start as non-grid
        const styleSpy = mockComputedStyle('block', 'none')

        manager.itemsWrapperElement = el
        expect(manager.gridDetected).toBe(false)
        expect(manager.gridColumns).toBe(1)

        // Change to grid via class change and update computed styles
        styleSpy.mockImplementation(
            () => ({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }) as any
        )
        const mo = (globalThis as any).__lastMO as MutationObserverMock
        el.className = 'grid md:grid-cols-4'
        mo.emit([
            {
                type: 'attributes',
                attributeName: 'class'
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
        ])

        expect(manager.gridDetected).toBe(true)
        expect(manager.gridColumns).toBe(4)
        styleSpy.mockRestore()
    })

    it('reacts to inline style changes via MutationObserver', () => {
        const manager = new ReactiveListManager({ itemLength: 0, itemHeight: 40 })
        const el = document.createElement('div')

        const styleSpy = mockComputedStyle('block', 'none')
        manager.itemsWrapperElement = el
        expect(manager.gridDetected).toBe(false)

        styleSpy.mockImplementation(
            () => ({ display: 'grid', gridTemplateColumns: '200px 1fr' }) as any
        )
        const mo = (globalThis as any).__lastMO as MutationObserverMock
        el.setAttribute('style', 'display:grid')
        mo.emit([
            {
                type: 'attributes',
                attributeName: 'style'
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
        ])

        expect(manager.gridDetected).toBe(true)
        expect(manager.gridColumns).toBe(2)
        styleSpy.mockRestore()
    })

    it('reacts to ResizeObserver emissions (e.g., responsive column changes)', () => {
        const manager = new ReactiveListManager({ itemLength: 0, itemHeight: 40 })
        const el = document.createElement('div')

        const styleSpy = mockComputedStyle('grid', 'repeat(1, 1fr)')
        manager.itemsWrapperElement = el
        expect(manager.gridDetected).toBe(true)
        expect(manager.gridColumns).toBe(1)

        // Simulate responsive change to 3 columns
        styleSpy.mockImplementation(
            () => ({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }) as any
        )
        const ro = (globalThis as any).__lastRO as ResizeObserverMock
        ro.emit([])

        expect(manager.gridDetected).toBe(true)
        expect(manager.gridColumns).toBe(3)
        styleSpy.mockRestore()
    })
})
