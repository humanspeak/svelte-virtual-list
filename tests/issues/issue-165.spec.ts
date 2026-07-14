import { expect, test } from '@playwright/test'
import { readStats, stat } from '../../src/lib/test/utils/statsLine.js'

/**
 * Issue #165 — center-aligned programmatic scrolling
 *
 * Before the fix, align: 'center' fell through the scroll-target calculation
 * and returned null, silently leaving the list in place. The fixture scrolls
 * to item 500, reports the absolute delta between its center and the viewport
 * center, then restores a raw 12345px position through scrollToOffset.
 */
test.describe('Issue 165 - center-aligned programmatic scrolling', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-165', { waitUntil: 'domcontentloaded' })
        // Require digits so the initial em-dash placeholders cannot satisfy the waits.
        await expect(page.locator(stat('center'))).toContainText(/centerDeltaPx=\d/, {
            timeout: 15000
        })
        await expect(page.locator(stat('offset'))).toContainText(/scrollTopPx=\d/, {
            timeout: 15000
        })
    })

    test('centers an item and restores a raw pixel offset', async ({ page }) => {
        const center = await readStats(page, 'center')
        expect(center.centerDeltaPx).toBeLessThanOrEqual(2)

        const offset = await readStats(page, 'offset')
        expect(Math.abs(offset.scrollTopPx - 12345)).toBeLessThanOrEqual(2)
    })
})
