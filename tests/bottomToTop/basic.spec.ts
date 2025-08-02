import { expect, test } from '@playwright/test'

test.describe('Basic BottomToTop Rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/bottomToTop/basic', { waitUntil: 'networkidle' })
    })

    test('should render initial viewport items from higher indices', async ({ page }) => {
        const itemCount = await page.locator('.test-item').count()
        expect(itemCount).toBeGreaterThan(0)

        // In bottomToTop mode, higher index items should be visible initially
        // (Item 0 would be "below" the viewport, requiring scrolling down)
        const visibleItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.test-item')).map((el) => el.textContent)
        })

        // Should see some items, and they should be from higher indices
        expect(visibleItems.length).toBeGreaterThan(0)

        // Check that we're seeing higher index items (not 0, 1, 2...)
        const hasHigherIndexItems = visibleItems.some((text) => {
            const itemNumber = parseInt(text?.match(/Item (\d+)/)?.[1] || '0')
            return itemNumber > 20 // Should see items beyond the first 20
        })
        expect(hasHigherIndexItems).toBe(true)
    })

    test('should render correct item content for visible items', async ({ page }) => {
        // Get the actually visible items and verify they have correct content
        const visibleItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.test-item')).map((el) => ({
                testId: el.getAttribute('data-testid'),
                text: el.textContent
            }))
        })

        // Verify each visible item has correct content
        for (const item of visibleItems.slice(0, 3)) {
            // Check first 3 items
            if (item.testId && item.text) {
                const itemNumber = item.testId.replace('list-item-', '')
                expect(item.text).toBe(`Item ${itemNumber}`)
            }
        }

        expect(visibleItems.length).toBeGreaterThan(0)
    })

    test('should only render items in viewport plus reasonable buffer', async ({ page }) => {
        const renderedItems = await page.evaluate(() => {
            return document.querySelectorAll('.test-item').length
        })

        // With 500px height and ~22px items (defaultEstimatedItemHeight), expect between 20-50 items
        // (viewport items + reasonable buffer on each end)
        expect(renderedItems).toBeGreaterThan(20) // Minimum viewport items
        expect(renderedItems).toBeLessThan(60) // Maximum with buffers

        // Verify we're actually virtualizing
        expect(renderedItems).toBeLessThan(100) // Much less than total items (10000)
    })

    test('should start scrolled to bottom', async ({ page }) => {
        // In bottomToTop mode, the scroll position should be at the bottom initially
        const scrollTop = await page.evaluate(() => {
            const container = document.querySelector('.virtual-list-container') as HTMLElement
            return container?.scrollTop || 0
        })

        // Should be scrolled down significantly (not at 0)
        expect(scrollTop).toBeGreaterThan(0)
    })

    test('should maintain proper DOM structure', async ({ page }) => {
        // Check that the test container exists
        const testContainer = await page.locator('.test-container')
        await expect(testContainer).toBeVisible()

        // Check that the virtual list container exists
        const virtualListContainer = await page.locator('[data-testid="basic-list"]')
        await expect(virtualListContainer).toBeVisible()

        // Check that items are properly nested
        const itemsInContainer = await page.locator('[data-testid="basic-list"] .test-item').count()
        expect(itemsInContainer).toBeGreaterThan(0)
    })

    test('should handle scroll events in bottomToTop mode', async ({ page }) => {
        // Get initial visible items (should be low index items like 0, 1, 2...)
        const initialItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.test-item')).map((el) => el.textContent)
        })

        // Scroll up to reveal higher index items
        await page.evaluate(() => {
            const container = document.querySelector('.virtual-list-container') as HTMLElement
            if (container) {
                container.scrollTop = container.scrollTop + 500
            }
        })

        // Wait for scroll to settle
        await page.waitForTimeout(100)

        // Get new visible items
        const newItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.test-item')).map((el) => el.textContent)
        })

        // Items should have changed after scrolling (should now see higher index items)
        expect(newItems).not.toEqual(initialItems)
    })
})
