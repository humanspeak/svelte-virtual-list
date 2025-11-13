import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRafScheduler } from './raf.js'

describe('createRafScheduler', () => {
    let rafSchedule: (fn: () => void) => void

    beforeEach(() => {
        vi.useFakeTimers()
        rafSchedule = createRafScheduler()

        // Mock requestAnimationFrame
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            setTimeout(cb, 0)
            return 0
        })
    })

    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('should execute the callback function', async () => {
        const mockFn = vi.fn()
        rafSchedule(mockFn)

        await vi.runAllTimersAsync()
        expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should replace previous callback with new one if called before RAF executes', async () => {
        const mockFn1 = vi.fn()
        const mockFn2 = vi.fn()

        rafSchedule(mockFn1)
        rafSchedule(mockFn2)

        await vi.runAllTimersAsync()
        expect(mockFn1).not.toHaveBeenCalled()
        expect(mockFn2).toHaveBeenCalledTimes(1)
    })

    it('should schedule new callback after previous one completes', async () => {
        const mockFn1 = vi.fn()
        const mockFn2 = vi.fn()

        rafSchedule(mockFn1)
        await vi.runAllTimersAsync()

        rafSchedule(mockFn2)
        await vi.runAllTimersAsync()

        expect(mockFn1).toHaveBeenCalledTimes(1)
        expect(mockFn2).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple rapid calls efficiently', async () => {
        const mockRAF = vi.spyOn(window, 'requestAnimationFrame')
        const mockFn = vi.fn()

        // Simulate multiple rapid calls
        for (let i = 0; i < 5; i++) {
            rafSchedule(mockFn)
        }

        await vi.runAllTimersAsync()
        expect(mockRAF).toHaveBeenCalledTimes(1) // Should only schedule one RAF
        expect(mockFn).toHaveBeenCalledTimes(1) // Should only execute last callback
    })
})
