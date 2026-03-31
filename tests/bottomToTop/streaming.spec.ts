import { expect, test } from '@playwright/test'
import { rafWait, SETTLE_MS } from '../../src/lib/test/utils/rafWait.js'

const VIEWPORT_SELECTOR = '[data-testid="streaming-list-viewport"]'

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
})
