import { expect, test } from '@playwright/test'
import { readStats, stat } from '../../src/lib/test/utils/statsLine.js'

/**
 * Issue #414 — Keyboard accessibility for the scroll viewport
 *
 * The viewport is a bare overflow-y: scroll div: keyboard users can only
 * operate it where the browser happens to make scrollable divs focusable
 * (Chrome/Firefox do, Safari does not), and assistive tech announces an
 * unlabeled group. The component must expose a labeled role="region", be
 * focusable, and handle the standard scroll keys itself.
 *
 * The fixture at /tests/issues/issue-414 probes everything and reports live
 * pass/fail stats; these specs assert on those numbers. Its key probes use
 * synthetic (untrusted) KeyboardEvents, which browsers never natively
 * scroll from — every pass is the component's own keydown handler,
 * deterministic across engines.
 */

test.describe('Issue 414 - keyboard accessibility for the viewport', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-414', { waitUntil: 'domcontentloaded' })
        // The fixture auto-runs its probes shortly after mount; the key
        // matrix is the last stat to fill in.
        await expect(page.locator(stat('keys'))).toContainText('end=', { timeout: 15000 })
    })

    test('viewport should be focusable', async ({ page }) => {
        await expect(page.locator(stat('focusable'))).toHaveText(/yes/)
    })

    test('viewport should be a labeled region for assistive tech', async ({ page }) => {
        await expect(page.locator(stat('labeled'))).toHaveText(/role=region label=yes/)
    })

    test('viewport should handle all standard scroll keys', async ({ page }) => {
        const keys = await readStats(page, 'keys')

        expect(keys.arrowDown).toBe(1)
        expect(keys.arrowUp).toBe(1)
        expect(keys.pageDown).toBe(1)
        expect(keys.pageUp).toBe(1)
        expect(keys.space).toBe(1)
        expect(keys.shiftSpace).toBe(1)
        expect(keys.home).toBe(1)
        expect(keys.end).toBe(1)
    })
})
