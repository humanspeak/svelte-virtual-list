/**
 * Performance metrics utility for profiling virtual list operations.
 *
 * This lightweight profiling wrapper measures execution times for critical operations
 * in the virtual list component. Enable by setting the environment variable:
 * PUBLIC_SVELTE_VIRTUAL_LIST_PERF=true
 *
 * @example
 * ```typescript
 * import { perfMetrics, measureSync, measureAsync, isPerfEnabled } from '$lib/utils/perfMetrics.js'
 *
 * // Measure synchronous operation
 * const result = measureSync('visibleRange', () => calculateVisibleRange(...))
 *
 * // Get aggregated stats
 * const stats = perfMetrics.getStats()
 * console.log(stats.visibleRange.avg, stats.visibleRange.max)
 * ```
 */

export type MetricName =
    | 'scrollHandler'
    | 'visibleRange'
    | 'transformY'
    | 'heightBatch'
    | 'frameTime'
    | 'displayItems'
    | 'resizeObserver'
    | 'initialRender'

export interface MetricEntry {
    timestamp: number
    duration: number
}

export interface MetricStats {
    count: number
    total: number
    avg: number
    min: number
    max: number
    recent: number[]
}

export interface PerfMetrics {
    scrollHandler: MetricEntry[]
    visibleRange: MetricEntry[]
    transformY: MetricEntry[]
    heightBatch: MetricEntry[]
    frameTime: MetricEntry[]
    displayItems: MetricEntry[]
    resizeObserver: MetricEntry[]
    initialRender: MetricEntry[]
}

const MAX_SAMPLES = 1000 // Keep last N samples per metric
const RECENT_WINDOW = 100 // Number of recent samples for stats

/**
 * Check if performance profiling is enabled via environment variable
 */
export const isPerfEnabled = (): boolean => {
    if (typeof process === 'undefined') return false
    return (
        process?.env?.PUBLIC_SVELTE_VIRTUAL_LIST_PERF === 'true' ||
        process?.env?.SVELTE_VIRTUAL_LIST_PERF === 'true'
    )
}

const createEmptyMetrics = (): PerfMetrics => ({
    scrollHandler: [],
    visibleRange: [],
    transformY: [],
    heightBatch: [],
    frameTime: [],
    displayItems: [],
    resizeObserver: [],
    initialRender: []
})

let metrics: PerfMetrics = createEmptyMetrics()

/**
 * Record a metric measurement
 */
const record = (name: MetricName, duration: number): void => {
    if (!isPerfEnabled()) return

    const entry: MetricEntry = {
        timestamp: performance.now(),
        duration
    }

    metrics[name].push(entry)

    // Keep array bounded
    if (metrics[name].length > MAX_SAMPLES) {
        metrics[name] = metrics[name].slice(-MAX_SAMPLES)
    }
}

/**
 * Measure a synchronous function's execution time
 */
export const measureSync = <T>(name: MetricName, fn: () => T): T => {
    if (!isPerfEnabled()) {
        return fn()
    }

    const start = performance.now()
    try {
        return fn()
    } finally {
        const duration = performance.now() - start
        record(name, duration)
    }
}

/**
 * Measure an async function's execution time
 */
export const measureAsync = async <T>(name: MetricName, fn: () => Promise<T>): Promise<T> => {
    if (!isPerfEnabled()) {
        return fn()
    }

    const start = performance.now()
    try {
        return await fn()
    } finally {
        const duration = performance.now() - start
        record(name, duration)
    }
}

/**
 * Start a manual timing measurement (for operations that span callbacks)
 */
export const startMeasure = (): (() => number) => {
    const start = performance.now()
    return () => performance.now() - start
}

/**
 * Record a pre-calculated duration
 */
export const recordDuration = (name: MetricName, duration: number): void => {
    record(name, duration)
}

/**
 * Calculate stats for a single metric
 */
