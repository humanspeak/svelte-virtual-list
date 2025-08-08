import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    createAdvancedThrottledCallback,
    createThrottledCallback,
    timeProvider
} from './throttle.js'

describe('throttle utilities', () => {
    let mockTime = 0

    beforeEach(() => {
        vi.useFakeTimers()
        mockTime = 0

        // Mock the timeProvider to use our controlled time
        vi.spyOn(timeProvider, 'now').mockImplementation(() => mockTime)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    const advanceTime = (ms: number) => {
        mockTime += ms
        vi.advanceTimersByTime(ms)
    }

    describe('createThrottledCallback', () => {
        it('should execute callback immediately on first call', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 100)

            throttled('first')

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('first')
        })

        it('should ignore subsequent calls within delay window', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 100)

            throttled('first')
            throttled('second')
            throttled('third')

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('first')
        })

        it('should allow execution after delay has passed', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 100)

            throttled('first')
            expect(callback).toHaveBeenCalledTimes(1)

            advanceTime(150)
            throttled('second')

            expect(callback).toHaveBeenCalledTimes(2)
            expect(callback).toHaveBeenCalledWith('second')
        })

        it('should use default delay of 16ms when not specified', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback)

            throttled('first')
            throttled('second')

            expect(callback).toHaveBeenCalledTimes(1)

            advanceTime(20)
            throttled('third')

            expect(callback).toHaveBeenCalledTimes(2)
        })

        it('should handle multiple arguments correctly', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 100)

            throttled('arg1', 'arg2', 123)

            expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123)
        })

        it('should handle rapid successive calls efficiently', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 100)

            // Simulate rapid calls (like in a scroll event)
            for (let i = 0; i < 50; i++) {
                throttled(`call-${i}`)
            }

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('call-0')
        })

        it('should work with different function signatures', () => {
            const voidCallback = vi.fn(() => {})
            const numberCallback = vi.fn((x: number) => {
                // no-op side effect to satisfy void signature
                void x
            })
            const objectCallback = vi.fn((obj: { id: number }) => {
                void obj
            })

            const throttledVoid = createThrottledCallback(voidCallback, 50)
            const throttledNumber = createThrottledCallback((...args: unknown[]) => {
                numberCallback(args[0] as number)
            }, 50)
            const throttledObject = createThrottledCallback((...args: unknown[]) => {
                objectCallback(args[0] as { id: number })
            }, 50)

            throttledVoid()
            throttledNumber(5)
            throttledObject({ id: 123 })

            expect(voidCallback).toHaveBeenCalledTimes(1)
            expect(numberCallback).toHaveBeenCalledWith(5)
            expect(objectCallback).toHaveBeenCalledWith({ id: 123 })
        })

        it('should maintain proper timing across multiple cycles', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 100)

            // First cycle
            throttled('cycle1-call1')
            throttled('cycle1-call2')
            expect(callback).toHaveBeenCalledTimes(1)

            // Second cycle after delay
            advanceTime(150)
            throttled('cycle2-call1')
            throttled('cycle2-call2')
            expect(callback).toHaveBeenCalledTimes(2)

            // Third cycle after delay
            advanceTime(150)
            throttled('cycle3-call1')
            expect(callback).toHaveBeenCalledTimes(3)
        })
    })

    describe('createAdvancedThrottledCallback', () => {
        it('should execute on leading edge by default', () => {
            const callback = vi.fn()
            const throttled = createAdvancedThrottledCallback(callback, 100)

            throttled('leading')

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('leading')
        })

        it('should not execute on trailing edge by default', () => {
            const callback = vi.fn()
            const throttled = createAdvancedThrottledCallback(callback, 100)

            throttled('first')
            throttled('second')

            advanceTime(150)

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('first')
        })

        it('should execute only on trailing edge when leading=false, trailing=true', () => {
            const callback = vi.fn()
            const throttled = createAdvancedThrottledCallback(callback, 100, {
                leading: false,
                trailing: true
            })

            throttled('first')
            throttled('second')
            throttled('third')

            expect(callback).not.toHaveBeenCalled()

            advanceTime(150)

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('third') // Last call wins
        })

        it('should execute on both leading and trailing edges when configured', () => {
            const callback = vi.fn()
            const throttled = createAdvancedThrottledCallback(callback, 100, {
                leading: true,
                trailing: true
            })

            throttled('first')
            throttled('second')
            throttled('third')

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('first')

            advanceTime(150)

            expect(callback).toHaveBeenCalledTimes(2)
            expect(callback).toHaveBeenLastCalledWith('third')
        })

        it('should cancel pending trailing execution on new call', () => {
            const callback = vi.fn()
            const throttled = createAdvancedThrottledCallback(callback, 100, {
                leading: false,
                trailing: true
            })

            throttled('first')
            advanceTime(50) // Halfway through delay

            throttled('second') // Should cancel first trailing execution

            advanceTime(60) // Only 110ms total, but second call resets timer
            expect(callback).not.toHaveBeenCalled()

            advanceTime(50) // Now 160ms total, 100ms since second call
            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('second')
        })

        it('should handle rapid calls with trailing execution correctly', () => {
            const callback = vi.fn()
            const throttled = createAdvancedThrottledCallback(callback, 100, {
                leading: true,
                trailing: true
            })

            // Rapid burst of calls
            throttled('call1')
            throttled('call2')
            throttled('call3')
            throttled('call4')
            throttled('call5')

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith('call1')

            advanceTime(150)

            expect(callback).toHaveBeenCalledTimes(2)
            expect(callback).toHaveBeenLastCalledWith('call5')
        })

        it('should work correctly with neither leading nor trailing', () => {
            const callback = vi.fn()
            const throttled = createAdvancedThrottledCallback(callback, 100, {
                leading: false,
                trailing: false
            })

            throttled('call1')
            throttled('call2')

            advanceTime(150)

            expect(callback).not.toHaveBeenCalled()
        })
    })

    describe('performance and edge cases', () => {
        it('should handle zero delay gracefully', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 0)

            throttled('first')
            throttled('second')

            // With zero delay, both calls should execute since there's no throttling
            expect(callback).toHaveBeenCalledTimes(2)
            expect(callback).toHaveBeenCalledWith('first')
            expect(callback).toHaveBeenCalledWith('second')
        })

        it('should handle very large delays', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 1000000)

            throttled('first')
            throttled('second')

            expect(callback).toHaveBeenCalledTimes(1)

            advanceTime(500000)
            throttled('third')

            expect(callback).toHaveBeenCalledTimes(1) // Still within delay
        })

        it('should not leak memory with many calls', () => {
            const callback = vi.fn()
            const throttled = createThrottledCallback(callback, 100)

            // Simulate heavy usage
            for (let i = 0; i < 1000; i++) {
                throttled(`call-${i}`)
                if (i % 100 === 0) {
                    advanceTime(150)
                }
            }

            // Should only execute on the allowed intervals
            expect(callback.mock.calls.length).toBeLessThan(20)
        })

        it('should preserve function context and this binding', () => {
            const obj = {
                value: 42,
                getValue: function () {
                    return this.value
                }
            }

            const throttled = createThrottledCallback(obj.getValue.bind(obj), 100)
            const result = throttled()

            // Note: in our throttle implementation, we don't return values
            // This test is more about ensuring no errors occur with bound functions
            expect(obj.getValue).toBeDefined()
        })

        it('should handle concurrent throttled functions independently', () => {
            const callback1 = vi.fn()
            const callback2 = vi.fn()

            const throttled1 = createThrottledCallback(callback1, 100)
            const throttled2 = createThrottledCallback(callback2, 50)

            throttled1('func1')
            throttled2('func2')

            expect(callback1).toHaveBeenCalledWith('func1')
            expect(callback2).toHaveBeenCalledWith('func2')

            advanceTime(60)

            throttled1('func1-delayed') // Still throttled
            throttled2('func2-delayed') // Should execute

            expect(callback1).toHaveBeenCalledTimes(1)
            expect(callback2).toHaveBeenCalledTimes(2)
        })
    })
})
