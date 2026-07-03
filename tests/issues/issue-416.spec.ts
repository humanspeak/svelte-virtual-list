import { expect, test } from '@playwright/test'
import { readStats, stat } from '../../src/lib/test/utils/statsLine.js'

/**
 * Issue #416 — Container resizes are ignored
 *
 * The container ResizeObserver handler early-returns unless
 * heightManager.initialized is true, and that flag's only writer is a
 * callback passed to a utility that never calls it — so it is false for the
 * lifetime of every instance and container resizes are silently dropped.
 * The internal viewport height is only read once shortly after mount:
 * growing the container leaves the render window sized for the stale
 * height, painting an unfilled region at the bottom of the viewport.
 *
 * The fixture at /tests/issues/issue-416 settles a list at 300px, grows the
 * container to 900px, waits well past ResizeObserver latency, and measures
 * coverage (viewport height minus the union of rendered item rects). It
 * uses bufferSize=2 — the default 20-item buffer masks ~800px of missed
 * growth. These specs assert on the fixture's own stats.
 */

test.describe('Issue 416 - container resizes are ignored', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-416', { waitUntil: 'domcontentloaded' })
        // The fixture auto-runs its grow probe shortly after mount. Require
        // a digit: the pre-probe placeholder is the dash in "blankPx=—".
        await expect(page.locator(stat('coverage'))).toContainText(/blankPx=\d/, {
            timeout: 15000
        })
    })

    test('rendered items fill the viewport after the container grows', async ({ page }) => {
        // Fixture sanity: the container really grew to 900px.
        const grown = await readStats(page, 'grown')
        expect(grown.clientHeight).toBe(900)

        // The real assertion: every unfilled px is the resize the component
        // ignored. Pre-fix this reads ~460px.
        const coverage = await readStats(page, 'coverage')
        expect(coverage.blankPx).toBe(0)
    })
})