const calculateStats = (entries: MetricEntry[]): MetricStats => {
    if (entries.length === 0) {
        return { count: 0, total: 0, avg: 0, min: 0, max: 0, recent: [] }
    }

    const durations = entries.map((e) => e.duration)
    const total = durations.reduce((a, b) => a + b, 0)
    const recent = durations.slice(-RECENT_WINDOW)

    return {
        count: entries.length,
        total,
        avg: total / entries.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        recent
    }
}

/**
 * Frame rate tracking for scroll performance
 */
let frameTimestamps: number[] = []
let rafId: number | null = null

/**
 * Start FPS tracking during scroll
 */
export const startFpsTracking = (): void => {
    if (!isPerfEnabled()) return
    if (rafId !== null) return

    frameTimestamps = []
    const trackFrame = () => {
        frameTimestamps.push(performance.now())
        // Keep only last 2 seconds of frames
        const cutoff = performance.now() - 2000
        frameTimestamps = frameTimestamps.filter((t) => t > cutoff)
        rafId = requestAnimationFrame(trackFrame)
    }
    rafId = requestAnimationFrame(trackFrame)
}

/**
 * Stop FPS tracking and return average FPS
 */
export const stopFpsTracking = (): number => {
    if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
    }

    if (frameTimestamps.length < 2) return 0

    const duration = frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[0]
    if (duration <= 0) return 0

    return (frameTimestamps.length - 1) / (duration / 1000)
}

/**
 * Get current FPS (call during active tracking)
 */
export const getCurrentFps = (): number => {
    if (frameTimestamps.length < 2) return 0

    const now = performance.now()
    const recentFrames = frameTimestamps.filter((t) => now - t < 1000)
    if (recentFrames.length < 2) return 0

    const duration = recentFrames[recentFrames.length - 1] - recentFrames[0]
    if (duration <= 0) return 0

    return (recentFrames.length - 1) / (duration / 1000)
}

/**
 * Performance metrics interface with stats aggregation
 */
export const perfMetrics = {
    /**
     * Get aggregated stats for all metrics
     */
    getStats: (): Record<MetricName, MetricStats> => ({
        scrollHandler: calculateStats(metrics.scrollHandler),
        visibleRange: calculateStats(metrics.visibleRange),
        transformY: calculateStats(metrics.transformY),
        heightBatch: calculateStats(metrics.heightBatch),
        frameTime: calculateStats(metrics.frameTime),
        displayItems: calculateStats(metrics.displayItems),
        resizeObserver: calculateStats(metrics.resizeObserver),
        initialRender: calculateStats(metrics.initialRender)
    }),

    /**
     * Get stats for a single metric
     */
    getMetricStats: (name: MetricName): MetricStats => calculateStats(metrics[name]),

    /**
     * Get raw metric entries
     */
    getRawMetrics: (): PerfMetrics => ({ ...metrics }),

    /**
     * Reset all metrics
     */
    reset: (): void => {
        metrics = createEmptyMetrics()
    },

    /**
     * Get a summary report suitable for console output
     */
    getSummary: (): string => {
        const stats = perfMetrics.getStats()
        const lines: string[] = ['=== Virtual List Performance Summary ===']

        for (const [name, stat] of Object.entries(stats) as [MetricName, MetricStats][]) {
            if (stat.count > 0) {
                lines.push(
                    `${name}: avg=${stat.avg.toFixed(2)}ms, max=${stat.max.toFixed(2)}ms, count=${stat.count}`
                )
            }
        }

        return lines.join('\n')
    },

    /**
     * Log summary to console
     */
    logSummary: (): void => {
        if (isPerfEnabled()) {
            console.info(perfMetrics.getSummary())
        }
    }
}

/**
 * Memory tracking utilities
 */
export const getMemoryUsage = (): { usedJSHeapSize: number; totalJSHeapSize: number } | null => {
    if (
        typeof performance !== 'undefined' &&
        'memory' in performance &&
        (
            performance as Performance & {
                memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
            }
        ).memory
    ) {
        const memory = (
            performance as Performance & {
                memory: { usedJSHeapSize: number; totalJSHeapSize: number }
            }
        ).memory
        return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize
        }
    }
    return null
}

/**
 * Helper to format bytes to human-readable size
 */
export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
