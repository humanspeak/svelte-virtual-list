import { expect, test } from '@playwright/test'

test.describe('Scrolling Performance', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/performance')
        // Wait for initial render
        await page.waitForSelector('[data-testid="performance-list-viewport"]')
    })

    test('should maintain performance while scrolling', async ({ page }) => {
        const metrics = await page.evaluate(async () => {
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            const measurements: number[] = []

            for (let i = 0; i < 10; i++) {
                // Start timing just before scroll
                const start = performance.now()
                if (viewport) viewport.scrollTop += 500

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
        expect(avgScrollTime).toBeLessThan(32) // Allow for 2 frames (32ms at 60fps)

        // Verify items are still rendered correctly after scrolling
        const visibleItems = await page.locator('.test-item').count()
        expect(visibleItems).toBeGreaterThan(0)
    })

    test('should maintain smooth scrolling during rapid scroll events', async ({ page }) => {
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

            // Rapid scrolling simulation
            for (let i = 0; i < 5; i++) {
                if (viewport) viewport.scrollTop += 2000
                await new Promise((resolve) => setTimeout(resolve, 100))
            }

            await new Promise((resolve) => setTimeout(resolve, 500)) // Wait for potential frame drops
            observer.disconnect()
            return drops.length
        })

        expect(frameDrops).toBeLessThan(3) // Allow max 2 frame drops during rapid scrolling
    })

    test('should handle continuous scrolling without memory leaks', async ({ page }) => {
        const initialMemory = await page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (performance as any).memory?.usedJSHeapSize || 0
        )

        // Continuous scroll for a longer period
        await page.evaluate(async () => {
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            for (let i = 0; i < 20; i++) {
                if (viewport) viewport.scrollTop += 1000
                await new Promise((resolve) => setTimeout(resolve, 50))
                if (viewport) viewport.scrollTop -= 500
                await new Promise((resolve) => setTimeout(resolve, 50))
            }
        })

        const finalMemory = await page.evaluate(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (performance as any).memory?.usedJSHeapSize || 0
        )

        // Only check if browser supports memory API
        if (initialMemory > 0) {
            // Allow for some memory overhead but catch significant leaks
            expect(finalMemory - initialMemory).toBeLessThan(5 * 1024 * 1024) // 5MB threshold
        }
    })

    test('should maintain item rendering performance during scroll', async ({ page }) => {
        // Initial render time measurement
        const initialRenderTime = await page.evaluate(async () => {
            const start = performance.now()
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            if (viewport) viewport.scrollTop = 0
            await new Promise((resolve) => setTimeout(resolve, 100))
            return performance.now() - start
        })

        // Scroll to middle and measure render time
        const midScrollRenderTime = await page.evaluate(async () => {
            const start = performance.now()
            const viewport = document.querySelector('[data-testid="performance-list-viewport"]')
            if (viewport) viewport.scrollTop = 50000
            await new Promise((resolve) => setTimeout(resolve, 100))
            return performance.now() - start
        })

        // Render time shouldn't significantly degrade
        expect(midScrollRenderTime).toBeLessThan(initialRenderTime * 2)
    })
})
