import { expect, test } from '@playwright/test'
import { readStats, stat } from '../../src/lib/test/utils/statsLine.js'

/**
 * onRangeChange — public visible-range / scroll-edge callback
 *
 * The list exposes a first-class onRangeChange prop that fires whenever the
 * rendered range or the at-top/at-bottom state changes, delivering a trimmed
 * { start, end, atTop, atBottom } payload (no debug gating, no console
 * noise). The fixture at /tests/other/range-callback counts every delivery
 * and records the latest payload, then a probe scrolls the viewport to the
 * bottom. These specs assert on the fixture's own stats.
 */

test.describe('onRangeChange - public range callback', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/other/range-callback', { waitUntil: 'domcontentloaded' })
        // Require a digit: the pre-fire placeholder renders dashes for start.
        await expect(page.locator(stat('range'))).toContainText(/calls=\d/, {
            timeout: 15000
        })
        // Wait for the initial fire to populate a real range (start=0 atTop=1).
        await expect(page.locator(stat('range'))).toContainText(/start=\d/, {
            timeout: 15000
        })
    })

    test('delivers the initial range at the top, then bottom state after scrolling', async ({
        page
    }) => {
        // Initial fire: rendered range starts at 0 and the viewport is at top.
        const initial = await readStats(page, 'range')
        expect(initial.start).toBe(0)
        expect(initial.atTop).toBe(1)
        const initialCalls = initial.calls

        // The probe scrolls the viewport to the bottom; wait for atBottom=1.
        await expect(page.locator(stat('range'))).toContainText(/atBottom=1/, {
            timeout: 15000
        })

        const scrolled = await readStats(page, 'range')
        expect(scrolled.atBottom).toBe(1)
        expect(scrolled.end).toBe(1000)
        expect(scrolled.calls).toBeGreaterThan(initialCalls)
    })

    test('the page judges its own verdicts green once the probe completes', async ({ page }) => {
        // Verdicts resolve only when the probe finishes — require a digit,
        // never the pending placeholder dash.
        await expect(page.locator(stat('final'))).toContainText(/finalPass=\d/, {
            timeout: 15000
        })
        await expect(page.locator(stat('initial'))).toContainText(/initialPass=\d/, {
            timeout: 15000
        })

        // First delivery was the top-of-list range.
        const initial = await readStats(page, 'initial')
        expect(initial.start).toBe(0)
        expect(initial.atTop).toBe(1)
        expect(initial.initialPass).toBe(1)

        // Latest delivery reflects the scrolled-to-bottom state.
        const final = await readStats(page, 'final')
        expect(final.end).toBe(1000)
        expect(final.atBottom).toBe(1)
        expect(final.finalPass).toBe(1)
    })
})
