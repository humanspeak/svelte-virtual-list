import { expect, test } from '@playwright/test'
import { rafWait, SETTLE_MS } from '../../src/lib/test/utils/rafWait.js'

const VIEWPORT_SELECTOR = '[data-testid="streaming-list-viewport"]'

const getStreamingDebugState = (selector: string) => {
    const viewport = document.querySelector(selector) as
        | (HTMLElement & {
              __svlDebug?: {
                  measuredCount?: number
                  stagedMeasurementCount?: number
                  gapFromBottomPx?: number
              }
          })
        | null
    if (!viewport) return null
    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    return {
        scrollTop: Math.round(viewport.scrollTop),
        maxScroll: Math.round(maxScroll),
        gap: viewport.__svlDebug?.gapFromBottomPx ?? Math.round(maxScroll - viewport.scrollTop),
        measuredCount: viewport.__svlDebug?.measuredCount ?? 0,
        stagedMeasurementCount: viewport.__svlDebug?.stagedMeasurementCount ?? 0
    }
}

const getScrollState = (selector: string) => {
    const viewport = document.querySelector(selector) as HTMLElement | null
    if (!viewport) return null
    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    return {
        scrollTop: Math.round(viewport.scrollTop),
        maxScroll: Math.round(maxScroll),
        gap: Math.round(maxScroll - viewport.scrollTop)
    }
}

test.describe('BottomToTop Streaming Chat', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/list/bottomToTop/streaming', {
            waitUntil: 'domcontentloaded'
        })
        // Wait for component to initialize and measure heights
        await rafWait(page, 3)
        await page.waitForTimeout(SETTLE_MS)
    })

    test('should start fully scrolled to the bottom', async ({ page }) => {
        // Wait for height measurements to stabilize
        await page.waitForTimeout(500)

        const scrollState = await page.evaluate(getScrollState, VIEWPORT_SELECTOR)

        expect(scrollState).not.toBeNull()
        // The list should be within 2px of the maximum scroll position (fully at bottom)
        expect(scrollState!.gap).toBeLessThanOrEqual(2)
    })

    test('should stay locked to bottom after sending a message', async ({ page }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('send-button').click()

        for (const waitMs of [0, 50, 120, 250, 500, 900, 1400]) {
            if (waitMs > 0) {
                await page.waitForTimeout(waitMs)
            }

            const scrollState = await page.evaluate(getScrollState, VIEWPORT_SELECTOR)
            expect(scrollState).not.toBeNull()
            expect(scrollState!.gap).toBeLessThanOrEqual(2)
        }
    })

    test('should stay locked to bottom during stress test bursts', async ({ page }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        for (const waitMs of [0, 50, 120, 250, 500, 900, 1400, 2200, 3200, 4500]) {
            if (waitMs > 0) {
                await page.waitForTimeout(waitMs)
            }

            const scrollState = await page.evaluate(getScrollState, VIEWPORT_SELECTOR)
            expect(scrollState).not.toBeNull()
            expect(scrollState!.gap).toBeLessThanOrEqual(2)
        }
    })

    test('should drain staged measurements when returning to bottom after scrolling away', async ({
        page
    }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        await page.waitForFunction(
            (selector) => {
                const viewport = document.querySelector(selector) as HTMLElement | null
                if (!viewport) return false
                return viewport.scrollHeight - viewport.clientHeight > 800
            },
            VIEWPORT_SELECTOR,
            { timeout: 10000 }
        )

        await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return
            const maxScroll = viewport.scrollHeight - viewport.clientHeight
            viewport.scrollTop = Math.max(0, maxScroll - 600)
            viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)

        await page.waitForFunction(
            (selector) => {
                const debug = (
                    document.querySelector(selector) as
                        | (HTMLElement & {
                              __svlDebug?: {
                                  stagedMeasurementCount?: number
                                  gapFromBottomPx?: number
                              }
                          })
                        | null
                )?.__svlDebug
                return (debug?.stagedMeasurementCount ?? 0) > 0
            },
            VIEWPORT_SELECTOR,
            { timeout: 10000 }
        )

        const awayState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
        expect(awayState).not.toBeNull()
        expect(awayState!.gap).toBeGreaterThan(100)
        expect(awayState!.stagedMeasurementCount).toBeGreaterThan(0)

        await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return
            viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight
            viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)

        await page.waitForFunction(
            (selector) => {
                const viewport = document.querySelector(selector) as
                    | (HTMLElement & {
                          __svlDebug?: {
                              stagedMeasurementCount?: number
                              gapFromBottomPx?: number
                          }
                      })
                    | null
                if (!viewport) return false
                const gap =
                    viewport.__svlDebug?.gapFromBottomPx ??
                    viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
                return (viewport.__svlDebug?.stagedMeasurementCount ?? 0) === 0 && gap <= 2
            },
            VIEWPORT_SELECTOR,
            { timeout: 10000 }
        )

        const finalState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
        expect(finalState).not.toBeNull()
        expect(finalState!.stagedMeasurementCount).toBe(0)
        expect(finalState!.gap).toBeLessThanOrEqual(3)
    })

    test('should allow multiple assistant streams concurrently during stress test', async ({
        page
    }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        await page.waitForFunction(
            () => {
                const status = document.querySelector('[data-testid="stream-status"]')
                const streamingTags = document.querySelectorAll('.streaming-tag')
                const statusText = status?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
                return statusText.includes('Active streams: 5') && streamingTags.length === 5
            },
            undefined,
            { timeout: 10000 }
        )

        await expect(page.locator('.streaming-tag')).toHaveCount(5)
    })

    test('should clear all streaming indicators after stress test completes', async ({ page }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        await page.waitForFunction(
            () => {
                const status = document.querySelector('[data-testid="stream-status"]')
                const streamingTags = document.querySelectorAll('.streaming-tag')
                const statusText = status?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
                return (
                    statusText.includes('Streaming: false') &&
                    statusText.includes('Active streams: 0') &&
                    statusText.includes('Pending starts: 0') &&
                    streamingTags.length === 0
                )
            },
            undefined,
            { timeout: 30000 }
        )

        await expect(page.locator('.streaming-tag')).toHaveCount(0)
    })

    test('should keep rendering items when scrolling upward after stress test completes', async ({
        page
    }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        await page.waitForFunction(
            () => {
                const status = document.querySelector('[data-testid="stream-status"]')
                const statusText = status?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
                return (
                    statusText.includes('Streaming: false') &&
                    statusText.includes('Active streams: 0') &&
                    statusText.includes('Pending starts: 0')
                )
            },
            undefined,
            { timeout: 30000 }
        )

        await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return
            const maxScroll = viewport.scrollHeight - viewport.clientHeight
            viewport.scrollTop = Math.floor(maxScroll * 0.5)
            viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)

        await rafWait(page, 3)
        await page.waitForTimeout(SETTLE_MS)

        const visibleCount = await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return -1
            const viewportRect = viewport.getBoundingClientRect()
            const items = Array.from(document.querySelectorAll('[data-original-index]'))
            return items.filter((item) => {
                const rect = item.getBoundingClientRect()
                return rect.bottom > viewportRect.top && rect.top < viewportRect.bottom
            }).length
        }, VIEWPORT_SELECTOR)

        expect(visibleCount).toBeGreaterThan(0)
    })
})
