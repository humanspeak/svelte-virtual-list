import { expect, test } from '@playwright/test'

const heightsToTest = [10, 22, 100] as const

test.describe('BottomToTop wrong item size alignment', () => {
    for (const itemHeight of heightsToTest) {
        test.describe(`itemHeight=${itemHeight}`, () => {
            test.beforeEach(async ({ page }) => {
                await page.goto(`/tests/bottomToTop/wrongItemSize?itemHeight=${itemHeight}`, {
                    waitUntil: 'networkidle'
                })
                // Allow time for initial measurement/settling
                await page.waitForTimeout(150)
                await page.locator('[data-testid="wrong-item-size-list-viewport"]').waitFor({
                    state: 'visible'
                })
            })

            test('Item 0 should be aligned to the bottom of the viewport', async ({ page }) => {
                // Known issue: incorrect defaultEstimatedItemHeight leads to misalignment.
                if (itemHeight !== 22) {
                    test.fail(true, 'Known misalignment when estimate is far from actual height')
                }

                const result = await page.evaluate(() => {
                    const container = document.querySelector(
                        '.virtual-list-container'
                    ) as HTMLElement | null
                    const item0Wrapper = document.querySelector(
                        '[data-original-index="0"]'
                    ) as HTMLElement | null

                    if (!container || !item0Wrapper) {
                        return { ok: false, reason: 'container or item0 wrapper not found' }
                    }

                    const cRect = container.getBoundingClientRect()
                    const iRect = item0Wrapper.getBoundingClientRect()
                    const distance = Math.abs(iRect.bottom - cRect.bottom)
                    return { ok: true, distance, cBottom: cRect.bottom, iBottom: iRect.bottom }
                })

                expect(result.ok, result.reason || 'DOM query failed').toBe(true)
                // Allow a reasonable margin consistent with other bottomToTop tests
                expect(result.distance).toBeLessThan(30)
            })

            test('After scrolling to top, Item 999 should be aligned to the top', async ({
                page
            }) => {
                // Known issue: incorrect defaultEstimatedItemHeight leads to misalignment.
                if (itemHeight !== 22) {
                    test.fail(true, 'Known misalignment when estimate is far from actual height')
                }

                // Scroll the viewport to the far end ("top" in bottomToTop semantics)
                await page.evaluate(() => {
                    const viewport = document.querySelector(
                        '[data-testid="wrong-item-size-list-viewport"]'
                    ) as HTMLElement | null
                    if (viewport) {
                        viewport.scrollTo({ top: viewport.scrollHeight })
                    }
                })

                // Wait for potential re-render and measurements
                await page.waitForTimeout(250)

                const target = page.locator('[data-original-index="999"]')
                await target.waitFor({ state: 'visible', timeout: 5000 })

                const result = await page.evaluate(() => {
                    const container = document.querySelector(
                        '.virtual-list-container'
                    ) as HTMLElement | null
                    const itemWrapper = document.querySelector(
                        '[data-original-index="999"]'
                    ) as HTMLElement | null

                    if (!container || !itemWrapper) {
                        return { ok: false, reason: 'container or item wrapper not found' }
                    }

                    const cRect = container.getBoundingClientRect()
                    const iRect = itemWrapper.getBoundingClientRect()
                    const distance = Math.abs(iRect.top - cRect.top)
                    return { ok: true, distance, cTop: cRect.top, iTop: iRect.top }
                })

                expect(result.ok, result.reason || 'DOM query failed').toBe(true)
                // Allow a reasonable margin consistent with other bottomToTop tests
                expect(result.distance).toBeLessThan(30)
            })
        })
    }
})
