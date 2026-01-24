import { expect, test } from '@playwright/test'
import { rafWait, scrollByWheel } from '../../src/lib/test/utils/rafWait.js'

/**
 * Comprehensive test suite for bottomToTop mode with dynamic item loading.
 *
 * This test verifies the "stick to bottom" behavior where users should remain
 * viewing the newest content when items are added, similar to chat applications.
 */

const PAGE_URL = '/tests/list/bottomToTop/loadItems'

test.describe('BottomToTop LoadItems', () => {
    test.beforeEach(async ({ page }) => {
        // Install fake timers before navigation to mock setTimeout in the component
        await page.clock.install()
        await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('[data-testid="basic-list-container"]')
    })

    test('should render initial items at bottom of viewport', async ({ page }) => {
        // Wait for initial render
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Should render at least the first two items initially (virtualized may render more)
        const items = await page.locator('[data-testid^="list-item-"]').all()
        expect(items.length).toBeGreaterThanOrEqual(2)

        // Verify item content
        await expect(page.locator('[data-testid="list-item-0"]')).toContainText('Item 0')
        await expect(page.locator('[data-testid="list-item-1"]')).toContainText('Item 1')
    })

    test('should position initial items at bottom of viewport', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Compute bottom-most visible item generically (virtualization may vary)
        const result = await page.evaluate(() => {
            const container = document.querySelector(
                '[data-testid="basic-list-container"]'
            ) as HTMLElement | null
            const items = Array.from(
                document.querySelectorAll('[data-testid^="list-item-"]')
            ) as HTMLElement[]
            if (!container || items.length === 0) return null
            const containerRect = container.getBoundingClientRect()
            let bottomMost: { bottom: number } | null = null
            for (const el of items) {
                const r = el.getBoundingClientRect()
                const b = r.y + r.height
                if (!bottomMost || b > bottomMost.bottom) bottomMost = { bottom: b }
            }
            if (!bottomMost) return null
            const distanceFromBottom = containerRect.y + containerRect.height - bottomMost.bottom
            return { distanceFromBottom }
        })

        expect(result).not.toBeNull()
        if (result) {
            expect(Math.abs(result.distanceFromBottom)).toBeLessThan(50)
        }
    })

    test('should maintain bottom position when items are added', async ({ page }) => {
        // Wait for initial render
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Get initial scroll position
        const viewport = page.locator('[data-testid="basic-list-viewport"]')
        await viewport.evaluate((el) => el.scrollTop)

        // Record console logs to verify debug output
        const logs: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'log' && msg.text().includes('staying at bottom')) {
                logs.push(msg.text())
            }
        })

        // Advance timers to trigger the setTimeout in the component (1000ms)
        await page.clock.fastForward(1000)

        // Give a small real-time wait for Svelte effects to process
        await page.waitForTimeout(100)

        // Verify many more items are now present
        await page.waitForSelector('[data-testid="list-item-2"]', { timeout: 2000 })

        // Should now have thousands of items (more visible items due to virtualization)
        const allItems = await page.locator('[data-testid^="list-item-"]').all()
        // console.log('Total rendered items:', allItems.length)
        expect(allItems.length).toBeGreaterThan(10) // Should have many more visible items

        // Get final scroll position
        const finalScrollTop = await viewport.evaluate((el) => el.scrollTop)

        // Scroll position should have changed significantly (moved down to accommodate new items)
        expect(finalScrollTop).toBeGreaterThan(100000) // Should be a large scroll position
        // console.log('Scroll position changed from', initialScrollTop, 'to', finalScrollTop)
    })

    test('should handle viewport height correctly', async ({ page }) => {
        await page.waitForSelector('[data-testid="basic-list-container"]')

        const container = page.locator('[data-testid="basic-list-container"]')
        const containerBox = await container.boundingBox()

        expect(containerBox).toBeTruthy()
        expect(containerBox!.height).toBe(500) // From the inline style
    })

    test('should render correct DOM structure', async ({ page }) => {
        await page.waitForSelector('[data-testid="basic-list-container"]')

        // Container should have correct structure
        const container = page.locator('[data-testid="basic-list-container"]')
        await expect(container).toHaveClass(/virtual-list-container/)

        // Items container should exist
        const itemsContainer = page.locator('[data-testid="basic-list-items"]')
        await expect(itemsContainer).toBeVisible()
        await expect(itemsContainer).toHaveClass(/virtual-list-items/)

        // Items should have correct classes
        const firstItem = page.locator('[data-testid="list-item-0"]')
        await expect(firstItem).toHaveClass('test-item')
    })

    test('should handle rapid item additions gracefully', async ({ page }, testInfo) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Record any error logs
        const errors: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text())
            }
        })

        // Advance timers to trigger setTimeout
        await page.clock.fastForward(1000)
        await page.waitForTimeout(100)

        // Should not have any errors during the rapid addition
        expect(errors).toHaveLength(0)

        // Should still be functional - able to scroll using scrollByWheel helper
        const viewport = page.locator('[data-testid="basic-list-viewport"]')
        await scrollByWheel(page, viewport, 0, 1000, testInfo) // positive deltaY scrolls down

        const scrollTop = await viewport.evaluate((el) => el.scrollTop)
        expect(scrollTop).toBeGreaterThan(500)
    })

    test('should maintain performance during item addition', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Measure time for item addition to complete
        const startTime = Date.now()

        // Advance timers to trigger setTimeout
        await page.clock.fastForward(1000)
        await page.waitForSelector('[data-testid="list-item-2"]')

        const endTime = Date.now()
        const duration = endTime - startTime

        // Should complete within reasonable time (just measuring DOM processing)
        expect(duration).toBeLessThan(1000)

        // Should still be responsive
        const container = page.locator('[data-testid="basic-list-container"]')
        const isVisible = await container.isVisible()
        expect(isVisible).toBe(true)
    })

    test('should handle scrolling after items are added', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Advance timers to trigger setTimeout and then allow two frames to settle
        await page.clock.fastForward(1000)
        await page.waitForSelector('[data-testid="list-item-2"]')

        await rafWait(page)

        const viewport = page.locator('[data-testid="basic-list-viewport"]')

        // Should be able to scroll to top (force non-smooth and set scrollTop directly)
        await viewport.evaluate((el) => {
            el.scrollTo({ top: 0, behavior: 'auto' })
            ;(el as HTMLElement).scrollTop = 0
        })
        // Wait for a stable scrollTop near 0 across consecutive frames (handles engine timing)
        await page.waitForFunction(
            () => {
                const el = document.querySelector(
                    '[data-testid="basic-list-viewport"]'
                ) as HTMLElement | null
                if (!el) return false
                const w = window as unknown as {
                    __svlStableCountTop?: number
                    __svlLastTop?: number
                    __svlRetriesTop?: number
                }
                const current = el.scrollTop
                if (typeof w.__svlStableCountTop !== 'number') {
                    w.__svlStableCountTop = 0
                    w.__svlLastTop = current
                    w.__svlRetriesTop = 0
                }
                const nearTop = current < 100
                if (nearTop && current === w.__svlLastTop) {
                    w.__svlStableCountTop += 1
                } else {
                    w.__svlStableCountTop = 0
                    if ((w.__svlRetriesTop ?? 0) < 2) {
                        el.scrollTop = 0
                        w.__svlRetriesTop = (w.__svlRetriesTop ?? 0) + 1
                    }
                }
                w.__svlLastTop = current
                return w.__svlStableCountTop >= 3
            },
            { timeout: 6000 }
        )

        // In bottomToTop mode, scrollTop=0 shows the HIGHEST indexed items (top of content)
        // Item 9999 should be visible after scrolling to top
        await page.waitForSelector('[data-testid="list-item-9999"]', { timeout: 2000 })
        await expect(page.locator('[data-testid="list-item-9999"]')).toBeVisible()

        // Should be able to scroll back to bottom
        await viewport.evaluate((el) => {
            el.scrollTo({ top: 999999, behavior: 'auto' })
        })
        // Wait for scrollTop to stabilize above threshold
        await page.waitForFunction(
            () => {
                const el = document.querySelector(
                    '[data-testid="basic-list-viewport"]'
                ) as HTMLElement | null
                if (!el) return false
                const w = window as unknown as {
                    __svlStableCountBottom?: number
                    __svlLastBottom?: number
                    __svlRetriesBottom?: number
                }
                const current = el.scrollTop
                if (typeof w.__svlStableCountBottom !== 'number') {
                    w.__svlStableCountBottom = 0
                    w.__svlLastBottom = current
                    w.__svlRetriesBottom = 0
                }
                const pastThreshold = current > 1000
                if (pastThreshold && current === w.__svlLastBottom) {
                    w.__svlStableCountBottom += 1
                } else {
                    w.__svlStableCountBottom = 0
                    if ((w.__svlRetriesBottom ?? 0) < 2) {
                        el.scrollTop = 999999
                        w.__svlRetriesBottom = (w.__svlRetriesBottom ?? 0) + 1
                    }
                }
                w.__svlLastBottom = current
                return w.__svlStableCountBottom >= 2
            },
            { timeout: 6000 }
        )

        const finalScrollTop = await viewport.evaluate((el) => el.scrollTop)
        expect(finalScrollTop).toBeGreaterThan(1000)

        // In bottomToTop mode, scrolling to bottom (max scrollTop) shows item 0
        await page.waitForSelector('[data-testid="list-item-0"]', { timeout: 2000 })
        await expect(page.locator('[data-testid="list-item-0"]')).toBeVisible()
    })
})
