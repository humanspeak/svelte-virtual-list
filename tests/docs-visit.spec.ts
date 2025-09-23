import { expect, test } from '@playwright/test'

test.describe('External docs site smoke', () => {
    test('loads homepage and shows demo sections', async ({ page }) => {
        try {
            await page.goto('http://localhost:5177/', { waitUntil: 'domcontentloaded' })
        } catch {
            test.skip(true, 'Docs dev server not running on http://localhost:5177/')
        }

        await expect(page.getByText('Top to bottom').first()).toBeVisible()
        await expect(page.getByText('Bottom to top').first()).toBeVisible()

        // Ensure list items render
        await expect(page.getByText('Item 0').first()).toBeVisible()

        // Verify both lists have the element with data-original-index="0" in view,
        // left aligned to the top edge and right aligned to the bottom edge of its container.
        const leftContainer = page.locator('[data-testid="top-to-bottom-viewport"]')
        const rightContainer = page.locator('[data-testid="bottom-to-top-viewport"]')

        // Ensure they exist
        await expect(leftContainer).toHaveCount(1)
        await expect(rightContainer).toHaveCount(1)

        // Align left to top and right to bottom, then assert item 0 visibility and alignment
        await leftContainer.evaluate((el) => (el.scrollTop = 0))
        await rightContainer.evaluate((el) => (el.scrollTop = el.scrollHeight))
        await page.waitForTimeout(50)

        const leftItem0 = leftContainer.locator('[data-original-index="0"]').first()
        const rightItem0 = rightContainer.locator('[data-original-index="0"]').first()

        await expect(leftItem0).toBeVisible({ timeout: 5000 })
        await expect(rightItem0).toBeVisible({ timeout: 5000 })

        const [lItemBox, lContBox, rItemBox, rContBox] = await Promise.all([
            leftItem0.boundingBox(),
            leftContainer.boundingBox(),
            rightItem0.boundingBox(),
            rightContainer.boundingBox()
        ])
        expect(lItemBox && lContBox && rItemBox && rContBox).toBeTruthy()
        if (lItemBox && lContBox && rItemBox && rContBox) {
            const tol = 4
            expect(Math.abs(lItemBox.y - lContBox.y)).toBeLessThanOrEqual(tol)
            expect(
                Math.abs(rContBox.y + rContBox.height - (rItemBox.y + rItemBox.height))
            ).toBeLessThanOrEqual(tol)
        }
    })
})
