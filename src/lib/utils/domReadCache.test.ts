import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    advanceFrame,
    getCachedHeight,
    getCachedRect,
    getCachedWidth,
    getCurrentFrame,
    invalidateRect
} from './domReadCache.js'

describe('domReadCache', () => {
    // Mock requestAnimationFrame for testing
    beforeEach(() => {
        vi.useFakeTimers()
        // Advance frame counter to ensure fresh cache state for each test
        advanceFrame()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('getCachedRect', () => {
        describe('positive cases', () => {
            it('should return DOMRect from element', () => {
                const mockRect = {
                    x: 10,
                    y: 20,
                    width: 100,
                    height: 50,
                    top: 20,
                    right: 110,
                    bottom: 70,
                    left: 10,
                    toJSON: () => ({})
                } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                const result = getCachedRect(element)

                expect(result).toBe(mockRect)
                expect(element.getBoundingClientRect).toHaveBeenCalledTimes(1)
            })

            it('should cache rect within same frame', () => {
                const mockRect = {
                    x: 0,
                    y: 0,
                    width: 200,
                    height: 100,
                    top: 0,
                    right: 200,
                    bottom: 100,
                    left: 0,
                    toJSON: () => ({})
                } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                // First call
                const result1 = getCachedRect(element)
                // Second call in same frame
                const result2 = getCachedRect(element)

                expect(result1).toBe(mockRect)
                expect(result2).toBe(mockRect)
                // Should only call getBoundingClientRect once
                expect(element.getBoundingClientRect).toHaveBeenCalledTimes(1)
            })

            it('should return fresh rect after frame advances', () => {
                const mockRect1 = { width: 100, height: 50 } as DOMRect
                const mockRect2 = { width: 150, height: 75 } as DOMRect

                const element = {
                    getBoundingClientRect: vi
                        .fn()
                        .mockReturnValueOnce(mockRect1)
                        .mockReturnValueOnce(mockRect2)
                } as unknown as Element

                // First frame
                const result1 = getCachedRect(element)
                expect(result1).toBe(mockRect1)

                // Advance frame
                advanceFrame()

                // Second frame - should get fresh rect
                const result2 = getCachedRect(element)
                expect(result2).toBe(mockRect2)
                expect(element.getBoundingClientRect).toHaveBeenCalledTimes(2)
            })

            it('should cache different elements independently', () => {
                const mockRect1 = { width: 100 } as DOMRect
                const mockRect2 = { width: 200 } as DOMRect

                const element1 = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect1)
                } as unknown as Element

                const element2 = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect2)
                } as unknown as Element

                const result1 = getCachedRect(element1)
                const result2 = getCachedRect(element2)

                expect(result1).toBe(mockRect1)
                expect(result2).toBe(mockRect2)
                expect(element1.getBoundingClientRect).toHaveBeenCalledTimes(1)
                expect(element2.getBoundingClientRect).toHaveBeenCalledTimes(1)
            })
        })

        describe('edge cases', () => {
            it('should handle element with zero dimensions', () => {
                const mockRect = {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    toJSON: () => ({})
                } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                const result = getCachedRect(element)

                expect(result.width).toBe(0)
                expect(result.height).toBe(0)
            })

            it('should handle element with negative position', () => {
                const mockRect = {
                    x: -100,
                    y: -50,
                    width: 200,
                    height: 100,
                    top: -50,
                    right: 100,
                    bottom: 50,
                    left: -100,
                    toJSON: () => ({})
                } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                const result = getCachedRect(element)

                expect(result.x).toBe(-100)
                expect(result.y).toBe(-50)
            })

            it('should handle rapid successive calls', () => {
                const mockRect = { width: 100, height: 50 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                // Call many times rapidly
                for (let i = 0; i < 100; i++) {
                    getCachedRect(element)
                }

                // Should only measure once per frame
                expect(element.getBoundingClientRect).toHaveBeenCalledTimes(1)
            })
        })
    })

    describe('getCachedHeight', () => {
        describe('positive cases', () => {
            it('should return height from cached rect', () => {
                const mockRect = { height: 150 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                const result = getCachedHeight(element)

                expect(result).toBe(150)
            })

            it('should cache height within same frame', () => {
                const mockRect = { height: 200 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                getCachedHeight(element)
                getCachedHeight(element)
                getCachedHeight(element)

                expect(element.getBoundingClientRect).toHaveBeenCalledTimes(1)
            })
        })

        describe('edge cases', () => {
            it('should handle zero height', () => {
                const mockRect = { height: 0 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                expect(getCachedHeight(element)).toBe(0)
            })

            it('should handle fractional height', () => {
                const mockRect = { height: 123.456 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                expect(getCachedHeight(element)).toBe(123.456)
            })

            it('should handle very large height', () => {
                const mockRect = { height: 1000000 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                expect(getCachedHeight(element)).toBe(1000000)
            })
        })
    })

    describe('getCachedWidth', () => {
        describe('positive cases', () => {
            it('should return width from cached rect', () => {
                const mockRect = { width: 250 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                const result = getCachedWidth(element)

                expect(result).toBe(250)
            })

            it('should share cache with getCachedHeight', () => {
                const mockRect = { width: 100, height: 50 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                getCachedHeight(element)
                const width = getCachedWidth(element)

                expect(width).toBe(100)
                // Should only call getBoundingClientRect once (shared cache)
                expect(element.getBoundingClientRect).toHaveBeenCalledTimes(1)
            })
        })

        describe('edge cases', () => {
            it('should handle zero width', () => {
                const mockRect = { width: 0 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                expect(getCachedWidth(element)).toBe(0)
            })

            it('should handle fractional width', () => {
                const mockRect = { width: 99.99 } as DOMRect

                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect)
                } as unknown as Element

                expect(getCachedWidth(element)).toBe(99.99)
            })
        })
    })

    describe('invalidateRect', () => {
        describe('positive cases', () => {
            it('should force re-measurement after invalidation', () => {
                const mockRect1 = { width: 100 } as DOMRect
                const mockRect2 = { width: 200 } as DOMRect

                const element = {
                    getBoundingClientRect: vi
                        .fn()
                        .mockReturnValueOnce(mockRect1)
                        .mockReturnValueOnce(mockRect2)
                } as unknown as Element

                // First call - cached
                getCachedRect(element)
                expect(element.getBoundingClientRect).toHaveBeenCalledTimes(1)

                // Invalidate
                invalidateRect(element)

                // Next call should re-measure
                const result = getCachedRect(element)
                expect(result).toBe(mockRect2)
                expect(element.getBoundingClientRect).toHaveBeenCalledTimes(2)
            })

            it('should only invalidate specific element', () => {
                const mockRect1 = { width: 100 } as DOMRect
                const mockRect2 = { width: 200 } as DOMRect

                const element1 = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect1)
                } as unknown as Element

                const element2 = {
                    getBoundingClientRect: vi.fn().mockReturnValue(mockRect2)
                } as unknown as Element

                // Cache both
                getCachedRect(element1)
                getCachedRect(element2)

                // Invalidate only element1
                invalidateRect(element1)

                // element1 should re-measure, element2 should not
                getCachedRect(element1)
                getCachedRect(element2)

                expect(element1.getBoundingClientRect).toHaveBeenCalledTimes(2)
                expect(element2.getBoundingClientRect).toHaveBeenCalledTimes(1)
            })
        })

        describe('edge cases', () => {
            it('should handle invalidating uncached element', () => {
                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue({ width: 100 } as DOMRect)
                } as unknown as Element

                // Should not throw
                expect(() => invalidateRect(element)).not.toThrow()
            })

            it('should handle multiple invalidations', () => {
                const element = {
                    getBoundingClientRect: vi.fn().mockReturnValue({ width: 100 } as DOMRect)
                } as unknown as Element

                getCachedRect(element)
                invalidateRect(element)
                invalidateRect(element)
                invalidateRect(element)

                // Should not throw
                expect(() => getCachedRect(element)).not.toThrow()
            })
        })
    })

    describe('advanceFrame', () => {
        describe('positive cases', () => {
            it('should increment frame counter', () => {
                const frame1 = getCurrentFrame()
                advanceFrame()
                const frame2 = getCurrentFrame()

                expect(frame2).toBe(frame1 + 1)
            })

            it('should invalidate all cached rects', () => {
                const mockRect1 = { width: 100 } as DOMRect
                const mockRect2 = { width: 200 } as DOMRect

                const element = {
                    getBoundingClientRect: vi
                        .fn()
                        .mockReturnValueOnce(mockRect1)
                        .mockReturnValueOnce(mockRect2)
                } as unknown as Element

                getCachedRect(element)
                advanceFrame()
                const result = getCachedRect(element)

                expect(result).toBe(mockRect2)
            })
        })

        describe('edge cases', () => {
            it('should handle many frame advances', () => {
                const initialFrame = getCurrentFrame()

                for (let i = 0; i < 1000; i++) {
                    advanceFrame()
                }

                expect(getCurrentFrame()).toBe(initialFrame + 1000)
            })
        })
    })

    describe('getCurrentFrame', () => {
        describe('positive cases', () => {
            it('should return current frame number', () => {
                const frame = getCurrentFrame()
                expect(typeof frame).toBe('number')
                expect(Number.isInteger(frame)).toBe(true)
            })

            it('should be consistent within same frame', () => {
                const frame1 = getCurrentFrame()
                const frame2 = getCurrentFrame()
                const frame3 = getCurrentFrame()

                expect(frame1).toBe(frame2)
                expect(frame2).toBe(frame3)
            })
        })
    })
})
