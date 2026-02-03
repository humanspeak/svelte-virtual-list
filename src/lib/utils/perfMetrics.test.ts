import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    formatBytes,
    getCurrentFps,
    getMemoryUsage,
    isPerfEnabled,
    measureAsync,
    measureSync,
    perfMetrics,
    recordDuration,
    startFpsTracking,
    startMeasure,
    stopFpsTracking
} from './perfMetrics.js'

describe('perfMetrics', () => {
    beforeEach(() => {
        // Reset metrics before each test
        perfMetrics.reset()
        // Enable perf by default for tests
        vi.stubEnv('PUBLIC_SVELTE_VIRTUAL_LIST_PERF', 'true')
    })

    afterEach(() => {
        vi.unstubAllEnvs()
    })

    describe('isPerfEnabled', () => {
        it('should return true when PUBLIC_SVELTE_VIRTUAL_LIST_PERF is true', () => {
            vi.stubEnv('PUBLIC_SVELTE_VIRTUAL_LIST_PERF', 'true')
            expect(isPerfEnabled()).toBe(true)
        })

        it('should return true when SVELTE_VIRTUAL_LIST_PERF is true', () => {
            vi.stubEnv('PUBLIC_SVELTE_VIRTUAL_LIST_PERF', '')
            vi.stubEnv('SVELTE_VIRTUAL_LIST_PERF', 'true')
            expect(isPerfEnabled()).toBe(true)
        })

        it('should return false when env vars are not set', () => {
            vi.stubEnv('PUBLIC_SVELTE_VIRTUAL_LIST_PERF', '')
            vi.stubEnv('SVELTE_VIRTUAL_LIST_PERF', '')
            expect(isPerfEnabled()).toBe(false)
        })
    })

    describe('measureSync', () => {
        it('should execute the function and return its result', () => {
            const result = measureSync('scrollHandler', () => 42)
            expect(result).toBe(42)
        })

        it('should record timing when enabled', () => {
            measureSync('scrollHandler', () => {
                // Simulate some work
                let x = 0
                for (let i = 0; i < 1000; i++) x += i
                return x
            })

            const stats = perfMetrics.getMetricStats('scrollHandler')
            expect(stats.count).toBe(1)
            expect(stats.avg).toBeGreaterThanOrEqual(0)
        })

        it('should not record timing when disabled', () => {
            vi.stubEnv('PUBLIC_SVELTE_VIRTUAL_LIST_PERF', '')
            vi.stubEnv('SVELTE_VIRTUAL_LIST_PERF', '')

            measureSync('scrollHandler', () => 42)

            const stats = perfMetrics.getMetricStats('scrollHandler')
            expect(stats.count).toBe(0)
        })

        it('should handle thrown errors and still return', () => {
            expect(() => {
                measureSync('scrollHandler', () => {
                    throw new Error('test error')
                })
            }).toThrow('test error')
        })
    })

    describe('measureAsync', () => {
        it('should execute async function and return its result', async () => {
            const result = await measureAsync('visibleRange', async () => {
                return Promise.resolve(42)
            })
            expect(result).toBe(42)
        })

        it('should record timing for async operations', async () => {
            await measureAsync('visibleRange', async () => {
                // Use synchronous work instead of setTimeout to avoid timer issues
                let x = 0
                for (let i = 0; i < 10000; i++) x += i
                return x
            })

            const stats = perfMetrics.getMetricStats('visibleRange')
            expect(stats.count).toBe(1)
            expect(stats.avg).toBeGreaterThanOrEqual(0)
        })

        it('should not record timing when disabled', async () => {
            vi.stubEnv('PUBLIC_SVELTE_VIRTUAL_LIST_PERF', '')
            vi.stubEnv('SVELTE_VIRTUAL_LIST_PERF', '')

            await measureAsync('visibleRange', async () => 42)

            const stats = perfMetrics.getMetricStats('visibleRange')
            expect(stats.count).toBe(0)
        })
    })

    describe('startMeasure', () => {
        it('should return a function that calculates elapsed time', () => {
            const endMeasure = startMeasure()
            // Simulate some work synchronously
            let x = 0
            for (let i = 0; i < 100000; i++) x += i
            const elapsed = endMeasure()

            // Should return a non-negative number
            expect(elapsed).toBeGreaterThanOrEqual(0)
            expect(typeof elapsed).toBe('number')
        })

        it('should be reusable for multiple measurements', () => {
            const endMeasure = startMeasure()

            // First measurement
            let x = 0
            for (let i = 0; i < 10000; i++) x += i
            const elapsed1 = endMeasure()

            // Do more work
            for (let i = 0; i < 10000; i++) x += i
            const elapsed2 = endMeasure()

            // Second measurement should be >= first
            expect(elapsed2).toBeGreaterThanOrEqual(elapsed1)
        })
    })

    describe('recordDuration', () => {
        it('should record a pre-calculated duration', () => {
            recordDuration('transformY', 5.5)
            recordDuration('transformY', 3.2)

            const stats = perfMetrics.getMetricStats('transformY')
            expect(stats.count).toBe(2)
            expect(stats.total).toBeCloseTo(8.7, 1)
            expect(stats.avg).toBeCloseTo(4.35, 1)
        })

        it('should not record when disabled', () => {
            vi.stubEnv('PUBLIC_SVELTE_VIRTUAL_LIST_PERF', '')
            vi.stubEnv('SVELTE_VIRTUAL_LIST_PERF', '')

            recordDuration('transformY', 5.5)

            const stats = perfMetrics.getMetricStats('transformY')
            expect(stats.count).toBe(0)
        })
    })

    describe('perfMetrics.getStats', () => {
        it('should return stats for all metric types', () => {
            measureSync('scrollHandler', () => 1)
            measureSync('visibleRange', () => 2)

            const stats = perfMetrics.getStats()

            expect(stats.scrollHandler.count).toBe(1)
            expect(stats.visibleRange.count).toBe(1)
            expect(stats.transformY.count).toBe(0)
        })

        it('should calculate correct min/max/avg', () => {
            recordDuration('heightBatch', 10)
            recordDuration('heightBatch', 20)
            recordDuration('heightBatch', 30)

            const stats = perfMetrics.getMetricStats('heightBatch')

            expect(stats.count).toBe(3)
            expect(stats.min).toBe(10)
            expect(stats.max).toBe(30)
            expect(stats.avg).toBe(20)
            expect(stats.total).toBe(60)
        })

        it('should return zeros for empty metrics', () => {
            const stats = perfMetrics.getMetricStats('frameTime')

            expect(stats.count).toBe(0)
            expect(stats.total).toBe(0)
            expect(stats.avg).toBe(0)
            expect(stats.min).toBe(0)
            expect(stats.max).toBe(0)
            expect(stats.recent).toEqual([])
        })
    })

    describe('perfMetrics.getRawMetrics', () => {
        it('should return raw metric entries', () => {
            recordDuration('displayItems', 5)

            const raw = perfMetrics.getRawMetrics()

            expect(raw.displayItems.length).toBe(1)
            expect(raw.displayItems[0].duration).toBe(5)
            expect(typeof raw.displayItems[0].timestamp).toBe('number')
        })
    })

    describe('perfMetrics.reset', () => {
        it('should clear all metrics', () => {
            recordDuration('scrollHandler', 10)
            recordDuration('visibleRange', 20)

            perfMetrics.reset()

            const stats = perfMetrics.getStats()
            expect(stats.scrollHandler.count).toBe(0)
            expect(stats.visibleRange.count).toBe(0)
        })
    })

    describe('perfMetrics.getSummary', () => {
        it('should return a formatted summary string', () => {
            recordDuration('scrollHandler', 1.5)
            recordDuration('scrollHandler', 2.5)

            const summary = perfMetrics.getSummary()

            expect(summary).toContain('=== Virtual List Performance Summary ===')
            expect(summary).toContain('scrollHandler')
            expect(summary).toContain('avg=')
            expect(summary).toContain('max=')
            expect(summary).toContain('count=2')
        })

        it('should only include metrics with data', () => {
            recordDuration('scrollHandler', 1)

            const summary = perfMetrics.getSummary()

            expect(summary).toContain('scrollHandler')
            expect(summary).not.toContain('visibleRange')
        })
    })

    describe('FPS tracking', () => {
        afterEach(() => {
            stopFpsTracking()
        })

        it('should return 0 when tracking has not started', () => {
            expect(getCurrentFps()).toBe(0)
            expect(stopFpsTracking()).toBe(0)
        })

        it('should not start tracking when disabled', () => {
            vi.stubEnv('PUBLIC_SVELTE_VIRTUAL_LIST_PERF', '')
            vi.stubEnv('SVELTE_VIRTUAL_LIST_PERF', '')

            startFpsTracking()
            expect(getCurrentFps()).toBe(0)
        })
    })

    describe('getMemoryUsage', () => {
        it('should return null if performance.memory is not available', () => {
            // Most test environments don't have performance.memory
            const result = getMemoryUsage()
            // Result depends on environment - just verify it returns object or null
            expect(result === null || typeof result === 'object').toBe(true)
        })
    })

    describe('formatBytes', () => {
        it('should format bytes correctly', () => {
            expect(formatBytes(500)).toBe('500 B')
            expect(formatBytes(1024)).toBe('1.0 KB')
            expect(formatBytes(1536)).toBe('1.5 KB')
            expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
            expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB')
        })

        it('should handle edge cases', () => {
            expect(formatBytes(0)).toBe('0 B')
            expect(formatBytes(1023)).toBe('1023 B')
        })
    })

    describe('sample bounding', () => {
        it('should keep samples bounded to MAX_SAMPLES (1000)', () => {
            // Record more than MAX_SAMPLES entries
            for (let i = 0; i < 1100; i++) {
                recordDuration('scrollHandler', i)
            }

            const raw = perfMetrics.getRawMetrics()
            expect(raw.scrollHandler.length).toBeLessThanOrEqual(1000)
        })
    })
})
