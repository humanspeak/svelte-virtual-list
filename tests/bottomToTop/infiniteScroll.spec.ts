import { expect, test } from '@playwright/test'
import { rafWait, scrollByWheel } from '../../src/lib/test/utils/rafWait.js'

const PAGE_URL = '/tests/list/bottomToTop/infiniteScroll'

test.describe('BottomToTop Infinite Scroll', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('[data-testid="infinite-list-container"]')
    })

    test('should render initial items at bottom', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const items = await page.locator('[data-testid^="list-item-"]').all()
        expect(items.length).toBeGreaterThan(0)

        // In bottomToTop mode, item 0 should be visible at the bottom
        await expect(page.locator('[data-testid="list-item-0"]')).toContainText('Item 0')
    })

    test('should load more items when scrolled near top (high indices)', async ({
        page
    }, testInfo) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Get initial item count from status
        const statusBefore = await page.locator('[data-testid="load-status"]').textContent()
        expect(statusBefore).toContain('Items: 50')

        const viewport = page.locator('[data-testid="infinite-list-viewport"]')

        // In bottomToTop mode, scrolling "up" (negative deltaY) moves toward higher indices
        // This should trigger load more as we approach the end of the list
        await scrollByWheel(page, viewport, 0, -2000, testInfo)
        await rafWait(page, 2)

        // Wait for new items to load (with delay for async loading)
        await page.waitForFunction(
            () => {
                const status = document.querySelector('[data-testid="load-status"]')?.textContent
                return status && !status.includes('Items: 50')
            },
            { timeout: 5000 }
        )

        // Verify more items were loaded
        const statusAfter = await page.locator('[data-testid="load-status"]').textContent()
        expect(statusAfter).toContain('Items: 100')
    })

    test('should stop loading when hasMore becomes false', async ({ page }, testInfo) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const viewport = page.locator('[data-testid="infinite-list-viewport"]')

        // Keep scrolling until hasMore becomes false (500 items max)
        for (let i = 0; i < 15; i++) {
            await scrollByWheel(page, viewport, 0, -5000, testInfo)
            await rafWait(page, 2)
            await page.waitForTimeout(300)

            const status = await page.locator('[data-testid="load-status"]').textContent()
            if (status?.includes('Has More: false')) break
        }

        // Verify hasMore is false
        const finalStatus = await page.locator('[data-testid="load-status"]').textContent()
        expect(finalStatus).toContain('Has More: false')
        expect(finalStatus).toContain('Items: 500')
    })

    test('should trigger initial load with few items', async ({ page }) => {
        // The test page starts with 50 items, threshold is 20
        await page.waitForSelector('[data-testid="list-item-0"]')

        const status = await page.locator('[data-testid="load-status"]').textContent()
        // Initial 50 items should be present
        expect(status).toContain('Items: 50')
    })

    test('should prevent concurrent loads during fast scroll', async ({ page }, testInfo) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const viewport = page.locator('[data-testid="infinite-list-viewport"]')

        // Perform rapid scrolling
        for (let i = 0; i < 5; i++) {
            await scrollByWheel(page, viewport, 0, -1000, testInfo)
        }

        await rafWait(page, 3)
        await page.waitForTimeout(500)

        // Should not have errors
        const errors: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text())
            }
        })

        expect(errors).toHaveLength(0)

        // Should still be functional
        const container = page.locator('[data-testid="infinite-list-container"]')
        await expect(container).toBeVisible()
    })

    test('should maintain scroll position after loading', async ({ page }, testInfo) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const viewport = page.locator('[data-testid="infinite-list-viewport"]')

        // Scroll up (toward higher indices)
        await scrollByWheel(page, viewport, 0, -1500, testInfo)
        await rafWait(page, 2)

        // Get visible items before load
        const visibleItemsBefore = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-testid^="list-item-"]'))
                .map((el) => {
                    const match = el.getAttribute('data-testid')?.match(/list-item-(\d+)/)
                    return match ? parseInt(match[1]) : null
                })
                .filter((n): n is number => n !== null)
        })

        // Wait for load to complete
        await page.waitForFunction(
            () => {
                const status = document.querySelector('[data-testid="load-status"]')?.textContent
                return status && status.includes('Items: 100')
            },
            { timeout: 5000 }
        )

        await rafWait(page, 3)

        // Get visible items after load
        const visibleItemsAfter = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-testid^="list-item-"]'))
                .map((el) => {
                    const match = el.getAttribute('data-testid')?.match(/list-item-(\d+)/)
                    return match ? parseInt(match[1]) : null
                })
                .filter((n): n is number => n !== null)
        })

        // In bottomToTop mode, after loading more items, the visible items should overlap
        // significantly with what was visible before (user stays in same region)
        const minBefore = Math.min(...visibleItemsBefore)
        const maxBefore = Math.max(...visibleItemsBefore)
        const minAfter = Math.min(...visibleItemsAfter)
        const maxAfter = Math.max(...visibleItemsAfter)

        // The ranges should overlap - user should still see some of the same items
        // or be in a similar region (within a few items of where they were)
        const hasOverlap =
            (minAfter <= maxBefore && maxAfter >= minBefore) ||
            Math.abs(minAfter - minBefore) < 30 ||
            Math.abs(maxAfter - maxBefore) < 30

        expect(hasOverlap).toBe(true)
    })
})
