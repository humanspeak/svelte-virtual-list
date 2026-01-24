import { expect, test } from '@playwright/test'

const heightsToTest = [10, 36, 100] as const

test.describe('TopToBottom wrong item size alignment', () => {
    for (const itemHeight of heightsToTest) {
        test.describe(`itemHeight=${itemHeight}`, () => {
            test.beforeEach(async ({ page }) => {
                await page.goto(`/tests/list/topToBottom/wrongItemSize?itemHeight=${itemHeight}`, {
                    waitUntil: 'domcontentloaded'
                })
                // brief settle for measurements
                await page.waitForTimeout(150)
                await page
                    .locator('[data-testid="wrong-item-size-list-viewport"]')
                    .waitFor({ state: 'visible' })
            })

            test('Item 0 should be aligned to the top of the viewport', async ({ page }) => {
                // Ensure item 0 is attached before measuring
                await page.locator('[data-original-index="0"]').first().waitFor({
                    state: 'attached',
                    timeout: 5000
                })
                await page.waitForFunction(
                    () => {
                        const viewport = document.querySelector(
                            '[data-testid="wrong-item-size-list-viewport"]'
                        ) as HTMLElement | null
                        const item0Wrapper = document.querySelector(
                            '[data-original-index="0"]'
                        ) as HTMLElement | null
                        if (!viewport || !item0Wrapper) return false
                        const vRect = viewport.getBoundingClientRect()
                        const iRect = item0Wrapper.getBoundingClientRect()
                        const distance = Math.abs(iRect.top - vRect.top)
                        return Number.isFinite(distance) && distance <= 1
                    },
                    { timeout: 500 }
                )
                const result = await page.evaluate(() => {
                    const viewport = document.querySelector(
                        '[data-testid="wrong-item-size-list-viewport"]'
                    ) as HTMLElement | null
                    const item0Wrapper = document.querySelector(
                        '[data-original-index="0"]'
                    ) as HTMLElement | null

                    if (!viewport || !item0Wrapper) {
                        return { ok: false, reason: 'viewport or item0 wrapper not found' }
                    }

                    const vRect = viewport.getBoundingClientRect()
                    const iRect = item0Wrapper.getBoundingClientRect()
                    const distance = Math.abs(iRect.top - vRect.top)
                    return { ok: true, distance }
                })

                expect(result.ok, result.reason || 'DOM query failed').toBe(true)
                expect(result.distance).toBeLessThanOrEqual(1)
            })

            test('After scrolling to bottom, Item 999 should be aligned to the bottom', async ({
                page
            }) => {
                await page.evaluate(() => {
                    const viewport = document.querySelector(
                        '[data-testid="wrong-item-size-list-viewport"]'
                    ) as HTMLElement | null
                    if (viewport) viewport.scrollTo({ top: viewport.scrollHeight })
                })

                // Ensure the last item is attached before measuring
                const target = page.locator('[data-original-index="999"]')
                await target.first().waitFor({ state: 'attached', timeout: 500 })

                // Wait for tail force-measure + correction to settle
                await page.waitForFunction(
                    () => {
                        const viewport = document.querySelector(
                            '[data-testid="wrong-item-size-list-viewport"]'
                        ) as HTMLElement | null
                        const itemWrapper = document.querySelector(
                            '[data-original-index="999"]'
                        ) as HTMLElement | null
                        if (!viewport || !itemWrapper) return false
                        const vRect = viewport.getBoundingClientRect()
                        const iRect = itemWrapper.getBoundingClientRect()
                        const distance = Math.abs(iRect.bottom - vRect.bottom)
                        // allow tiny sub-pixel fluctuations
                        return Number.isFinite(distance) && distance <= 1
                    },
                    { timeout: 500 }
                )

                const result = await page.evaluate(() => {
                    const viewport = document.querySelector(
                        '[data-testid="wrong-item-size-list-viewport"]'
                    ) as HTMLElement | null
                    const itemWrapper = document.querySelector(
                        '[data-original-index="999"]'
                    ) as HTMLElement | null
                    if (!viewport || !itemWrapper)
                        return { ok: false, reason: 'viewport or item wrapper not found' }
                    const vRect = viewport.getBoundingClientRect()
                    const iRect = itemWrapper.getBoundingClientRect()
                    return { ok: true, distance: Math.abs(iRect.bottom - vRect.bottom) }
                })

                expect(result.ok, result.reason || 'DOM query failed').toBe(true)
                expect(result.distance).toBeLessThanOrEqual(1)
            })
        })
    }
})
