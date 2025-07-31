import { describe, expect, it, vi } from 'vitest'
import {
    calculateOptimalChunkSize,
    createProgressInfo,
    initializeVirtualList,
    shouldUseChunkedInitialization
} from './initialization.js'

// Mock the processChunked function
vi.mock('./virtualList.js', () => ({
    processChunked: vi.fn((items, chunkSize, onProgress, onComplete) => {
        // Simulate chunked processing for tests - immediate resolution
        return Promise.resolve().then(() => {
            // Simulate progressive processing
            let processed = 0
            while (processed < items.length) {
                processed = Math.min(processed + chunkSize, items.length)
                onProgress?.(processed)
            }
            onComplete?.()
        })
    })
}))

describe('initialization utilities', () => {
    describe('shouldUseChunkedInitialization', () => {
        it('should return false for small datasets', () => {
            expect(shouldUseChunkedInitialization(500)).toBe(false)
            expect(shouldUseChunkedInitialization(1000)).toBe(false)
        })

        it('should return true for large datasets', () => {
            expect(shouldUseChunkedInitialization(1001)).toBe(true)
            expect(shouldUseChunkedInitialization(10000)).toBe(true)
        })

        it('should respect custom threshold', () => {
            expect(shouldUseChunkedInitialization(800, 500)).toBe(true)
            expect(shouldUseChunkedInitialization(300, 500)).toBe(false)
        })

        it('should handle edge cases', () => {
            expect(shouldUseChunkedInitialization(0)).toBe(false)
            expect(shouldUseChunkedInitialization(1)).toBe(false)
        })
    })

    describe('calculateOptimalChunkSize', () => {
        it('should return smaller chunks for very large datasets', () => {
            const chunkSize = calculateOptimalChunkSize(100000)
            expect(chunkSize).toBeLessThan(50)
            expect(chunkSize).toBeGreaterThanOrEqual(25)
        })

        it('should return base chunk size for medium datasets', () => {
            const chunkSize = calculateOptimalChunkSize(10000)
            expect(chunkSize).toBe(50)
        })

        it('should return larger chunks for smaller datasets', () => {
            const chunkSize = calculateOptimalChunkSize(2000)
            expect(chunkSize).toBeGreaterThan(50)
            expect(chunkSize).toBeLessThanOrEqual(100)
        })

        it('should return item count for very small datasets', () => {
            const chunkSize = calculateOptimalChunkSize(500)
            expect(chunkSize).toBe(500)
        })

        it('should respect custom base chunk size', () => {
            const chunkSize = calculateOptimalChunkSize(10000, 100)
            expect(chunkSize).toBe(100)
        })

        it('should handle edge cases', () => {
            expect(calculateOptimalChunkSize(0)).toBe(0)
            expect(calculateOptimalChunkSize(1)).toBe(1)
        })
    })

    describe('createProgressInfo', () => {
        it('should calculate percentage correctly', () => {
            const progress = createProgressInfo(25, 100)
            expect(progress.processed).toBe(25)
            expect(progress.total).toBe(100)
            expect(progress.percentage).toBe(25)
            expect(progress.isComplete).toBe(false)
        })

        it('should handle completion', () => {
            const progress = createProgressInfo(100, 100)
            expect(progress.percentage).toBe(100)
            expect(progress.isComplete).toBe(true)
        })

        it('should handle over-completion', () => {
            const progress = createProgressInfo(150, 100)
            expect(progress.percentage).toBe(150)
            expect(progress.isComplete).toBe(true)
        })

        it('should handle zero total', () => {
            const progress = createProgressInfo(0, 0)
            expect(progress.percentage).toBe(100)
            expect(progress.isComplete).toBe(true)
        })

        it('should round percentage', () => {
            const progress = createProgressInfo(33, 100)
            expect(progress.percentage).toBe(33)

            const progress2 = createProgressInfo(333, 1000)
            expect(progress2.percentage).toBe(33)
        })
    })

    describe('initializeVirtualList', () => {
        it('should handle empty items array', async () => {
            const onComplete = vi.fn()
            const onProgress = vi.fn()

            await initializeVirtualList({
                items: [],
                chunkSize: 50,
                onComplete,
                onProgress
            })

            expect(onComplete).toHaveBeenCalledOnce()
            expect(onProgress).not.toHaveBeenCalled()
        })

        it('should use immediate initialization for small datasets', async () => {
            const items = Array.from({ length: 500 }, (_, i) => ({ id: i }))
            const onComplete = vi.fn()
            const onProgress = vi.fn()

            await initializeVirtualList({
                items,
                chunkSize: 50,
                onComplete,
                onProgress
            })

            expect(onComplete).toHaveBeenCalledOnce()
            expect(onProgress).toHaveBeenCalledWith(500, 500)
        })

        it('should use chunked initialization for large datasets', async () => {
            const items = Array.from({ length: 2000 }, (_, i) => ({ id: i }))
            const onComplete = vi.fn()
            const onProgress = vi.fn()

            await initializeVirtualList({
                items,
                chunkSize: 50,
                onComplete,
                onProgress
            })

            expect(onComplete).toHaveBeenCalledOnce()
            expect(onProgress).toHaveBeenCalled()
        })

        it('should respect custom chunk threshold', async () => {
            const items = Array.from({ length: 800 }, (_, i) => ({ id: i }))
            const onComplete = vi.fn()
            const onProgress = vi.fn()

            await initializeVirtualList({
                items,
                chunkSize: 50,
                chunkThreshold: 500,
                onComplete,
                onProgress
            })

            expect(onComplete).toHaveBeenCalledOnce()
            expect(onProgress).toHaveBeenCalled()
        })

        it('should work without callbacks', async () => {
            const items = Array.from({ length: 100 }, (_, i) => ({ id: i }))

            // Should not throw
            await expect(
                initializeVirtualList({
                    items,
                    chunkSize: 50
                })
            ).resolves.toBeUndefined()
        })

        it('should provide accurate progress updates', async () => {
            const items = Array.from({ length: 2000 }, (_, i) => ({ id: i }))
            const progressUpdates: Array<{ processed: number; total: number }> = []

            await initializeVirtualList({
                items,
                chunkSize: 50,
                onProgress: (processed, total) => {
                    progressUpdates.push({ processed, total })
                }
            })

            expect(progressUpdates.length).toBeGreaterThan(0)
            expect(progressUpdates[progressUpdates.length - 1].processed).toBe(2000)
            expect(progressUpdates[progressUpdates.length - 1].total).toBe(2000)
        })
    })
})
