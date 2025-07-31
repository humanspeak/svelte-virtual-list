import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    createContainerResizeObserver,
    createItemResizeObserver,
    ResizeObserverManager,
    safeObserve
} from './resizeObserver.js'

// Mock ResizeObserver
class MockResizeObserver {
    private callback: ResizeObserverCallback
    private elements = new Set<Element>()

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback
    }

    observe(element: Element) {
        this.elements.add(element)
    }

    unobserve(element: Element) {
        this.elements.delete(element)
    }

    disconnect() {
        this.elements.clear()
    }

    // Test helper to trigger resize
    triggerResize(element: Element, contentRect: Partial<DOMRectReadOnly> = {}) {
        if (this.elements.has(element)) {
            const entry = {
                target: element,
                contentRect: {
                    width: 100,
                    height: 50,
                    top: 0,
                    left: 0,
                    bottom: 50,
                    right: 100,
                    x: 0,
                    y: 0,
                    toJSON: () => ({}),
                    ...contentRect
                }
            } as ResizeObserverEntry

            this.callback([entry], this)
        }
    }
}

// Mock global ResizeObserver
global.ResizeObserver = MockResizeObserver as any

describe('resizeObserver utilities', () => {
    let mockElement: HTMLElement
    let itemElements: HTMLElement[]
    let dirtyItems: Set<number>

    beforeEach(() => {
        mockElement = document.createElement('div')
        itemElements = [mockElement]
        dirtyItems = new Set()
    })

    describe('createItemResizeObserver', () => {
        it('should create a ResizeObserver', () => {
            const observer = createItemResizeObserver(
                itemElements,
                () => ({ start: 0, end: 10 }),
                dirtyItems
            )

            expect(observer).toBeInstanceOf(MockResizeObserver)
        })

        it('should mark items as dirty when resized', () => {
            const onItemsDirty = vi.fn()
            const observer = createItemResizeObserver(
                itemElements,
                () => ({ start: 5, end: 15 }),
                dirtyItems,
                { onItemsDirty }
            ) as MockResizeObserver

            observer.observe(mockElement)
            observer.triggerResize(mockElement)

            expect(dirtyItems.has(5)).toBe(true) // start (5) + elementIndex (0) = 5
            expect(onItemsDirty).toHaveBeenCalledWith(new Set([5]))
        })

        it('should handle debug logging', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

            const observer = createItemResizeObserver(
                itemElements,
                () => ({ start: 0, end: 10 }),
                dirtyItems,
                { debug: true }
            ) as MockResizeObserver

            observer.observe(mockElement)
            observer.triggerResize(mockElement)

            expect(consoleSpy).toHaveBeenCalledWith('ResizeObserver fired for 1 entries')
            expect(consoleSpy).toHaveBeenCalledWith('Item 0 marked dirty (resized), queue size: 1')

            consoleSpy.mockRestore()
        })

        it('should ignore elements not in itemElements array', () => {
            const otherElement = document.createElement('div')
            const onItemsDirty = vi.fn()

            const observer = createItemResizeObserver(
                itemElements,
                () => ({ start: 0, end: 10 }),
                dirtyItems,
                { onItemsDirty }
            ) as MockResizeObserver

            observer.observe(otherElement)
            observer.triggerResize(otherElement)

            expect(dirtyItems.size).toBe(0)
            expect(onItemsDirty).not.toHaveBeenCalled()
        })

        it('should work without config options', () => {
            const observer = createItemResizeObserver(
                itemElements,
                () => ({ start: 0, end: 10 }),
                dirtyItems
            ) as MockResizeObserver

            observer.observe(mockElement)
            observer.triggerResize(mockElement)

            expect(dirtyItems.has(0)).toBe(true)
        })
    })

    describe('createContainerResizeObserver', () => {
        it('should create a ResizeObserver', () => {
            const observer = createContainerResizeObserver()
            expect(observer).toBeInstanceOf(MockResizeObserver)
        })

        it('should call onResize when container is resized', () => {
            const onResize = vi.fn()
            const observer = createContainerResizeObserver({
                onResize
            }) as MockResizeObserver

            observer.observe(mockElement)
            observer.triggerResize(mockElement, { width: 200, height: 100 })

            expect(onResize).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: mockElement,
                    contentRect: expect.objectContaining({
                        width: 200,
                        height: 100
                    })
                })
            )
        })

        it('should handle debug logging', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

            const observer = createContainerResizeObserver({
                debug: true
            }) as MockResizeObserver

            observer.observe(mockElement)
            observer.triggerResize(mockElement)

            expect(consoleSpy).toHaveBeenCalledWith(
                'Container resized:',
                expect.objectContaining({ width: 100, height: 50 })
            )

            consoleSpy.mockRestore()
        })
    })

    describe('safeObserve', () => {
        it('should observe element when both observer and element are available', () => {
            const observer = new MockResizeObserver(() => {})
            const observeSpy = vi.spyOn(observer, 'observe')

            const cleanup = safeObserve(observer, mockElement)

            expect(observeSpy).toHaveBeenCalledWith(mockElement)
            expect(typeof cleanup).toBe('function')
        })

        it('should return no-op cleanup when observer is null', () => {
            const cleanup = safeObserve(null, mockElement)
            expect(typeof cleanup).toBe('function')

            // Should not throw
            cleanup()
        })

        it('should return no-op cleanup when element is null', () => {
            const observer = new MockResizeObserver(() => {})
            const cleanup = safeObserve(observer, null)
            expect(typeof cleanup).toBe('function')

            // Should not throw
            cleanup()
        })

        it('should unobserve element when cleanup is called', () => {
            const observer = new MockResizeObserver(() => {})
            const unobserveSpy = vi.spyOn(observer, 'unobserve')

            const cleanup = safeObserve(observer, mockElement)
            cleanup()

            expect(unobserveSpy).toHaveBeenCalledWith(mockElement)
        })

        it('should handle debug logging', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
            const observer = new MockResizeObserver(() => {})

            const cleanup = safeObserve(observer, mockElement, true)
            expect(consoleSpy).toHaveBeenCalledWith('Started observing element:', mockElement)

            cleanup()
            expect(consoleSpy).toHaveBeenCalledWith('Stopped observing element:', mockElement)

            consoleSpy.mockRestore()
        })

        it('should log debug message when observer is not available', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

            safeObserve(null, mockElement, true)

            expect(consoleSpy).toHaveBeenCalledWith(
                'ResizeObserver not available for element:',
                mockElement
            )

            consoleSpy.mockRestore()
        })
    })

    describe('ResizeObserverManager', () => {
        let manager: ResizeObserverManager

        beforeEach(() => {
            manager = new ResizeObserverManager()
        })

        it('should add and track observers', () => {
            const observer = new MockResizeObserver(() => {})
            manager.addObserver(observer)

            const disconnectSpy = vi.spyOn(observer, 'disconnect')
            manager.cleanup()

            expect(disconnectSpy).toHaveBeenCalled()
        })

        it('should add and run cleanup functions', () => {
            const cleanup = vi.fn()
            manager.addCleanup(cleanup)

            manager.cleanup()

            expect(cleanup).toHaveBeenCalled()
        })

        it('should observe elements with automatic cleanup tracking', () => {
            const observer = new MockResizeObserver(() => {})
            const observeSpy = vi.spyOn(observer, 'observe')
            const unobserveSpy = vi.spyOn(observer, 'unobserve')

            manager.observe(observer, mockElement)
            expect(observeSpy).toHaveBeenCalledWith(mockElement)

            manager.cleanup()
            expect(unobserveSpy).toHaveBeenCalledWith(mockElement)
        })

        it('should handle multiple observers and cleanups', () => {
            const observer1 = new MockResizeObserver(() => {})
            const observer2 = new MockResizeObserver(() => {})
            const cleanup1 = vi.fn()
            const cleanup2 = vi.fn()

            manager.addObserver(observer1)
            manager.addObserver(observer2)
            manager.addCleanup(cleanup1)
            manager.addCleanup(cleanup2)

            const disconnect1Spy = vi.spyOn(observer1, 'disconnect')
            const disconnect2Spy = vi.spyOn(observer2, 'disconnect')

            manager.cleanup()

            expect(disconnect1Spy).toHaveBeenCalled()
            expect(disconnect2Spy).toHaveBeenCalled()
            expect(cleanup1).toHaveBeenCalled()
            expect(cleanup2).toHaveBeenCalled()
        })

        it('should clear arrays after cleanup', () => {
            const observer = new MockResizeObserver(() => {})
            const cleanup = vi.fn()

            manager.addObserver(observer)
            manager.addCleanup(cleanup)

            manager.cleanup()

            // Calling cleanup again should not call the functions again
            manager.cleanup()

            expect(cleanup).toHaveBeenCalledTimes(1)
        })
    })
})
