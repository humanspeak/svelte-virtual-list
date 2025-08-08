import { expect, test } from '@playwright/test'

test.describe('Basic Rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/basic', { waitUntil: 'networkidle' })
    })

    test('should render initial viewport items', async ({ page }) => {
        const itemCount = await page.locator('[data-original-index]').count()
        expect(itemCount).toBeGreaterThan(0)

        // Check if items are actually visible
        const firstItem = await page.locator('[data-original-index="0"]')
        await expect(firstItem).toBeVisible()
    })

    test('should render correct item content', async ({ page }) => {
        await expect(page.locator('[data-original-index="0"]')).toHaveText('Item 0')
        await expect(page.locator('[data-original-index="1"]')).toHaveText('Item 1')
    })

    test('should only render items in viewport plus reasonable buffer', async ({ page }) => {
        const renderedItems = await page.evaluate(() => {
            return document.querySelectorAll('[data-original-index]').length
        })

        // With 500px height and ~22px items, expect between 40-50 items
        // (viewport items ~23 + buffer ~20 + rounding/rendering variance)
        expect(renderedItems).toBeGreaterThan(40) // Reasonable minimum
        expect(renderedItems).toBeLessThan(50) // Reasonable maximum with variance
    })

    test('should render buffered items outside viewport that are not visible', async ({ page }) => {
        // Verify virtualization: item 28 should be rendered but not visible in viewport
        const isItem28Visible = await page.evaluate(() => {
            const viewport = document.querySelector('.virtual-list-container') as HTMLElement
            const item28 = document.querySelector('[data-original-index="28"]') as HTMLElement

            if (!viewport || !item28) {
                return false // Item 28 not rendered or viewport not found
            }

            const viewportRect = viewport.getBoundingClientRect()
            const itemRect = item28.getBoundingClientRect()

            // Check if item is visible within viewport bounds
            const isVisible =
                itemRect.bottom > viewportRect.top &&
                itemRect.top < viewportRect.bottom &&
                itemRect.right > viewportRect.left &&
                itemRect.left < viewportRect.right

            return isVisible
        })

        // Item 28 should exist in DOM (rendered) but not be visible in 500px viewport
        const item28Exists = await page.locator('[data-original-index="28"]').count()
        expect(item28Exists).toBe(1) // Item 28 should be rendered
        expect(isItem28Visible).toBe(false) // But not visible in viewport
    })
})
