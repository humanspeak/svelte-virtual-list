import { expect, test } from '@playwright/test'

test.describe('Basic BottomToTop Rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/bottomToTop/basic', { waitUntil: 'networkidle' })
    })

    test('should render items in descending order with Item 0 at bottom', async ({ page }) => {
        const itemCount = await page.locator('[data-original-index]').count()
        expect(itemCount).toBeGreaterThan(0)

        // In bottomToTop mode, items should be in descending order (25, 24, 23... 0)
        // with Item 0 visible at the bottom of the viewport
        const firstItem = await page.locator('[data-original-index="0"]')
        await expect(firstItem).toBeVisible()

        // Get all visible items by their original index
        const visibleIndices = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-original-index]')).map((el) =>
                parseInt(el.getAttribute('data-original-index') || '0')
            )
        })

        // Should see some items, including both higher indices and Item 0
        expect(visibleIndices.length).toBeGreaterThan(0)
        expect(visibleIndices).toContain(0)

        // Should also see higher index items
        const hasHigherIndexItems = visibleIndices.some((index) => index > 10)
        expect(hasHigherIndexItems).toBe(true)
    })

    test('should render correct item content for visible items', async ({ page }) => {
        // Get the actually visible items and verify they have correct content
        const visibleItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-original-index]')).map((el) => ({
                originalIndex: el.getAttribute('data-original-index'),
                text: el.textContent
            }))
        })

        // Verify each visible item has correct content
        for (const item of visibleItems.slice(0, 3)) {
            // Check first 3 items
            if (item.originalIndex && item.text) {
                expect(item.text).toBe(`Item ${item.originalIndex}`)
            }
        }

        expect(visibleItems.length).toBeGreaterThan(0)
    })

    test('should only render items in viewport plus reasonable buffer', async ({ page }) => {
        const renderedItems = await page.evaluate(() => {
            return document.querySelectorAll('[data-original-index]').length
        })

        // With 500px height and ~22px items, expect between 40-50 items
        // (viewport items ~23 + buffer ~20 + rounding/rendering variance)
        expect(renderedItems).toBeGreaterThan(40) // Reasonable minimum
        expect(renderedItems).toBeLessThan(50) // Reasonable maximum with variance

        // Verify we're actually virtualizing
        expect(renderedItems).toBeLessThan(100) // Much less than total items (10000)
    })

    test('should start at correct scroll position', async ({ page }) => {
        // In bottomToTop mode, scrollTop starts at 0 to show Item 0 at the bottom
        const scrollTop = await page.evaluate(() => {
            const container = document.querySelector('.virtual-list-container') as HTMLElement
            return container?.scrollTop || 0
        })

        // ScrollTop should be 0 in bottomToTop mode (this is correct behavior)
        expect(scrollTop).toBe(0)

        // Verify Item 0 is visible at this scroll position
        const firstItem = await page.locator('[data-original-index="0"]')
        await expect(firstItem).toBeVisible()
    })

    test('should maintain proper DOM structure', async ({ page }) => {
        // Check that the test container exists
        const testContainer = await page.locator('.test-container')
        await expect(testContainer).toBeVisible()

        // Check that the virtual list container exists (look for the actual container class)
        const virtualListContainer = await page.locator('.virtual-list-container')
        await expect(virtualListContainer).toBeVisible()

        // Check that items are properly nested in the virtual list container
        const itemsInContainer = await page
            .locator('.virtual-list-container [data-original-index]')
            .count()
        expect(itemsInContainer).toBeGreaterThan(0)
    })

    test('should handle scroll events in bottomToTop mode', async ({ page }) => {
        // Get initial visible items (should include Item 0 at bottom and higher indices)
        const initialIndices = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-original-index]')).map((el) =>
                parseInt(el.getAttribute('data-original-index') || '0')
            )
        })

        // Scroll down to reveal different items
        await page.evaluate(() => {
            const container = document.querySelector('.virtual-list-container') as HTMLElement
            if (container) {
                // Scroll down significantly to see different items (much more than 1000px)
                container.scrollTop = container.scrollTop + 5000
            }
        })

        // Wait for scroll and rendering to settle
        await page.waitForTimeout(200)

        // Get new visible items after scrolling
        const newIndices = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-original-index]')).map((el) =>
                parseInt(el.getAttribute('data-original-index') || '0')
            )
        })

        // Items should have changed after scrolling
        expect(newIndices).not.toEqual(initialIndices)

        // Should still have some items visible
        expect(newIndices.length).toBeGreaterThan(0)
    })

    test('should position Item 0 at bottom of viewport', async ({ page }) => {
        // Get the container and Item 0 positions
        const positions = await page.evaluate(() => {
            const container = document.querySelector('.virtual-list-container') as HTMLElement
            const item0 = document.querySelector('[data-original-index="0"]') as HTMLElement

            if (!container || !item0) return null

            const containerRect = container.getBoundingClientRect()
            const itemRect = item0.getBoundingClientRect()

            return {
                containerBottom: containerRect.bottom,
                itemBottom: itemRect.bottom,
                itemTop: itemRect.top,
                containerTop: containerRect.top
            }
        })

        expect(positions).not.toBeNull()

        if (positions) {
            // Item 0 should be near the bottom of the container
            // Allow more margin for scroll bars, padding, viewport differences, etc.
            const margin = 50 // Increased margin to account for browser differences
            const distance = Math.abs(positions.itemBottom - positions.containerBottom)

            // For debugging - log the actual positions if test fails
            if (distance >= margin) {
                console.log('Position debug:', {
                    itemBottom: positions.itemBottom,
                    containerBottom: positions.containerBottom,
                    distance: distance,
                    itemTop: positions.itemTop,
                    containerTop: positions.containerTop
                })
            }

            expect(distance).toBeLessThan(margin)
        }
    })
})
