import SvelteVirtualList from '$lib/SvelteVirtualList.svelte'
import type { SvelteVirtualListProps } from '$lib/types.js'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// Add ResizeObserver mock
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

beforeEach(() => {
    vi.useFakeTimers()
    // Add ResizeObserver to the global object
    global.ResizeObserver = ResizeObserverMock
})

describe('testing initialization', () => {
    test('accepts pre-processed tokens as source', async () => {
        render(SvelteVirtualList, {
            props: {
                testId: 'test-id',
                items: []
            } as unknown as SvelteVirtualListProps<any>
        })

        // Wait for all timers and effects to settle
        await vi.runAllTimersAsync()

        // Use findByText instead of getByText to handle async rendering
        const element = await screen.findByTestId('test-id-viewport')
        expect(element).toBeInTheDocument()
        expect(element.nodeName).toBe('DIV')
    })
})
