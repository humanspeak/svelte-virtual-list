import type { SvelteVirtualListDebugInfo } from '$lib/types.js'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import TestWrapper from './test/TestWrapper.svelte'

// Add ResizeObserver mock
class ResizeObserverMock {
    static instances: ResizeObserverMock[] = []
    callback: ResizeObserverCallback
    observed = new Set<Element>()
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        ResizeObserverMock.instances.push(this)
    }

    observe(element: Element) {
        this.observed.add(element)
    }
    unobserve(element: Element) {
        this.observed.delete(element)
    }
    disconnect() {
        this.observed.clear()
    }

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
    ResizeObserverMock.instances = []
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

        test('renders with items', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
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

        test('keeps vertical content sizing and Y-axis translation in the DOM contract', async () => {
            render(TestWrapper, {
                props: {
                    testId: 'vertical-contract-list',
                    items: createMockItems(10),
                    defaultEstimatedItemHeight: 40
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            expect(screen.getByTestId('vertical-contract-list-content')).toHaveStyle({
                height: '400px'
            })
            expect(screen.getByTestId('vertical-contract-list-items')).toHaveStyle({
                transform: 'translateY(0px)'
            })
        })

        test('uses stable horizontal attributes, neutral sizing, and X-axis translation', async () => {
            render(TestWrapper, {
                props: {
                    testId: 'horizontal-contract-list',
                    items: createMockItems(10),
                    orientation: 'horizontal',
                    defaultEstimatedItemSize: 80,
                    defaultEstimatedItemHeight: 40,
                    viewportClass: 'replaced-viewport',
                    contentClass: 'replaced-content',
                    itemsClass: 'replaced-items'
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            expect(screen.getByTestId('horizontal-contract-list-viewport')).toHaveAttribute(
                'data-orientation',
                'horizontal'
            )
            expect(screen.getByTestId('horizontal-contract-list-content')).toHaveStyle({
                width: '800px'
            })
            expect(screen.getByTestId('horizontal-contract-list-items')).toHaveStyle({
                transform: 'translateX(0px)'
            })
        })

        test('applies runtime estimated item height changes to unmeasured content geometry', async () => {
            const items = createMockItems(10)
            const { rerender } = render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    defaultEstimatedItemHeight: 40
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            const content = screen.getByTestId('test-list-content')
            expect(content).toHaveStyle({ height: '400px' })

            await rerender({
                testId: 'test-list',
                items,
                defaultEstimatedItemHeight: 80
            })
            await vi.runAllTimersAsync()
            await tick()

            expect(content).toHaveStyle({ height: '800px' })

            // Invalid runtime estimates are ignored deterministically, preserving
            // the last valid geometry rather than poisoning scroll calculations.
            await rerender({
                testId: 'test-list',
                items,
                defaultEstimatedItemHeight: Number.NaN
            })
            await vi.runAllTimersAsync()
            await tick()

            expect(content).toHaveStyle({ height: '800px' })
        })

        test('retains the latest runtime estimate when orientation changes', async () => {
            const items = createMockItems(10)
            const { rerender } = render(TestWrapper, {
                props: {
                    testId: 'runtime-axis-estimate-list',
                    items,
                    orientation: 'vertical',
                    defaultEstimatedItemSize: 40
                }
            })
            await vi.runAllTimersAsync()
            await tick()

            await rerender({
                testId: 'runtime-axis-estimate-list',
                items,
                orientation: 'vertical',
                defaultEstimatedItemSize: 80
            })
            await vi.runAllTimersAsync()
            await tick()
            expect(screen.getByTestId('runtime-axis-estimate-list-content')).toHaveStyle({
                height: '800px'
            })

            await rerender({
                testId: 'runtime-axis-estimate-list',
                items,
                orientation: 'horizontal',
                defaultEstimatedItemSize: 80
            })
            await tick()

            expect(screen.getByTestId('runtime-axis-estimate-list-content')).toHaveStyle({
                width: '800px'
            })
        })

        test('switches orientation when keyed items shrink in the same update', async () => {
            const items = createMockItems(10)
            const itemKey = (item: (typeof items)[number]) => item.id
            const { rerender } = render(TestWrapper, {
                props: {
                    testId: 'shrinking-axis-list',
                    items,
                    itemKey,
                    orientation: 'vertical' as const,
                    defaultEstimatedItemSize: 40
                }
            })
            await vi.runAllTimersAsync()
            await tick()

            const viewport = screen.getByTestId('shrinking-axis-list-viewport')
            viewport.scrollTop = 320
            await fireEvent.scroll(viewport)
            await vi.runAllTimersAsync()
            await tick()

            await rerender({
                testId: 'shrinking-axis-list',
                items: items.slice(0, 2),
                itemKey,
                orientation: 'horizontal' as const,
                defaultEstimatedItemSize: 40
            })
            await vi.runAllTimersAsync()
            await tick()

            expect(screen.getByTestId('shrinking-axis-list-viewport')).toHaveAttribute(
                'data-orientation',
                'horizontal'
            )
        })

        test('preserves a mid-list scroll position when the runtime estimate changes', async () => {
            vi.mocked(Element.prototype.getBoundingClientRect).mockImplementation(function (
                this: Element
            ) {
                const element = this as HTMLElement
                const index = Number(element.dataset.originalIndex)
                const isItem = Number.isInteger(index)
                const top = isItem ? (index < 4 ? -40 : (index - 4) * 40) : 0
                const height = isItem ? 40 : 50
                return {
                    width: 300,
                    height,
                    top,
                    left: 0,
                    bottom: top + height,
                    right: 300,
                    x: 0,
                    y: top,
                    toJSON: () => {}
                }
            })

            const items = createMockItems(20)
            const { rerender } = render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    defaultEstimatedItemHeight: 40
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            const viewport = screen.getByTestId('test-list-viewport')
            Object.defineProperty(viewport, 'scrollTop', { writable: true, value: 160 })
            await fireEvent.scroll(viewport)
            await vi.runAllTimersAsync()

            await rerender({
                testId: 'test-list',
                items,
                defaultEstimatedItemHeight: 80
            })
            await vi.runAllTimersAsync()
            await tick()

            // Index 4 is the first item crossing the viewport top. Its
            // estimated offset changes from 160px to 320px, so preserving
            // its painted position requires applying the full 160px drift.
            expect(viewport.scrollTop).toBe(320)
        })

        test('keeps a bottom-pinned viewport at the new bottom after an estimate change', async () => {
            const items = createMockItems(10)
            const { rerender } = render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    defaultEstimatedItemHeight: 40
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            const viewport = screen.getByTestId('test-list-viewport')
            Object.defineProperty(viewport, 'scrollTop', { writable: true, value: 350 })
            await fireEvent.scroll(viewport)
            await vi.runAllTimersAsync()

            await rerender({
                testId: 'test-list',
                items,
                defaultEstimatedItemHeight: 80
            })
            await vi.runAllTimersAsync()
            await tick()

            expect(viewport.scrollTop).toBe(750)
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

    describe('onRangeChange Callback', () => {
        test('fires at least once after mount with the initial range', async () => {
            const onRangeChange = vi.fn()
            const items = createMockItems(100)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    onRangeChange
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            expect(onRangeChange).toHaveBeenCalled()

            const lastCall = onRangeChange.mock.calls[onRangeChange.mock.calls.length - 1][0]
            expect(lastCall.start).toBe(0)
            expect(lastCall.end).toBeGreaterThan(0)
            expect(lastCall.atTop).toBe(true)
        })

        test('does not re-deliver identical payloads on unrelated re-renders', async () => {
            const onRangeChange = vi.fn()
            const items = createMockItems(100)

            const { rerender } = render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    onRangeChange
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            const countAfterSettle = onRangeChange.mock.calls.length
            expect(countAfterSettle).toBeGreaterThan(0)

            // Force an unrelated re-render with the same props/state.
            await rerender({
                testId: 'test-list',
                items,
                onRangeChange
            })
            await vi.runAllTimersAsync()
            await tick()

            expect(onRangeChange.mock.calls.length).toBe(countAfterSettle)
        })

        test('every payload has exactly {start, end, atTop, atBottom} with correct types', async () => {
            const onRangeChange = vi.fn()
            const items = createMockItems(100)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    onRangeChange
                }
            })

            await vi.runAllTimersAsync()
            await tick()

            expect(onRangeChange).toHaveBeenCalled()
            for (const [payload] of onRangeChange.mock.calls) {
                expect(Object.keys(payload).sort()).toEqual(
                    ['atBottom', 'atTop', 'end', 'start'].sort()
                )
                expect(typeof payload.start).toBe('number')
                expect(typeof payload.end).toBe('number')
                expect(typeof payload.atTop).toBe('boolean')
                expect(typeof payload.atBottom).toBe('boolean')
            }
        })

        test('mounting without onRangeChange does not throw or warn', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            const items = createMockItems(100)

            expect(() => {
                render(TestWrapper, {
                    props: {
                        testId: 'test-list',
                        items
                    }
                })
            }).not.toThrow()

            await vi.runAllTimersAsync()
            await tick()

            expect(warnSpy).not.toHaveBeenCalled()
            expect(errorSpy).not.toHaveBeenCalled()

            warnSpy.mockRestore()
            errorSpy.mockRestore()
        })
    })

    describe('Height Management', () => {
        test('invalidates stale measurements on an unkeyed same-length replacement', async () => {
            const initialItems = createMockItems(4)
            const debugFn = vi.fn()
            const { rerender } = render(TestWrapper, {
                props: {
                    testId: 'mutation-list',
                    items: initialItems,
                    debug: true,
                    debugFunction: debugFn,
                    bufferSize: 0
                }
            })
            await vi.runAllTimersAsync()
            await tick()

            const measuredItem = screen.getByTestId('mutation-list-item-0')
            Object.defineProperty(measuredItem, 'offsetHeight', { configurable: true, value: 100 })
            const itemObserver = ResizeObserverMock.instances.find((observer) =>
                observer.observed.has(measuredItem)
            )
            expect(itemObserver).toBeDefined()
            itemObserver?.trigger([{ target: measuredItem } as unknown as ResizeObserverEntry])
            await tick()
            expect(screen.getByTestId('mutation-list-content')).toHaveStyle({ height: '200px' })

            const appendedItems = [...initialItems, { id: 'appended', text: 'Appended item' }]
            await rerender({
                testId: 'mutation-list',
                items: appendedItems,
                debug: true,
                debugFunction: debugFn,
                bufferSize: 0
            })
            await tick()
            expect(screen.getByTestId('mutation-list-content')).toHaveStyle({ height: '250px' })

            await rerender({
                testId: 'mutation-list',
                items: appendedItems.slice(0, 3),
                debug: true,
                debugFunction: debugFn,
                bufferSize: 0
            })
            await tick()
            expect(screen.getByTestId('mutation-list-content')).toHaveStyle({ height: '150px' })

            await rerender({
                testId: 'mutation-list',
                items: initialItems
                    .slice(0, 3)
                    .map((item) => ({ ...item, id: `replacement-${item.id}` })),
                debug: true,
                debugFunction: debugFn,
                bufferSize: 0
            })
            await tick()

            expect(screen.getByTestId('mutation-list-content')).toHaveStyle({ height: '120px' })

            await rerender({
                testId: 'mutation-list',
                items: [],
                debug: true,
                debugFunction: debugFn,
                bufferSize: 0
            })
            await tick()
            await rerender({
                testId: 'mutation-list',
                items: initialItems,
                debug: true,
                debugFunction: debugFn,
                bufferSize: 0
            })
            await tick()

            expect(screen.getByTestId('mutation-list-content')).toHaveStyle({ height: '160px' })
        })

        test('uses itemKey to preserve DOM identity through reorder and prepend', async () => {
            const items = createMockItems(4)
            const itemKey = (item: (typeof items)[number]) => item.id
            const { rerender } = render(TestWrapper, {
                props: { testId: 'keyed-list', items, itemKey, bufferSize: 0 }
            })
            await vi.runAllTimersAsync()
            await tick()

            const originalNode = screen.getByTestId('item-item-1').parentElement
            expect(originalNode).toHaveAttribute('data-original-index', '1')

            const reordered = [
                { id: 'prepended', text: 'Prepended' },
                items[3],
                items[1],
                items[0],
                items[2]
            ]
            await rerender({ testId: 'keyed-list', items: reordered, itemKey, bufferSize: 0 })
            await tick()

            const movedNode = screen.getByTestId('item-item-1').parentElement
            expect(movedNode).toBe(originalNode)
            expect(movedNode).toHaveAttribute('data-original-index', '2')
        })

        test('rejects duplicate itemKey values with a useful error', () => {
            const items = [
                { id: 'duplicate', text: 'First' },
                { id: 'duplicate', text: 'Second' }
            ]

            expect(() =>
                render(TestWrapper, {
                    props: {
                        testId: 'duplicate-list',
                        items,
                        itemKey: (item: (typeof items)[number]) => item.id
                    }
                })
            ).toThrow(/duplicate itemKey.*duplicate/i)
        })

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

    describe('Infinite Scroll', () => {
        // Note: Full infinite scroll behavior is tested in E2E tests (tests/topToBottom/infiniteScroll.spec.ts)
        // because the reactive effects and scroll simulation don't work reliably with jsdom + fake timers.
        // These unit tests verify the props are accepted without errors.

        test('accepts infinite scroll props without errors', async () => {
            const onLoadMore = vi.fn()
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    onLoadMore,
                    loadMoreThreshold: 20,
                    hasMore: true
                }
            })

            // Just verify component renders without crashing
            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })

        test('accepts hasMore false without errors', async () => {
            const onLoadMore = vi.fn()
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items,
                    onLoadMore,
                    loadMoreThreshold: 20,
                    hasMore: false
                }
            })

            const viewport = screen.getByTestId('test-list-viewport')
            expect(viewport).toBeInTheDocument()
        })

        test('works without onLoadMore callback', async () => {
            const items = createMockItems(10)

            render(TestWrapper, {
                props: {
                    testId: 'test-list',
                    items
                    // No onLoadMore, loadMoreThreshold, or hasMore
                }
            })

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

        test('exposes the viewport as a focusable labeled region', async () => {
            const items = createMockItems(5)

            render(TestWrapper, {
                props: {
                    testId: 'a11y-list',
                    items
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('a11y-list-viewport')
            expect(viewport.getAttribute('role')).toBe('region')
            expect(viewport.getAttribute('aria-label')).toBe('Scrollable list')
            expect(viewport.getAttribute('tabindex')).toBe('0')
        })

        test('applies a custom viewportLabel', async () => {
            const items = createMockItems(5)

            render(TestWrapper, {
                props: {
                    testId: 'labeled-list',
                    items,
                    viewportLabel: 'Search results'
                }
            })

            await vi.runAllTimersAsync()

            const viewport = screen.getByTestId('labeled-list-viewport')
            expect(viewport.getAttribute('aria-label')).toBe('Search results')
        })
    })
})
