import { expect, test } from '@playwright/test'
import { readStats, stat } from '../../src/lib/test/utils/statsLine.js'

/**
 * Tail scroll cost — end-of-list scrolling must not pay O(n)
 *
 * Before the block prefix-sum acceleration was wired through the component,
 * every visible-range recompute and transform walked item heights from index
 * 0, so a scroll frame near item 190,000 of a 200,000-item list did ~190,000
 * sparse-object lookups that a frame near the top never paid.
 *
 * The fixture at /tests/other/tail-scroll-cost times 15 identical 1,000px
 * scroll steps at the top (headMs, median) and at ~95% depth (tailMs,
 * median) and reports tail/head as `ratio`. This spec asserts on the
 * fixture's own stats line. The 3x threshold is a generous regression
 * tripwire, not a benchmark — the precise gate is the read-budget unit
 * tests in src/lib/utils/virtualList.perf-budget.test.ts.
 */

test.describe('Tail scroll cost - block-accelerated offset math', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/other/tail-scroll-cost', { waitUntil: 'domcontentloaded' })
        // The fixture auto-runs its probe shortly after mount. Require a
        // digit: the pre-probe placeholder is the dash in "ratio=—".
        await expect(page.locator(stat('tailcost'))).toContainText(/ratio=[\d.]+/, {
            timeout: 25000
        })
    })

    test('scroll steps near the tail cost about the same as near the head', async ({ page }) => {
        const stats = await readStats(page, 'tailcost')

        // Fixture sanity: both medians were actually measured.
        expect(Number.isFinite(stats.headMs)).toBe(true)
        expect(Number.isFinite(stats.tailMs)).toBe(true)

        // The real assertion: scroll depth must not buy back the O(n) walk.
        expect(stats.ratio).toBeLessThan(3)
    })
})
