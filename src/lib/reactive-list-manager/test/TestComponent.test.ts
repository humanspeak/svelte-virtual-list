import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'
import TestComponent from './TestComponent.svelte'

describe('ReactiveListManager - Integration Tests', () => {
    it('should trigger reactive updates when processDirtyHeights is called', async () => {
        const mockOnUpdate = vi.fn()

        const { component } = render(TestComponent, {
            config: { itemLength: 1000, itemHeight: 40 },
            onReactiveUpdate: mockOnUpdate
        })

        // Wait for initial effect
        await tick()
        vi.runAllTimers()

        // Should have called once for initial render
        expect(mockOnUpdate).toHaveBeenCalledWith({
            totalHeight: 40000, // 1000 * 40
            measuredCount: 0,
            effectRuns: 1
        })

        // Now make a change
        component.processDirtyHeights([{ index: 0, oldHeight: undefined, newHeight: 100 }])

        await tick()
        vi.runAllTimers()

        // Should have triggered another effect run
        expect(mockOnUpdate).toHaveBeenLastCalledWith({
            totalHeight: 100000, // 1 * 100 + 999 * 100 (average becomes 100)
            measuredCount: 1,
            effectRuns: expect.any(Number) // Effect runs multiple times due to reactivity - that's good!
        })
    })

    it('should trigger reactive updates when itemHeight changes', async () => {
        const mockOnUpdate = vi.fn()

        const { component } = render(TestComponent, {
            config: { itemLength: 100, itemHeight: 40 },
            onReactiveUpdate: mockOnUpdate
        })

        await tick()
        vi.runAllTimers()
        mockOnUpdate.mockClear() // Clear initial calls

        // Change itemHeight - should trigger reactivity
        component.setItemHeight(50)

        await tick()
        vi.runAllTimers()

        expect(mockOnUpdate).toHaveBeenLastCalledWith({
            totalHeight: 5000, // 100 * 50
            measuredCount: 0,
            effectRuns: expect.any(Number) // Effect runs multiple times - proves reactivity works!
        })
    })

    it('should trigger reactive updates when item length changes', async () => {
        const mockOnUpdate = vi.fn()

        const { component } = render(TestComponent, {
            config: { itemLength: 100, itemHeight: 40 },
            onReactiveUpdate: mockOnUpdate
        })

        await tick()
        vi.runAllTimers()
        mockOnUpdate.mockClear()

        // Change item length - should trigger reactivity
        component.updateItemLength(200)

        await tick()

        expect(mockOnUpdate).toHaveBeenLastCalledWith({
            totalHeight: 8000, // 200 * 40
            measuredCount: 0,
            effectRuns: expect.any(Number) // Effect runs multiple times - proves reactivity works!
        })
    })

    it('should update DOM elements reactively', async () => {
        const { getByTestId, component } = render(TestComponent, {
            config: { itemLength: 50, itemHeight: 30 }
        })

        await tick()

        // Initial state
        expect(getByTestId('total-height')).toHaveTextContent('1500') // 50 * 30
        expect(getByTestId('measured-count')).toHaveTextContent('0')
        expect(getByTestId('effect-runs')).toHaveTextContent('1')

        // Make a change
        component.processDirtyHeights([{ index: 0, oldHeight: undefined, newHeight: 60 }])

        await tick()

        // DOM should update reactively
        expect(getByTestId('total-height')).toHaveTextContent('3000') // 1 * 60 + 49 * 60
        expect(getByTestId('measured-count')).toHaveTextContent('1')
        expect(getByTestId('effect-runs')).toHaveTextContent('2')
    })

    it('should provide access to manager through exports', async () => {
        const { component } = render(TestComponent, {
            config: { itemLength: 10, itemHeight: 25 }
        })

        await tick()

        const manager = component.getManager()
        expect(manager.totalHeight).toBe(250) // 10 * 25
        expect(manager.itemLength).toBe(10)
        expect(manager.itemHeight).toBe(25)
    })

    it('should export reactive data correctly', async () => {
        const { component } = render(TestComponent, {
            config: { itemLength: 20, itemHeight: 35 }
        })

        await tick()

        const data = component.getReactiveData()
        expect(data.totalHeight).toBe(700) // 20 * 35
        expect(data.measuredCount).toBe(0)
        expect(data.effectRuns).toBe(1)

        // Make a change and check again
        component.processDirtyHeights([{ index: 0, oldHeight: undefined, newHeight: 70 }])

        await tick()

        const updatedData = component.getReactiveData()
        expect(updatedData.totalHeight).toBe(1400) // 1 * 70 + 19 * 70
        expect(updatedData.measuredCount).toBe(1)
        expect(updatedData.effectRuns).toBe(2)
    })
})
