import { expect, test, type Page } from '@playwright/test'

const baseUrl = 'http://localhost:5175/'

test.describe('External docs site smoke', () => {
    test.skip(
        !!process.env.CI,
        'Skipped on CI: external docs dev server is non-deterministic in CI'
    )
    test.beforeEach(async ({ page }) => {
        try {
            await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
        } catch {
            test.skip(true, 'Docs dev server not running on ' + baseUrl)
        }
    })

    test('t2b aligns item 0 to top edge', async ({ page }: { page: Page }) => {
        await expect(page.getByText('Top to bottom').first()).toBeVisible()

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

    test('b2t aligns item 0 to bottom edge', async ({ page }: { page: Page }) => {
        await expect(page.getByText('Bottom to top').first()).toBeVisible()

        const rightContainer = page.locator('[data-testid="bottom-to-top-viewport"]')
        await expect(rightContainer).toHaveCount(1)

        await rightContainer.evaluate((el: HTMLElement) => (el.scrollTop = el.scrollHeight))
        await page.evaluate(
            () =>
                new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                )
        )

        const rightItem0 = rightContainer.locator('[data-original-index="0"]').first()
        await expect(rightItem0).toBeVisible({ timeout: 5000 })

        const [rItemRect, rContRect] = await Promise.all([
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
        expect(
            Math.abs(rContRect.y + rContRect.height - (rItemRect.y + rItemRect.height))
        ).toBeLessThanOrEqual(tol)
    })
})
