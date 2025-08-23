import { expect, test } from '@playwright/test'

const heightsToTest = [10, 36, 100] as const

test.describe('BottomToTop wrong item size alignment', () => {
    for (const itemHeight of heightsToTest) {
        test.describe(`itemHeight=${itemHeight}`, () => {
            test.beforeEach(async ({ page }) => {
                await page.goto(`/tests/bottomToTop/wrongItemSize?itemHeight=${itemHeight}`, {
                    waitUntil: 'networkidle'
                })
                // Allow time for initial measurement/settling
                await page.waitForTimeout(150)
                await page
                    .locator('[data-testid="wrong-item-size-list-viewport"]')
                    .waitFor({ state: 'visible' })
            })

            test('Item 0 should be aligned to the bottom of the viewport', async ({ page }) => {
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
                    const distance = Math.abs(iRect.bottom - vRect.bottom)
                    return { ok: true, distance }
                })

                expect(result.ok, result.reason || 'DOM query failed').toBe(true)
                // Strict target; expected to fail initially for heights 10/100
                expect(result.distance).toBeLessThanOrEqual(1)
            })

            test('After scrolling to top, Item 999 should be aligned to the top', async ({
                page
            }) => {
                // Scroll the viewport to the far end ("top" in bottomToTop semantics)
                await page.evaluate(() => {
                    const viewport = document.querySelector(
                        '[data-testid="wrong-item-size-list-viewport"]'
                    ) as HTMLElement | null
                    if (viewport) viewport.scrollTo({ top: 0 })
                })

                // Wait for potential re-render and measurements
                await page.waitForTimeout(250)

                const target = page.locator('[data-original-index="999"]')
                await target.waitFor({ state: 'visible', timeout: 5000 })

                const result = await page.evaluate(() => {
                    const viewport = document.querySelector(
                        '[data-testid="wrong-item-size-list-viewport"]'
                    ) as HTMLElement | null
                    const itemWrapper = document.querySelector(
                        '[data-original-index="999"]'
                    ) as HTMLElement | null

                    if (!viewport || !itemWrapper) {
                        return { ok: false, reason: 'viewport or item wrapper not found' }
                    }

                    const vRect = viewport.getBoundingClientRect()
                    const iRect = itemWrapper.getBoundingClientRect()
                    const distance = Math.abs(iRect.top - vRect.top)
                    return { ok: true, distance }
                })

                expect(result.ok, result.reason || 'DOM query failed').toBe(true)
                // Strict target; expected to fail initially for heights 10/100
                expect(result.distance).toBeLessThanOrEqual(1)
            })
        })
    }
})
