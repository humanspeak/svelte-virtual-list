import { expect, test } from '@playwright/test'

const baseUrl = 'http://localhost:5175/'

test.describe('External docs site smoke', () => {
    test('loads homepage and shows demo sections', async ({ page }) => {
        try {
            await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
        } catch {
            test.skip(true, 'Docs dev server not running on ' + baseUrl)
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
        await leftContainer.evaluate((el: HTMLElement) => (el.scrollTop = 0))
        await rightContainer.evaluate((el: HTMLElement) => (el.scrollTop = el.scrollHeight))
        // Let layout settle across engines (double RAF tends to be more reliable than a small timeout)
        await page.evaluate(
            () =>
                new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                )
        )

        const leftItem0 = leftContainer.locator('[data-original-index="0"]').first()
        const rightItem0 = rightContainer.locator('[data-original-index="0"]').first()

        await expect(leftItem0).toBeVisible({ timeout: 5000 })
        await expect(rightItem0).toBeVisible({ timeout: 5000 })

        // Use getBoundingClientRect via evaluate to avoid occasional null boundingBox in Firefox
        const [lItemRect, lContRect, rItemRect, rContRect] = await Promise.all([
            leftItem0.evaluate((el: HTMLElement) => {
                const r = el.getBoundingClientRect()
                return { y: r.y, height: r.height }
            }),
            leftContainer.evaluate((el: HTMLElement) => {
                const r = el.getBoundingClientRect()
                return { y: r.y, height: r.height }
            }),
            rightItem0.evaluate((el: HTMLElement) => {
                const r = el.getBoundingClientRect()
                return { y: r.y, height: r.height }
            }),
            rightContainer.evaluate((el: HTMLElement) => {
                const r = el.getBoundingClientRect()
                return { y: r.y, height: r.height }
            })
        ])

        const tol = 4
        expect(Math.abs(lItemRect.y - lContRect.y)).toBeLessThanOrEqual(tol)
        expect(
            Math.abs(rContRect.y + rContRect.height - (rItemRect.y + rItemRect.height))
        ).toBeLessThanOrEqual(tol)
    })
})
