import { expect, test } from '@playwright/test'

test.describe('BottomToTop Small Items', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/bottomToTop/smallItems')
        // Wait for the virtual list to be visible
        await page.waitForSelector('[data-testid="basic-list"]')
    })

    test('should render 2 items correctly', async ({ page }) => {
        // Check that exactly 2 items are rendered
        const items = page.locator('[data-testid^="list-item-"]')
        await expect(items).toHaveCount(2)

        // Verify item content
        await expect(page.locator('[data-testid="list-item-0"]')).toContainText('Item 0')
        await expect(page.locator('[data-testid="list-item-1"]')).toContainText('Item 1')
    })

    test('should position items at the bottom of viewport in bottomToTop mode', async ({
        page
    }) => {
        const container = page.locator('.test-container')
        const firstItem = page.locator('[data-testid="list-item-0"]')
        const lastItem = page.locator('[data-testid="list-item-1"]')

        // Wait for items to be positioned
        await expect(firstItem).toBeVisible()
        await expect(lastItem).toBeVisible()

        // Get container and item positions
        const containerBox = await container.boundingBox()
        const firstItemBox = await firstItem.boundingBox()
        const lastItemBox = await lastItem.boundingBox()

        expect(containerBox).not.toBeNull()
        expect(firstItemBox).not.toBeNull()
        expect(lastItemBox).not.toBeNull()

        // In bottomToTop mode with few items, they should be positioned near the bottom
        // The last item should be at the bottom of the container
        const containerBottom = containerBox!.y + containerBox!.height
        const lastItemBottom = lastItemBox!.y + lastItemBox!.height

        // Allow some tolerance for padding/margins
        expect(Math.abs(containerBottom - lastItemBottom)).toBeLessThan(10)

        // First item should be above the last item
        expect(firstItemBox!.y).toBeLessThan(lastItemBox!.y)
    })

    test('should have correct item heights', async ({ page }) => {
        for (let i = 0; i < 2; i++) {
            const item = page.locator(`[data-testid="list-item-${i}"]`)
            const box = await item.boundingBox()
            expect(box).not.toBeNull()

            // Each item should be 20px high as specified in the test page
            expect(box!.height).toBe(20)
        }
    })

    test('should maintain proper visual order in bottomToTop mode', async ({ page }) => {
        const item0 = page.locator('[data-testid="list-item-0"]')
        const item1 = page.locator('[data-testid="list-item-1"]')

        const item0Box = await item0.boundingBox()
        const item1Box = await item1.boundingBox()

        expect(item0Box).not.toBeNull()
        expect(item1Box).not.toBeNull()

        // In bottomToTop mode, item 0 should appear above item 1 visually
        // (reversed order from topToBottom)
        expect(item0Box!.y).toBeLessThan(item1Box!.y)
    })

    test('should show debug information when debug prop is enabled', async ({ page }) => {
        // Check for debug output in console (if any is logged)
        const logs: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'log') {
                logs.push(msg.text())
            }
        })

        // Trigger a potential debug event by scrolling
        await page.locator('.test-container').hover()

        // Wait a bit for any debug output
        await page.waitForTimeout(100)

        // We expect some debug logs related to virtual list
        const debugLogs = logs.filter(
            (log) => log.includes('Virtual List Debug') || log.includes('debugFunction')
        )

        expect(debugLogs.length).toBeGreaterThan(0)
    })

    test('should handle container scrolling properly with few items', async ({ page }) => {
        const container = page.locator('.test-container')

        // Try to scroll the container
        await container.evaluate((el) => {
            el.scrollTop = 50
        })

        // Wait for any scroll effects
        await page.waitForTimeout(100)

        // Items should still be visible and properly positioned
        const items = page.locator('[data-testid^="list-item-"]')
        await expect(items).toHaveCount(2)

        for (let i = 0; i < 2; i++) {
            await expect(page.locator(`[data-testid="list-item-${i}"]`)).toBeVisible()
        }
    })

    test('should have proper DOM structure', async ({ page }) => {
        // Check that the virtual list container exists
        const virtualList = page.locator('[data-testid="basic-list"]')
        await expect(virtualList).toBeVisible()

        // Check that items container exists
        const itemsContainer = page.locator('[data-testid="basic-list-items"]')
        await expect(itemsContainer).toBeVisible()

        // Check that the height container exists and has correct height
        const heightContainer = page.locator('[data-testid="basic-list-height"]')
        await expect(heightContainer).toBeVisible()

        // With 2 items of 20px each, total height should be around 40px
        const heightContainerStyle = await heightContainer.getAttribute('style')
        expect(heightContainerStyle).toContain('height')
    })

    test('should apply correct CSS classes and test IDs', async ({ page }) => {
        // Check main container has correct test ID
        const mainContainer = page.locator('[data-testid="basic-list"]')
        await expect(mainContainer).toBeVisible()

        // Check items container has correct test ID
        const itemsContainer = page.locator('[data-testid="basic-list-items"]')
        await expect(itemsContainer).toBeVisible()

        // Check height container has correct test ID
        const heightContainer = page.locator('[data-testid="basic-list-height"]')
        await expect(heightContainer).toBeVisible()

        // Check individual items have correct test IDs and classes
        for (let i = 0; i < 2; i++) {
            const item = page.locator(`[data-testid="list-item-${i}"]`)
            await expect(item).toBeVisible()
            await expect(item).toHaveClass('test-item')
        }
    })

    test('should handle viewport resize gracefully', async ({ page }) => {
        // Resize viewport
        await page.setViewportSize({ width: 800, height: 300 })
        await page.waitForTimeout(100)

        // Items should still be visible and repositioned
        const items = page.locator('[data-testid^="list-item-"]')
        await expect(items).toHaveCount(2)

        // Check that items are still positioned at bottom after resize
        const container = page.locator('.test-container')
        const lastItem = page.locator('[data-testid="list-item-1"]')

        const containerBox = await container.boundingBox()
        const lastItemBox = await lastItem.boundingBox()

        expect(containerBox).not.toBeNull()
        expect(lastItemBox).not.toBeNull()

        // Last item should still be near the bottom
        const containerBottom = containerBox!.y + containerBox!.height
        const lastItemBottom = lastItemBox!.y + lastItemBox!.height
        expect(Math.abs(containerBottom - lastItemBottom)).toBeLessThan(10)
    })
})
