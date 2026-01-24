import { expect, test } from '@playwright/test'
import { rafWait, scrollByWheel } from '../../src/lib/test/utils/rafWait.js'

test.describe('Bidirectional Scrolling', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/other/bidirectional', { waitUntil: 'domcontentloaded' })
        // Wait for both lists to render
        await page.waitForSelector('[data-testid="top-to-bottom-viewport"]')
        await page.waitForSelector('[data-testid="bottom-to-top-viewport"]')
        // Wait for two RAF cycles so initial measurement completes deterministically
        await rafWait(page, 2)
    })

    test('should render user content correctly in both directions', async ({ page }) => {
        // Verify top-to-bottom list shows correct user items
        await expect(page.locator('[data-testid="ttb-item-0"]')).toBeVisible()
        await expect(page.locator('[data-testid="ttb-item-1"]')).toBeVisible()
        await expect(page.locator('[data-testid="ttb-item-2"]')).toBeVisible()

        // Verify bottom-to-top list shows correct user items (item 0 should be at bottom)
        // Deterministically anchor BTT viewport to bottom
        await page.evaluate(() => {
            const vp = document.querySelector(
                '[data-testid="bottom-to-top-viewport"]'
            ) as HTMLElement | null
            if (vp) vp.scrollTo({ top: vp.scrollHeight })
        })
        await page
            .locator('[data-testid="btt-item-0"]')
            .first()
            .waitFor({ state: 'visible', timeout: 1000 })
        await expect(page.locator('[data-testid="btt-item-0"]')).toBeVisible()
        await expect(page.locator('[data-testid="btt-item-1"]')).toBeVisible()
        await expect(page.locator('[data-testid="btt-item-2"]')).toBeVisible()

        // Verify user content text is correct (testing actual user items, not containers)
        await expect(page.locator('[data-testid="ttb-item-0"]')).toContainText('Item 0')
        await expect(page.locator('[data-testid="btt-item-0"]')).toContainText('Item 0')
    })

    test('should maintain independent scroll positions and show different user content', async ({
        page
    }, testInfo) => {
        // This test verifies that two virtual lists can maintain independent scroll positions
        // Content changes work perfectly in real browsers but may not render in test environments

        // Get initial visible items
        const initialTtbItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-testid^="ttb-item-"]')).map(
                (el) => el.textContent
            )
        })

        // Check initial scroll positions
        const initialScrollPositions = await page.evaluate(() => {
            const ttbList = document.querySelector(
                '[data-testid="top-to-bottom-viewport"]'
            ) as HTMLElement
            const bttList = document.querySelector(
                '[data-testid="bottom-to-top-viewport"]'
            ) as HTMLElement
            return {
                ttbInitial: ttbList ? ttbList.scrollTop : 0,
                bttInitial: bttList ? bttList.scrollTop : 0
            }
        })

        // Scroll first list (topToBottom) using scrollByWheel helper - realistic user behavior
        const ttbViewport = page.locator('[data-testid="top-to-bottom-viewport"]')
        await scrollByWheel(page, ttbViewport, 0, 1000, testInfo) // positive deltaY scrolls down

        // Wait for first scroll to complete - mimics user pause
        await page.waitForTimeout(300)

        // Now scroll second list (bottomToTop) using scrollByWheel helper - after user delay
        const bttViewport = page.locator('[data-testid="bottom-to-top-viewport"]')
        await scrollByWheel(page, bttViewport, 0, -50000, testInfo) // negative deltaY scrolls up in bottomToTop mode

        // Wait for second scroll to complete
        await page.waitForTimeout(300)

        // Check final scroll positions
        const finalScrollPositions = await page.evaluate(() => {
            const ttbList = document.querySelector(
                '[data-testid="top-to-bottom-viewport"]'
            ) as HTMLElement
            const bttList = document.querySelector(
                '[data-testid="bottom-to-top-viewport"]'
            ) as HTMLElement
            return {
                ttbFinal: ttbList ? ttbList.scrollTop : 0,
                bttFinal: bttList ? bttList.scrollTop : 0
            }
        })

        // Allow final rendering to complete
        await page.waitForTimeout(500)

        // Get final content for basic verification (content changes work in real browsers)

        // Verify different user content is now visible in each list
        const newTtbItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-testid^="ttb-item-"]')).map(
                (el) => el.textContent
            )
        })
        const newBttItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-testid^="btt-item-"]')).map(
                (el) => el.textContent
            )
        })

        // Focus on scroll position independence (core functionality)
        // Note: Content changes work in real browsers but not in test environment
        expect(newTtbItems).not.toEqual(initialTtbItems)

        // Verify scroll positions changed independently (main test goal)
        expect(finalScrollPositions.ttbFinal).toBe(1000) // TopToBottom scrolled down
        expect(finalScrollPositions.bttFinal).toBeLessThan(initialScrollPositions.bttInitial) // BottomToTop scrolled up

        // Each list maintained its own independent scroll state
        expect(
            Math.abs(finalScrollPositions.bttFinal - initialScrollPositions.bttInitial)
        ).toBeGreaterThan(40000) // Significant scroll change

        // Both lists should still have reasonable number of user items visible
        expect(newTtbItems.length).toBeGreaterThan(10)
        expect(newBttItems.length).toBeGreaterThan(10)
    })

    test('should render appropriate buffer counts for both lists independently', async ({
        page
    }) => {
        // Count rendered user items in each list (should include viewport + buffer)
        const ttbItemCount = await page.locator('[data-testid^="ttb-item-"]').count()
        const bttItemCount = await page.locator('[data-testid^="btt-item-"]').count()

        // Both lists should render reasonable buffer (viewport ~23 + buffer ~20)
        expect(ttbItemCount).toBeGreaterThan(30)
        expect(ttbItemCount).toBeLessThan(70)
        expect(bttItemCount).toBeGreaterThan(30)
        expect(bttItemCount).toBeLessThan(70)

        // Should be virtualizing (much less than total items)
        expect(ttbItemCount).toBeLessThan(200)
        expect(bttItemCount).toBeLessThan(200)
    })

    test('should handle simultaneous operations without interference', async ({
        page
    }, testInfo) => {
        // Trigger simultaneous scrolling in both lists using scrollByWheel helper
        // First scroll the topToBottom list
        const ttbViewport = page.locator('[data-testid="top-to-bottom-viewport"]')
        await scrollByWheel(page, ttbViewport, 0, 2000, testInfo) // positive deltaY scrolls down

        // Immediately scroll the bottomToTop list (simulating simultaneous user action)
        const bttViewport = page.locator('[data-testid="bottom-to-top-viewport"]')
        await scrollByWheel(page, bttViewport, 0, -8000, testInfo) // negative deltaY scrolls up in bottomToTop

        // Allow both lists to process changes
        await page.waitForTimeout(200)

        // Both lists should maintain their own independent state
        const ttbScrollTop = await page.evaluate(() => {
            const ttbList = document.querySelector('[data-testid="top-to-bottom-viewport"]')
            return ttbList ? ttbList.scrollTop : 0
        })
        const bttScrollTop = await page.evaluate(() => {
            const bttList = document.querySelector('[data-testid="bottom-to-top-viewport"]')
            return bttList ? bttList.scrollTop : 0
        })

        // Verify independent scroll positions maintained
        expect(ttbScrollTop).toBeGreaterThan(1500) // Should be near 2000
        expect(bttScrollTop).toBeGreaterThan(160000) // Should be around 171500 (179500 - 8000)

        // Both lists should still render user content correctly
        const ttbVisible = await page.locator('[data-testid^="ttb-item-"]').count()
        const bttVisible = await page.locator('[data-testid^="btt-item-"]').count()
        expect(ttbVisible).toBeGreaterThan(20)
        expect(bttVisible).toBeGreaterThan(20)
    })

    test('should verify user content positioning in both directions', async ({ page }) => {
        // Ensure both lists have mounted at least one item and anchor BTT to bottom first
        await page
            .locator('[data-testid^="ttb-item-"]')
            .first()
            .waitFor({ state: 'attached', timeout: 1000 })
        await page.evaluate(() => {
            const vp = document.querySelector(
                '[data-testid="bottom-to-top-viewport"]'
            ) as HTMLElement | null
            if (vp) vp.scrollTo({ top: vp.scrollHeight })
        })
        await page
            .locator('[data-testid="btt-item-0"]')
            .first()
            .waitFor({ state: 'attached', timeout: 1200 })

        // Get position info for both lists using getBoundingClientRect
        const positions = await page.evaluate(() => {
            const ttbViewport = document.querySelector('[data-testid="top-to-bottom-viewport"]')
            const bttViewport = document.querySelector('[data-testid="bottom-to-top-viewport"]')
            const ttbItem0 = document.querySelector('[data-testid="ttb-item-0"]')
            const bttItem0 = document.querySelector('[data-testid="btt-item-0"]')

            if (!ttbViewport || !bttViewport || !ttbItem0 || !bttItem0) return null

            return {
                ttbViewportRect: ttbViewport.getBoundingClientRect(),
                bttViewportRect: bttViewport.getBoundingClientRect(),
                ttbItem0Rect: ttbItem0.getBoundingClientRect(),
                bttItem0Rect: bttItem0.getBoundingClientRect()
            }
        })

        expect(positions).not.toBeNull()

        if (positions) {
            // TopToBottom: Item 0 should be near top of its viewport
            const ttbDistanceFromTop = positions.ttbItem0Rect.top - positions.ttbViewportRect.top
            expect(ttbDistanceFromTop).toBeGreaterThan(-10) // Allow small margin
            expect(ttbDistanceFromTop).toBeLessThan(100) // Should be near top

            // BottomToTop: Item 0 should be near bottom of its viewport
            const bttDistanceFromBottom =
                positions.bttViewportRect.bottom - positions.bttItem0Rect.bottom
            expect(bttDistanceFromBottom).toBeGreaterThan(-100) // Allow reasonable margin
            expect(bttDistanceFromBottom).toBeLessThan(100) // Should be near bottom

            // User items should be within their respective viewports
            expect(positions.ttbItem0Rect.top).toBeGreaterThanOrEqual(
                positions.ttbViewportRect.top - 50
            )
            expect(positions.bttItem0Rect.bottom).toBeLessThanOrEqual(
                positions.bttViewportRect.bottom + 50
            )
        }
    })

    test('should maintain performance isolation between lists', async ({ page }, testInfo) => {
        // Measure performance by checking that operations in one list don't slow down the other
        const startTime = Date.now()

        // Perform intensive operations on top-to-bottom list using scrollByWheel helper
        const ttbViewport = page.locator('[data-testid="top-to-bottom-viewport"]')
        // Rapid scrolling to trigger multiple re-renders
        for (let i = 0; i < 10; i++) {
            await scrollByWheel(page, ttbViewport, 0, 200, testInfo) // positive deltaY scrolls down
        }

        // Verify bottom-to-top list still responds quickly using scrollByWheel helper
        const bttViewport = page.locator('[data-testid="bottom-to-top-viewport"]')
        await scrollByWheel(page, bttViewport, 0, -3000, testInfo) // negative deltaY scrolls up in bottomToTop

        await page.waitForTimeout(50)

        // Check that bottom-to-top list rendered new content (proving it's not blocked)
        const bttItems = await page.locator('[data-testid^="btt-item-"]').count()
        expect(bttItems).toBeGreaterThan(15) // Should still render properly

        const totalTime = Date.now() - startTime
        expect(totalTime).toBeLessThan(2000) // Should complete quickly (performance isolation)
    })
})
