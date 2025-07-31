import * as esmEnv from 'esm-env'
import { describe, expect, it, vi } from 'vitest'
import { calculateAverageHeightDebounced } from './heightCalculation.js'

describe('calculateAverageHeightDebounced', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('should return null when not in browser', () => {
        vi.spyOn(esmEnv, 'BROWSER', 'get').mockReturnValue(false)

        const onUpdate = vi.fn()
        const result = calculateAverageHeightDebounced(
            false,
            null,
            () => ({ start: 0, end: 10 }),
            [],
            {},
            -1,
            40,
            onUpdate,
            200,
            new Set()
        )
        expect(result).toBeNull()
        expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should call onUpdate with new height when conditions are met', async () => {
        vi.mock('esm-env', () => ({
            BROWSER: true
        }))

        const mockElements = Array.from({ length: 10 }, () => {
            const div = document.createElement('div')
            Object.defineProperty(div, 'getBoundingClientRect', {
                value: () => ({ height: 50 }),
                configurable: true
            })
            return div
        })

        const onUpdate = vi.fn()
        const timeoutId = calculateAverageHeightDebounced(
            false,
            null,
            () => ({ start: 0, end: 10 }),
            mockElements,
            {},
            -1,
            40,
            onUpdate,
            200,
            new Set()
        )

        expect(timeoutId).toBeDefined()
        expect(timeoutId).toBeInstanceOf(Object)

        vi.advanceTimersByTime(200)

        expect(onUpdate).toHaveBeenCalledWith({
            newHeight: 50,
            newLastMeasuredIndex: 0,
            updatedHeightCache: expect.any(Object),
            clearedDirtyItems: expect.any(Set)
        })
    })

    it('should not call onUpdate when height difference is small', () => {
        const mockElements = Array.from({ length: 10 }, () => {
            const div = document.createElement('div')
            Object.defineProperty(div, 'getBoundingClientRect', {
                value: () => ({ height: 40.5 }), // Less than 1px difference
                configurable: true
            })
            return div
        })

        const onUpdate = vi.fn()
        calculateAverageHeightDebounced(
            false,
            null,
            () => ({ start: 0, end: 10 }),
            mockElements,
            {},
            -1,
            40,
            onUpdate,
            200,
            new Set()
        )

        vi.advanceTimersByTime(200)
        expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should respect the debounce time', () => {
        const mockElements = Array.from({ length: 1 }, () => {
            const div = document.createElement('div')
            Object.defineProperty(div, 'getBoundingClientRect', {
                value: () => ({ height: 50 }),
                configurable: true
            })
            return div
        })

        const onUpdate = vi.fn()
        const customDebounceTime = 500

        calculateAverageHeightDebounced(
            false,
            null,
            () => ({ start: 0, end: 10 }),
            mockElements,
            {},
            -1,
            40,
            onUpdate,
            customDebounceTime,
            new Set()
        )

        vi.advanceTimersByTime(499)
        expect(onUpdate).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        expect(onUpdate).toHaveBeenCalledWith({
            newHeight: 50,
            newLastMeasuredIndex: 0,
            updatedHeightCache: expect.any(Object),
            clearedDirtyItems: expect.any(Set)
        })
    })

    it('should return null when isCalculatingHeight is true', () => {
        const onUpdate = vi.fn()
        const result = calculateAverageHeightDebounced(
            true, // isCalculatingHeight = true
            null,
            () => ({ start: 0, end: 10 }),
            [],
            {},
            -1,
            40,
            onUpdate,
            200,
            new Set()
        )
        expect(result).toBeNull()
        expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should clear existing timeout and return new timeout when heightUpdateTimeout exists', () => {
        const onUpdate = vi.fn()
        const existingTimeout = setTimeout(() => {}, 1000)
        const result = calculateAverageHeightDebounced(
            false,
            existingTimeout,
            () => ({ start: 0, end: 10 }),
            [],
            {},
            -1,
            40,
            onUpdate,
            200,
            new Set()
        )
        expect(result).not.toBeNull() // Should return new timeout
        expect(typeof result).toBe('object') // Should be a timeout object
        expect(onUpdate).not.toHaveBeenCalled() // Callback shouldn't be called immediately

        // Clean up the returned timeout
        if (result) clearTimeout(result)
    })

    it('should return null when currentIndex equals lastMeasuredIndex', () => {
        const onUpdate = vi.fn()
        const result = calculateAverageHeightDebounced(
            false,
            null,
            () => ({ start: 5, end: 10 }),
            [],
            {},
            5, // matches start index
            40,
            onUpdate,
            200,
            new Set()
        )
        expect(result).toBeNull()
        expect(onUpdate).not.toHaveBeenCalled()
    })
})
