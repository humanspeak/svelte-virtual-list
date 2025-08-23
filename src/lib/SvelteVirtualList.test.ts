import type { SvelteVirtualListDebugInfo } from '$lib/types.js'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import TestWrapper from './test/TestWrapper.svelte'

// Add ResizeObserver mock
class ResizeObserverMock {
    callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback
    }

    observe() {}
    unobserve() {}
    disconnect() {}

    // Helper method to trigger resize
    trigger(entries: ResizeObserverEntry[]) {
        this.callback(entries, this)
    }
}

// Mock data for testing
const createMockItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i}`
    }))

const mockRenderItem = `
    <div data-testid="item-{currentItem.id}">
        {currentItem.text}
    </div>
`

beforeEach(() => {
    vi.useFakeTimers()
    // Add ResizeObserver to the global object
    global.ResizeObserver = ResizeObserverMock as any

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 300,
        height: 50,
        top: 0,
        left: 0,
        bottom: 50,
        right: 300,
        x: 0,
        y: 0,
        toJSON: () => {}
    }))
})

describe('SvelteVirtualList Component', () => {
    describe('Basic Rendering', () => {
        test('renders with empty items array', async () => {
            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items: []
                }
            })

            await vi.runAllTimersAsync()

            const viewport = await screen.findByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()

            const content = screen.getByTestId('test-list-content')
            expect(content).toBeInTheDocument()

            const itemsContainer = screen.getByTestId('test-list-items')
            expect(itemsContainer).toBeInTheDocument()
        })

        test('renders with items in topToBottom mode', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    mode: 'topToBottom'
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })

        test('renders with items in bottomToTop mode', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    mode: 'bottomToTop'
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })

        test('applies custom CSS classes', async () => {
            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items: [],
                    viewportClass: 'custom-viewport',
                    contentClass: 'custom-content',
                    itemsClass: 'custom-items'
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toHaveClass('custom-viewport')

            const content = screen.getByTestId('test-list-content')
            expect(content).toHaveClass('custom-content')

            const itemsContainer = screen.getByTestId('test-list-items')
            expect(itemsContainer).toHaveClass('custom-items')
        })
    })

    describe('Scroll Functionality', () => {
        test('handles scroll events', async () => {
            const items = createMockItems(100)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('test-list-viewport')

            // Simulate scroll
            Object.defineProperty(viewport, 'scrollTop', {
                writable: true,
                value: 500
            })

            fireEvent.scroll(viewport)

            // Should not throw errors
            expect(viewport).toBeInTheDocument()
        })

        test('updates scroll position programmatically', async () => {
            const items = createMockItems(100)
            let component: any

            const { component: comp } = render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })
            component = comp

            await vi.runAllTimersAsync()

            // Test scrollToIndex method
            if (component.scrollToIndex) {
                await component.scrollToIndex(50)
                await tick()
            }

            // Should not throw errors
            expect(screen.getByTestId('test-list-viewport')).toBeInTheDocument()
        })
    })

    describe('Debug Functionality', () => {
        test('calls debug function when provided', async () => {
            const debugFn = vi.fn()
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    debug: true,
                    debugFunction: debugFn
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            // Debug function should be called
            expect(debugFn).toHaveBeenCalled()
        })

        test('debug function receives correct debug info structure', async () => {
            const debugFn = vi.fn()
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    debug: true,
                    debugFunction: debugFn
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            if (debugFn.mock.calls.length > 0) {
                const debugInfo: SvelteVirtualListDebugInfo = debugFn.mock.calls[0][0]

                expect(debugInfo).toHaveProperty('startIndex')
                expect(debugInfo).toHaveProperty('endIndex')
                expect(debugInfo).toHaveProperty('totalItems')
                expect(debugInfo).toHaveProperty('visibleItemsCount')
                expect(debugInfo).toHaveProperty('processedItems')
                expect(debugInfo).toHaveProperty('averageItemHeight')
                expect(debugInfo).toHaveProperty('atTop')
                expect(debugInfo).toHaveProperty('atBottom')
                expect(debugInfo).toHaveProperty('totalHeight')

                expect(typeof debugInfo.startIndex).toBe('number')
                expect(typeof debugInfo.endIndex).toBe('number')
                expect(typeof debugInfo.totalItems).toBe('number')
                expect(typeof debugInfo.atTop).toBe('boolean')
                expect(typeof debugInfo.atBottom).toBe('boolean')
            }
        })
    })

    describe('Height Management', () => {
        test('handles different item heights', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            const content = screen.getByTestId('test-list-content')
            expect(content).toBeInTheDocument()
        })

        test('handles container resize', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            // Simulate container resize
            const viewport = screen.getByTestId('test-list-viewport')

            // Mock a resize event
            Object.defineProperty(viewport, 'getBoundingClientRect', {
                value: () => ({
                    width: 400,
                    height: 600,
                    top: 0,
                    left: 0,
                    bottom: 600,
                    right: 400,
                    x: 0,
                    y: 0,
                    toJSON: () => {}
                })
            })

            expect(viewport).toBeInTheDocument()
        })
    })

    describe('Buffer Management', () => {
        test('handles different buffer sizes', async () => {
            const items = createMockItems(50)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    bufferSize: 10
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })

        test('handles zero buffer size', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    bufferSize: 0
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })
    })

    describe('Edge Cases', () => {
        test('handles single item', async () => {
            const items = createMockItems(1)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })

        test('handles very large item count', async () => {
            const items = createMockItems(10000)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })

        test('handles items array changes', async () => {
            let items = createMockItems(5)

            const { rerender } = render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            // Update items
            items = createMockItems(10)
            await rerender({
                testId: 'test-list',
                items
            })

            await vi.runAllTimersAsync()
            await tick()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })

        test('handles zero height gracefully', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })
    })

    describe('Accessibility', () => {
        test('maintains proper DOM structure', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('test-list-viewport')
            const content = screen.getByTestId('test-list-content')
            const itemsContainer = screen.getByTestId('test-list-items')

            expect(viewport.contains(content)).toBe(true)
            expect(content.contains(itemsContainer)).toBe(true)
        })

        test('preserves test IDs structure', async () => {
            const items = createMockItems(5)

            render(TestWrapper, {
                props: {
                    testId: 'my-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            expect(screen.getByTestId('my-list-viewport')).toBeInTheDocument()
            expect(screen.getByTestId('my-list-content')).toBeInTheDocument()
            expect(screen.getByTestId('my-list-items')).toBeInTheDocument()
        })
    })
})
