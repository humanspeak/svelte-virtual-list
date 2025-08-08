import { createHeightManager } from './index.js'

export function benchmarkHeightManager(
    itemCount: number,
    dirtyCount: number,
    iterations: number = 100
): { avgTime: number; totalTime: number; opsPerSecond: number } {
    const manager = createHeightManager(itemCount)
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
        const dirtyResults = Array.from({ length: dirtyCount }, (_, idx) => ({
            index: idx,
            oldHeight: undefined,
            newHeight: 40 + Math.random() * 20
        }))

        const start = performance.now()
        manager.processDirtyHeights(dirtyResults)
        const end = performance.now()

        times.push(end - start)
        manager.reset() // Reset for next iteration
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const avgTime = totalTime / iterations
    const opsPerSecond = 1000 / avgTime // Convert ms to ops/second

    return {
        avgTime,
        totalTime,
        opsPerSecond
    }
}
