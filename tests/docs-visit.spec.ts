import { expect, test, type Page } from '@playwright/test'

const baseUrl = 'http://localhost:5175/'

test.describe('External docs site smoke', () => {
    test('t2b aligns item 0 to top edge', async ({ page }: { page: Page }) => {
        try {
            await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
            await expect(page.getByText('Top to bottom').first()).toBeVisible()
        } catch {
            test.skip(true, 'Docs dev server not running on ' + baseUrl)
        }

        const leftContainer = page.locator('[data-testid="top-to-bottom-viewport"]')
        await expect(leftContainer).toHaveCount(1)

        await leftContainer.evaluate((el: HTMLElement) => (el.scrollTop = 0))
        await page.evaluate(
            () =>
                new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                )
        )

        const leftItem0 = leftContainer.locator('[data-original-index="0"]').first()
        await expect(leftItem0).toBeVisible({ timeout: 5000 })

        const [lItemRect, lContRect] = await Promise.all([
            leftItem0.evaluate((el: HTMLElement) => {
                const r = el.getBoundingClientRect()
                return { y: r.y, height: r.height }
            }),
            leftContainer.evaluate((el: HTMLElement) => {
                const r = el.getBoundingClientRect()
                return { y: r.y, height: r.height }
            })
        ])

        const tol = 4
        expect(Math.abs(lItemRect.y - lContRect.y)).toBeLessThanOrEqual(tol)
    })
})
