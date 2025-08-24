import { expect, test } from '@playwright/test'
import { rafWait } from '../utils/rafWait.js'

test.describe('BottomToTop Performance', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/list/bottomToTop/performance')
        // Wait for initial render
        await page.waitForSelector('[data-testid="performance-list-viewport"]')
        // Allow extra time for bottomToTop initialization (more complex positioning)
        await page.waitForTimeout(200)
    })

    test('should maintain performance while scrolling (bottomToTop)', async ({ page }) => {
        const metrics = await page.evaluate(async () => {
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            const measurements: number[] = []

            for (let i = 0; i < 10; i++) {
                // Start timing just before scroll
                const start = performance.now()
                // bottomToTop: scroll up by reducing scrollTop
                if (viewport) viewport.scrollTop -= 500

                // Wait for next frame to ensure render completed
                await new Promise((resolve) => requestAnimationFrame(resolve))

                // Measure just the scroll and render time
                measurements.push(performance.now() - start)

                // Add delay between measurements but don't include in timing
                await new Promise((resolve) => setTimeout(resolve, 100))
            }

            return measurements
        })

        const avgScrollTime = metrics.reduce((a, b) => a + b) / metrics.length
        // BottomToTop expected to be ~25% slower due to reverse calculations
        expect(avgScrollTime).toBeLessThan(40) // vs 32ms for regular (25% more lenient)

        // Verify items are still rendered correctly after scrolling
        const visibleItems = await page.locator('.test-item').count()
        expect(visibleItems).toBeGreaterThan(0)
    })

    test('should maintain smooth scrolling during rapid scroll events (bottomToTop)', async ({
        page
    }) => {
        const frameDrops = await page.evaluate(async () => {
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            const drops: number[] = []

            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                entries.forEach((entry) => {
                    if (entry.duration > 16.7) {
                        // More than 1 frame (60fps)
                        drops.push(entry.duration)
                    }
                })
            })

            observer.observe({ entryTypes: ['longtask'] })

            // Rapid scrolling simulation (bottomToTop direction)
            for (let i = 0; i < 5; i++) {
                if (viewport) viewport.scrollTop -= 2000 // Scroll up in bottomToTop mode
                await new Promise((resolve) => setTimeout(resolve, 100))
            }

            await new Promise((resolve) => setTimeout(resolve, 500)) // Wait for potential frame drops
            observer.disconnect()
            return drops.length
        })

        // Allow 1 extra frame drop due to bottomToTop complexity
        expect(frameDrops).toBeLessThan(4) // vs 3 for regular (33% more lenient)
    })

    test('should handle continuous scrolling without memory leaks (bottomToTop)', async ({
        page
    }) => {
        const initialMemory = await page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (performance as any).memory?.usedJSHeapSize || 0
        )

        // Continuous scroll for a longer period (bottomToTop pattern)
        await page.evaluate(async () => {
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            for (let i = 0; i < 20; i++) {
                // bottomToTop: scroll up then down
                if (viewport) viewport.scrollTop -= 1000
                await new Promise((resolve) => setTimeout(resolve, 50))
                if (viewport) viewport.scrollTop += 500
                await new Promise((resolve) => setTimeout(resolve, 50))
            }
        })

        const finalMemory = await page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (performance as any).memory?.usedJSHeapSize || 0
        )

        // Only check if browser supports memory API
        if (initialMemory > 0) {
            // Same memory threshold as regular mode (memory usage shouldn't differ significantly)
            expect(finalMemory - initialMemory).toBeLessThan(5 * 1024 * 1024) // 5MB threshold
        }
    })

    test('should maintain item rendering performance during scroll (bottomToTop)', async ({
        page
    }) => {
        // Initial render time measurement
        const initialRenderTime = await page.evaluate(async () => {
            const start = performance.now()
            // bottomToTop: measure time at initial position (already showing item 0 at bottom)
            await new Promise((resolve) => setTimeout(resolve, 100))
            return performance.now() - start
        })

        // Scroll to middle and measure render time
        const midScrollRenderTime = await page.evaluate(async () => {
            const start = performance.now()
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            // bottomToTop: scroll up to see higher indices
            if (viewport) viewport.scrollTop -= 50000
            await new Promise((resolve) => setTimeout(resolve, 100))
            return performance.now() - start
        })

        // BottomToTop render time should remain consistent but allow slightly more variance
        expect(midScrollRenderTime).toBeLessThan(initialRenderTime * 1.5) // vs 1.3x for regular (15% more lenient)
    })

    test('should handle large scroll jumps efficiently (bottomToTop)', async ({ page }) => {
        const jumpTimes = await page.evaluate(async () => {
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            const times = []

            // Test massive scroll jumps (adapted for bottomToTop)
            // bottomToTop starts high, so we test jumps in both directions
            const initialScrollTop = viewport ? viewport.scrollTop : 0
            const positions = [
                initialScrollTop - 25000,
                initialScrollTop - 75000,
                initialScrollTop - 50000,
                initialScrollTop - 90000,
                initialScrollTop - 10000,
                initialScrollTop
            ]

            for (const pos of positions) {
                const start = performance.now()
                if (viewport) viewport.scrollTop = Math.max(pos, 0) // Ensure we don't go negative
                await new Promise((resolve) => requestAnimationFrame(resolve))
                times.push(performance.now() - start)
            }

            return times
        })

        const avgJumpTime = jumpTimes.reduce((a, b) => a + b) / jumpTimes.length
        // BottomToTop jumps expected to be slightly slower due to reverse calculations
        expect(avgJumpTime).toBeLessThan(60) // vs 50ms for regular (20% more lenient)
    })

    test('should maintain optimal DOM node count during scroll (bottomToTop)', async ({ page }) => {
        const domEfficiency = await page.evaluate(async () => {
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            const measurements = []

            // Test DOM node count at different scroll positions (bottomToTop pattern)
            const initialScrollTop = viewport ? viewport.scrollTop : 0
            const positions = [
                initialScrollTop,
                initialScrollTop - 10000,
                initialScrollTop - 25000,
                initialScrollTop - 50000,
                initialScrollTop - 75000,
                initialScrollTop - 90000
            ]

            for (const pos of positions) {
                if (viewport) viewport.scrollTop = Math.max(pos, 0)
                await new Promise((resolve) => setTimeout(resolve, 100))

                const renderedItems = document.querySelectorAll('.test-item').length
                measurements.push(renderedItems)
            }

            return {
                min: Math.min(...measurements),
                max: Math.max(...measurements),
                avg: measurements.reduce((a, b) => a + b) / measurements.length
            }
        })

        // BottomToTop might need slightly more DOM nodes for positioning calculations
        expect(domEfficiency.max - domEfficiency.min).toBeLessThan(30) // vs 25 for regular (20% more lenient)
        expect(domEfficiency.avg).toBeLessThan(70) // vs 60 for regular (17% more lenient)
    })

    test('should efficiently handle rapid direction changes (bottomToTop)', async ({ page }) => {
        const maxStep = await page.evaluate(async () => {
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')

            const steps: number[] = []

            for (let i = 0; i < 5; i++) {
                if (viewport) {
                    const startUp = performance.now()
                    viewport.scrollTop -= 2000
                    await rafWait()
                    steps.push(performance.now() - startUp)

                    const startDown = performance.now()
                    viewport.scrollTop += 1000
                    await rafWait()
                    steps.push(performance.now() - startDown)
                }
            }

            return Math.max(...steps)
        })

        expect(maxStep).toBeLessThan(140) // browser-agnostic per-step cap; user-like rapid motion
    })
})
