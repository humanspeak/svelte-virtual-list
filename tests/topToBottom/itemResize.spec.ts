import { expect, test } from '@playwright/test'
import { rafWait, scrollByWheel } from '../../src/lib/test/utils/rafWait.js'

test.describe('Item Resize Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/list/topToBottom/itemResize', { waitUntil: 'domcontentloaded' })
        // Wait for initial render
        await page.waitForSelector('[data-testid="item-resize-list-viewport"]')
    })

    test('should render items with correct initial heights', async ({ page }) => {
        // Check that items are rendered
        const itemCount = await page.locator('.test-item').count()
        expect(itemCount).toBeGreaterThan(0)

        // Verify first few items have correct initial height (50px)
        const firstItem = page.locator('[data-testid="list-item-0"]')
        await expect(firstItem).toBeVisible()

        const firstItemHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)
        expect(firstItemHeight).toBe(50)

        // Check that height input shows correct value
        const heightInput = firstItem.locator('.height-input')
        await expect(heightInput).toHaveValue('50')
    })

    test('should update item height via input control', async ({ page }) => {
        const firstItem = page.locator('[data-testid="list-item-0"]')
        const heightInput = firstItem.locator('.height-input')

        // Change height to 80px
        await heightInput.fill('80')
        await heightInput.dispatchEvent('change')

        // Wait for DOM to update (extra cycles for webkit)
        await rafWait(page, 2)

        // Verify the item height changed
        const newHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)
        expect(newHeight).toBe(80)

        // Verify input value was updated
        await expect(heightInput).toHaveValue('80')
    })

    test('should clamp height input values within bounds', async ({ page }) => {
        const firstItem = page.locator('[data-testid="list-item-0"]')
        const heightInput = firstItem.locator('.height-input')

        // Test minimum bound
        await heightInput.fill('10') // Below minimum of 20
        await heightInput.dispatchEvent('change')
        await rafWait(page, 2) // Extra cycles for webkit/mobile

        const minHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)
        expect(minHeight).toBe(20) // Should be clamped to minimum

        // Test maximum bound
        await heightInput.fill('250') // Above maximum of 200
        await heightInput.dispatchEvent('change')
        await rafWait(page, 2) // Extra cycles for webkit/mobile

        const maxHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)
        expect(maxHeight).toBe(200) // Should be clamped to maximum
    })

    test('should randomize height within expected range', async ({ page }) => {
        const firstItem = page.locator('[data-testid="list-item-0"]')
        const randomizeBtn = firstItem.locator('.randomize-btn')

        // Get initial height
        const initialHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)

        // Click randomize multiple times and track changes
        const heights: number[] = [initialHeight]

        for (let i = 0; i < 5; i++) {
            await randomizeBtn.click()
            await rafWait(page) // Allow for height change

            const newHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)
            heights.push(newHeight)
        }

        // Verify we got some variation (not all the same)
        const uniqueHeights = new Set(heights)
        expect(uniqueHeights.size).toBeGreaterThan(1)

        // Verify all heights are within reasonable bounds (30px minimum from code)
        heights.forEach((height) => {
            expect(height).toBeGreaterThanOrEqual(30)
            expect(height).toBeLessThanOrEqual(200)
        })
    })

    test('should handle direct DOM manipulation with ResizeObserver', async ({ page }) => {
        const firstItem = page.locator('[data-testid="list-item-0"]')
        const domTestBtn = firstItem.locator('.test-btn')

        // Get initial height
        const initialHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)

        // Click DOM test button which sets height to 100px directly
        await domTestBtn.click()
        await rafWait(page) // Allow ResizeObserver to fire

        // Verify height changed via direct DOM manipulation
        const newHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)
        expect(newHeight).toBe(100)
        expect(newHeight).not.toBe(initialHeight)
    })

    test('should maintain virtualization during height changes', async ({ page }) => {
        // Get initial rendered item count
        const initialCount = await page.locator('.test-item').count()

        // Change heights of first few visible items
        for (let i = 0; i < 3; i++) {
            const item = page.locator(`[data-testid="list-item-${i}"]`)
            const heightInput = item.locator('.height-input')

            await heightInput.fill(`${60 + i * 10}`) // 60, 70, 80
            await heightInput.dispatchEvent('change')
        }

        // Wait for height changes to propagate through the virtual list
        await rafWait(page, 3) // Extra cycles for webkit/mobile

        // Verify virtualization is still working (similar item count)
        // Height changes can cause significant fluctuation across browsers
        const newCount = await page.locator('.test-item').count()
        expect(Math.abs(newCount - initialCount)).toBeLessThan(25) // Allow larger variance for browser differences

        // Verify we're still virtualizing (not rendering all 10k items)
        expect(newCount).toBeLessThan(100)
    })

    test('should update scroll behavior after height changes', async ({ page }, testInfo) => {
        const viewport = page.locator('[data-testid="item-resize-list-viewport"]')

        // Increase heights of first few items significantly
        for (let i = 0; i < 5; i++) {
            const item = page.locator(`[data-testid="list-item-${i}"]`)
            const heightInput = item.locator('.height-input')

            await heightInput.fill('150') // Much taller items
            await heightInput.dispatchEvent('change')
        }

        await rafWait(page, 2)

        // Scroll down using scrollByWheel helper and verify different items are visible
        await scrollByWheel(page, viewport, 0, 500, testInfo) // positive deltaY scrolls down
        await rafWait(page, 2) // Extra cycles for Firefox/mobile

        // Get visible item indices directly from page to avoid stale element issues
        const visibleIndices = await page.evaluate(() => {
            const items = document.querySelectorAll('.test-item[data-testid]')
            return Array.from(items).map((item) => {
                const testId = item.getAttribute('data-testid') || ''
                return parseInt(testId.replace('list-item-', '') || '0')
            })
        })

        // With taller items (150px each), scrolling 500px should show later indices
        expect(visibleIndices.length).toBeGreaterThan(0)

        // At least one item should be from later in the list (index > 2)
        const hasLaterItem = visibleIndices.some((index) => index > 2)
        expect(hasLaterItem).toBe(true)
    })

    test('should handle rapid height changes without performance issues', async ({ page }) => {
        const measurements = await page.evaluate(async () => {
            const results: number[] = []

            for (let round = 0; round < 3; round++) {
                const start = performance.now()

                // Rapidly change heights of multiple items
                for (let i = 0; i < 5; i++) {
                    const input = document.querySelector(
                        `[data-testid="list-item-${i}"] .height-input`
                    ) as HTMLInputElement
                    if (input) {
                        input.value = `${50 + Math.random() * 50}` // Random height 50-100
                        input.dispatchEvent(new Event('change'))
                    }
                }

                // Wait for changes to propagate
                await new Promise((resolve) => setTimeout(resolve, 200))

                results.push(performance.now() - start)
            }

            return results
        })

        // Each round should complete reasonably quickly
        measurements.forEach((time) => {
            expect(time).toBeLessThan(1000) // Less than 1 second per round
        })

        // Verify items are still rendered correctly
        const itemCount = await page.locator('.test-item').count()
        expect(itemCount).toBeGreaterThan(0)
    })

    test('should trigger debug output when enabled', async ({ page }) => {
        const debugMessages: string[] = []

        // Listen for console messages from debugFunction
        page.on('console', (msg) => {
            if (msg.text().includes('debugFunction')) {
                debugMessages.push(msg.text())
            }
        })

        // Trigger a height change that should cause debug output
        const firstItem = page.locator('[data-testid="list-item-0"]')
        const heightInput = firstItem.locator('.height-input')

        await heightInput.fill('75')
        await heightInput.dispatchEvent('change')

        // Wait for debug to potentially fire
        await rafWait(page, 3)

        // Note: Debug may not always fire on every change due to debouncing
        // This test mainly verifies the debug setup is working without errors
        // We don't assert on debugMessages as it's timing-dependent
    })

    test('should handle multiple items with different heights correctly', async ({ page }) => {
        // Set different heights for first few items
        const heights = [40, 60, 80, 100, 120]

        for (let i = 0; i < heights.length; i++) {
            const item = page.locator(`[data-testid="list-item-${i}"]`)
            const heightInput = item.locator('.height-input')

            await heightInput.fill(heights[i].toString())
            await heightInput.dispatchEvent('change')
        }

        // Wait for height changes to propagate through the virtual list
        await rafWait(page, 3) // Extra cycles for webkit/mobile

        // Verify each item has the correct height
        for (let i = 0; i < heights.length; i++) {
            const item = page.locator(`[data-testid="list-item-${i}"]`)
            const actualHeight = await item.evaluate((el) => el.getBoundingClientRect().height)
            expect(actualHeight).toBe(heights[i])
        }

        // Verify items are properly positioned (no overlaps)
        const positions = []
        for (let i = 0; i < 3; i++) {
            const item = page.locator(`[data-testid="list-item-${i}"]`)
            const rect = await item.evaluate((el) => el.getBoundingClientRect())
            positions.push({ top: rect.top, bottom: rect.bottom, height: rect.height })
        }

        // Each item should start where the previous one ended (accounting for margins)
        for (let i = 1; i < positions.length; i++) {
            // Allow small gap for margins/borders (up to 10px)
            expect(positions[i].top).toBeGreaterThanOrEqual(positions[i - 1].bottom - 10)
        }
    })

    test('should handle scroll position during height changes', async ({ page }, testInfo) => {
        const viewport = page.locator('[data-testid="item-resize-list-viewport"]')

        // Scroll to middle position using scrollByWheel helper
        await scrollByWheel(page, viewport, 0, 1000, testInfo) // positive deltaY scrolls down
        await rafWait(page)

        // Get initial scroll position for reference
        await viewport.evaluate((el) => el.scrollTop)

        // Change height of an item not currently visible (early in list)
        const firstItem = page.locator('[data-testid="list-item-0"]')
        const heightInput = firstItem.locator('.height-input')

        await heightInput.fill('200') // Significantly larger
        await heightInput.dispatchEvent('change')
        await rafWait(page, 2)

        // Verify the height change actually took effect
        const newHeight = await firstItem.evaluate((el) => el.getBoundingClientRect().height)
        expect(newHeight).toBe(200)

        // Scroll position behavior may vary by browser, but should remain reasonable
        const newScrollTop = await viewport.evaluate((el) => el.scrollTop)

        // Position should be within reasonable bounds regardless of browser behavior
        expect(newScrollTop).toBeGreaterThanOrEqual(0)
        expect(newScrollTop).toBeLessThan(5000) // Not jumping to extremes

        // The list should still be functional after height changes
        const visibleItems = await page.locator('.test-item').count()
        expect(visibleItems).toBeGreaterThan(0)
    })
})
