import { expect, test } from '@playwright/test'

/**
 * Comprehensive test suite for bottomToTop mode with dynamic item loading.
 *
 * This test verifies the "stick to bottom" behavior where users should remain
 * viewing the newest content when items are added, similar to chat applications.
 */

const PAGE_URL = '/tests/bottomToTop/loadItems'

test.describe('BottomToTop LoadItems', () => {
    test.beforeEach(async ({ page }) => {
        // Install fake timers before navigation to mock setTimeout in the component
        await page.clock.install()
        await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="basic-list-container"]')
    })

    test('should render initial items at bottom of viewport', async ({ page }) => {
        // Wait for initial render
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Should have exactly 2 items initially
        const items = await page.locator('[data-testid^="list-item-"]').all()
        expect(items).toHaveLength(2)

        // Verify item content
        await expect(page.locator('[data-testid="list-item-0"]')).toContainText('Item 0')
        await expect(page.locator('[data-testid="list-item-1"]')).toContainText('Item 1')
    })

    test('should position initial items at bottom of viewport', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const container = page.locator('[data-testid="basic-list-container"]')
        const containerBox = await container.boundingBox()

        const lastItem = page.locator('[data-testid="list-item-1"]')
        const lastItemBox = await lastItem.boundingBox()

        expect(containerBox).toBeTruthy()
        expect(lastItemBox).toBeTruthy()

        if (containerBox && lastItemBox) {
            // Last item should be near the bottom of the container
            const distanceFromBottom =
                containerBox.y + containerBox.height - (lastItemBox.y + lastItemBox.height)
            expect(distanceFromBottom).toBeLessThan(50) // Allow some margin for styling
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

        // Verify that our "stick to bottom" functionality worked
        // The debug log should show: "📝 Items added: 9998, staying at bottom"

        // TODO: Verify debug logs were generated (temporarily disabled)
        // expect(logs.length).toBeGreaterThan(0)
        // expect(logs[0]).toContain('Items added: 9998')
        // expect(logs[0]).toContain('staying at bottom')
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

    test('should handle rapid item additions gracefully', async ({ page }) => {
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

        // Should still be functional - able to scroll
        const viewport = page.locator('[data-testid="basic-list-viewport"]')
        await viewport.evaluate((el) => el.scrollTo({ top: 1000 }))

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

        // Advance timers to trigger setTimeout
        await page.clock.fastForward(1000)
        await page.waitForSelector('[data-testid="list-item-2"]')

        const viewport = page.locator('[data-testid="basic-list-viewport"]')

        // Should be able to scroll to top
        await viewport.evaluate((el) => el.scrollTo({ top: 0 }))

        // Wait until scroll position actually reaches top (with timeout for race conditions)
        await page
            .waitForFunction(
                () => {
                    const viewport = document.querySelector('[data-testid="basic-list-viewport"]')
                    return viewport && viewport.scrollTop < 100
                },
                { timeout: 2000 }
            )
            .catch(() => {
                // If timeout, continue with test - this might be the expected behavior
            })

        const scrollTop = await viewport.evaluate((el) => el.scrollTop)
        expect(scrollTop).toBeLessThan(100)

        // Should be able to scroll back to bottom
        await viewport.evaluate((el) => el.scrollTo({ top: 999999 })) // Scroll to bottom
        await page.waitForTimeout(300)

        const finalScrollTop = await viewport.evaluate((el) => el.scrollTop)
        expect(finalScrollTop).toBeGreaterThan(1000)
    })
})
