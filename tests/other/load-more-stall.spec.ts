import { expect, test } from '@playwright/test'
import { readStats, stat } from '../../src/lib/test/utils/statsLine.js'

/**
 * onLoadMore — a loader that adds nothing is called again forever
 *
 * The component calls onLoadMore whenever the visible range is near the end
 * and no load is in flight. A load that finishes without adding items (an
 * empty page, or a failed request) leaves the range unchanged, so the next
 * reactive pass calls it again: a sync or fast loader spins in a microtask
 * loop and freezes the page, a slower one floods the backend.
 *
 * The fixture at /tests/other/load-more-stall mounts short lists that ask
 * for more on mount. Each loader counts its calls and the fixture breaks
 * the loop at 50 (capped=1). No scrolling happens, so each loader should be
 * called once. List (d) then receives items out of band and must be asked
 * again exactly once; list (e) fails at its end and must retry exactly once
 * when the user scrolls away and back. These specs assert on the fixture's
 * own stats.
 */

test.describe('onLoadMore stall loop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/other/load-more-stall', { waitUntil: 'domcontentloaded' })
        // (e) reports last. Require a digit: the placeholder is a bare dash.
        await expect(page.locator(stat('rescroll'))).toContainText(/afterRescroll=\d/, {
            timeout: 20000
        })
    })

    for (const key of ['syncEmpty', 'asyncEmpty', 'rejected'] as const) {
        test(`${key}: a load that adds nothing is not re-requested`, async ({ page }) => {
            const { calls, capped } = await readStats(page, key)
            expect(capped).toBe(0)
            expect(calls).toBe(1)
        })
    }

    test('recovers: loading resumes once new items arrive', async ({ page }) => {
        const { calls, capped, afterItems } = await readStats(page, 'recovers')
        expect(capped).toBe(0)
        expect(afterItems).toBe(1)
        expect(calls).toBe(2)
    })

    test('rescroll: leaving the end and returning retries once', async ({ page }) => {
        const { calls, capped, afterRescroll } = await readStats(page, 'rescroll')
        expect(capped).toBe(0)
        expect(afterRescroll).toBe(1)
        expect(calls).toBe(2)
    })
})
