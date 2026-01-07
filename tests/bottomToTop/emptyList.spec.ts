import { expect, test } from '@playwright/test'

test.describe('BottomToTop Empty List Handling', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/list/bottomToTop/emptyList', { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="empty-list-container"]')
    })

    test('should render with empty items array without errors', async ({ page }) => {
        // Verify the container exists and is visible
        const container = page.locator('[data-testid="empty-list-container"]')
        await expect(container).toBeVisible()

        // Verify the viewport exists
        const viewport = page.locator('[data-testid="empty-list-viewport"]')
        await expect(viewport).toBeVisible()

        // Verify no items are rendered
        const items = page.locator('[data-testid^="list-item-"]')
        await expect(items).toHaveCount(0)

        // Verify item count display shows 0
        const itemCount = page.locator('[data-testid="item-count"]')
        await expect(itemCount).toContainText('Items: 0')

        // Check for console errors
        const errors: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text())
            }
        })

        // Wait a bit to catch any delayed errors
        await page.waitForTimeout(200)
        expect(errors).toHaveLength(0)
    })

    test('should have proper DOM structure when empty', async ({ page }) => {
        // Container should exist
        const container = page.locator('[data-testid="empty-list-container"]')
        await expect(container).toBeVisible()

        // Viewport should exist
        const viewport = page.locator('[data-testid="empty-list-viewport"]')
        await expect(viewport).toBeVisible()

        // Content container should exist
        const content = page.locator('[data-testid="empty-list-content"]')
        await expect(content).toBeVisible()

        // Items container should exist
        const itemsContainer = page.locator('[data-testid="empty-list-items"]')
        await expect(itemsContainer).toBeVisible()

        // Content height should be 0 or minimal when empty
        const contentHeight = await content.evaluate((el) => el.getBoundingClientRect().height)
        expect(contentHeight).toBeLessThanOrEqual(1)
    })

    test('should add items dynamically to empty list in bottomToTop mode', async ({ page }) => {
        // Verify initially empty
        let items = page.locator('[data-testid^="list-item-"]')
        await expect(items).toHaveCount(0)

        // Add a single item
        await page.click('[data-testid="add-single-item"]')
        await page.waitForTimeout(100)

        // Verify item was added
        items = page.locator('[data-testid^="list-item-"]')
        await expect(items).toHaveCount(1)
        await expect(page.locator('[data-testid="list-item-0"]')).toBeVisible()
        await expect(page.locator('[data-testid="item-count"]')).toContainText('Items: 1')

        // In bottomToTop mode, item 0 should be at the bottom of the viewport
        const container = page.locator('[data-testid="test-container"]')
        const item0 = page.locator('[data-testid="list-item-0"]')

        const containerBox = await container.boundingBox()
        const item0Box = await item0.boundingBox()

        expect(containerBox).not.toBeNull()
        expect(item0Box).not.toBeNull()

        if (containerBox && item0Box) {
            // Item should be near the bottom of the container
            const containerBottom = containerBox.y + containerBox.height
            const item0Bottom = item0Box.y + item0Box.height
            expect(Math.abs(containerBottom - item0Bottom)).toBeLessThan(50)
        }
    })

    test('should add many items dynamically to empty list', async ({ page }) => {
        // Verify initially empty
        await expect(page.locator('[data-testid^="list-item-"]')).toHaveCount(0)

        // Add many items
        await page.click('[data-testid="add-many-items"]')
        await page.waitForTimeout(300)

        // Verify items were added (not all 1000 will be rendered due to virtualization)
        const items = page.locator('[data-testid^="list-item-"]')
        const count = await items.count()
        expect(count).toBeGreaterThan(0)
        expect(count).toBeLessThan(100) // Should be virtualized

        // Verify item count display
        await expect(page.locator('[data-testid="item-count"]')).toContainText('Items: 1000')

        // In bottomToTop mode, item 0 should be visible at the bottom initially
        await expect(page.locator('[data-testid="list-item-0"]')).toBeVisible()
    })

    test('should remove all items from populated list', async ({ page }) => {
        // First add items
        await page.click('[data-testid="add-many-items"]')
        await page.waitForTimeout(300)

        // Verify items exist
        let items = page.locator('[data-testid^="list-item-"]')
        expect(await items.count()).toBeGreaterThan(0)

        // Remove all items
        await page.click('[data-testid="remove-all-items"]')
        await page.waitForTimeout(100)

        // Verify all items removed
        items = page.locator('[data-testid^="list-item-"]')
        await expect(items).toHaveCount(0)
        await expect(page.locator('[data-testid="item-count"]')).toContainText('Items: 0')
    })

    test('should handle multiple add/remove cycles in bottomToTop mode', async ({ page }) => {
        // Cycle 1: Add items
        await page.click('[data-testid="add-many-items"]')
        await page.waitForTimeout(200)
        expect(await page.locator('[data-testid^="list-item-"]').count()).toBeGreaterThan(0)

        // Cycle 1: Remove all
        await page.click('[data-testid="remove-all-items"]')
        await page.waitForTimeout(100)
        await expect(page.locator('[data-testid^="list-item-"]')).toHaveCount(0)

        // Cycle 2: Add items again
        await page.click('[data-testid="add-single-item"]')
        await page.waitForTimeout(100)
        await expect(page.locator('[data-testid^="list-item-"]')).toHaveCount(1)

        // Cycle 2: Add more items
        await page.click('[data-testid="add-many-items"]')
        await page.waitForTimeout(200)
        await expect(page.locator('[data-testid="item-count"]')).toContainText('Items: 1001')

        // Cycle 2: Remove all again
        await page.click('[data-testid="remove-all-items"]')
        await page.waitForTimeout(100)
        await expect(page.locator('[data-testid^="list-item-"]')).toHaveCount(0)

        // Verify container is still functional
        const container = page.locator('[data-testid="empty-list-container"]')
        await expect(container).toBeVisible()
    })

    test('should maintain bottomToTop positioning after add/remove cycles', async ({ page }) => {
        // Add items
        await page.click('[data-testid="add-single-item"]')
        await page.click('[data-testid="add-single-item"]')
        await page.click('[data-testid="add-single-item"]')
        await page.waitForTimeout(200)

        // Verify items exist
        await expect(page.locator('[data-testid="item-count"]')).toContainText('Items: 3')

        // In bottomToTop mode, item 0 should be at the bottom
        const item0 = page.locator('[data-testid="list-item-0"]')
        const item2 = page.locator('[data-testid="list-item-2"]')

        const item0Box = await item0.boundingBox()
        const item2Box = await item2.boundingBox()

        expect(item0Box).not.toBeNull()
        expect(item2Box).not.toBeNull()

        if (item0Box && item2Box) {
            // Item 0 should be below item 2 (higher Y value)
            expect(item0Box.y).toBeGreaterThan(item2Box.y)
        }

        // Remove all and add again
        await page.click('[data-testid="remove-all-items"]')
        await page.waitForTimeout(100)

        await page.click('[data-testid="add-single-item"]')
        await page.click('[data-testid="add-single-item"]')
        await page.waitForTimeout(200)

        // Verify positioning is maintained
        const newItem0 = page.locator('[data-testid="list-item-0"]')
        const newItem1 = page.locator('[data-testid="list-item-1"]')

        const newItem0Box = await newItem0.boundingBox()
        const newItem1Box = await newItem1.boundingBox()

        expect(newItem0Box).not.toBeNull()
        expect(newItem1Box).not.toBeNull()

        if (newItem0Box && newItem1Box) {
            // Item 0 should still be below item 1
            expect(newItem0Box.y).toBeGreaterThan(newItem1Box.y)
        }
    })

    test('should have scrollable viewport behavior when empty', async ({ page }) => {
        const viewport = page.locator('[data-testid="empty-list-viewport"]')

        // Get scroll dimensions
        const scrollInfo = await viewport.evaluate((el) => ({
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            scrollTop: el.scrollTop
        }))

        // When empty, scrollHeight should be <= clientHeight (no scrolling needed)
        expect(scrollInfo.scrollHeight).toBeLessThanOrEqual(scrollInfo.clientHeight + 1)
    })

    test('should become scrollable after adding items', async ({ page }) => {
        const viewport = page.locator('[data-testid="empty-list-viewport"]')

        // Initially not scrollable
        let scrollInfo = await viewport.evaluate((el) => ({
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
        }))
        expect(scrollInfo.scrollHeight).toBeLessThanOrEqual(scrollInfo.clientHeight + 1)

        // Add many items
        await page.click('[data-testid="add-many-items"]')
        await page.waitForTimeout(300)

        // Now should be scrollable
        scrollInfo = await viewport.evaluate((el) => ({
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
        }))
        expect(scrollInfo.scrollHeight).toBeGreaterThan(scrollInfo.clientHeight)
    })

    test('should not throw errors when scrolling empty list', async ({ page }) => {
        const errors: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text())
            }
        })

        const viewport = page.locator('[data-testid="empty-list-viewport"]')

        // Try to scroll the empty list
        await viewport.evaluate((el) => {
            el.scrollTop = 100
        })
        await page.waitForTimeout(100)

        await viewport.evaluate((el) => {
            el.scrollTop = 0
        })
        await page.waitForTimeout(100)

        // No errors should have occurred
        expect(errors).toHaveLength(0)
    })
})
