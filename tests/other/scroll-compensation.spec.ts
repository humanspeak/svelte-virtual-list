import { expect, test } from '@playwright/test'
import { readStats, stat } from '../../src/lib/test/utils/statsLine.js'

/**
 * Scroll compensation — pinned, reading, and smooth-scroll anchoring
 *
 * The component preserves the view through measurement corrections, but
 * competitors (TanStack virtual-core 3.17.9–3.17.11, virtua) also hold it
 * through smooth programmatic scrolls, a growing last item, and keyed
 * mutations: append + trim at a constant count, and prepends.
 *
 * The fixture at /tests/other/scroll-compensation runs its probes on
 * cold-cache keyed lists (40–160px items vs a 40px estimate) and reports
 * how far the thing that should stay still actually moved. 9999 means the
 * tracked item is no longer rendered. These specs assert on those stats.
 *
 * Pre-fix numbers (identical on chromium, firefox, webkit): (c) 735px,
 * (d) 2000px, (e) 1979px — a keyed mutation never compensated scroll.
 */

const TOLERANCE_PX = 2

test.describe('Scroll compensation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/other/scroll-compensation', { waitUntil: 'domcontentloaded' })
        // Probes run sequentially; the last one reporting means all have.
        // Require a digit: the pre-probe placeholder is a bare dash.
        await expect(page.locator(stat('loaderTrim'))).toContainText(/driftPx=\d/, {
            timeout: 30000
        })
    })

    test('(a) smooth scroll lands on target despite mid-flight measurement', async ({ page }) => {
        const { landedPx } = await readStats(page, 'smooth')
        expect(landedPx).toBeLessThanOrEqual(TOLERANCE_PX)
    })

    test('(b) bottom pin survives the last item growing', async ({ page }) => {
        const { pinnedBefore, gapPx } = await readStats(page, 'grow')
        expect(pinnedBefore).toBeLessThanOrEqual(TOLERANCE_PX)
        expect(gapPx).toBeLessThanOrEqual(TOLERANCE_PX)
    })

    test('(c) bottom pin follows a keyed append + trim at constant count', async ({ page }) => {
        const { pinnedBefore, newestOffPx } = await readStats(page, 'followTrim')
        expect(pinnedBefore).toBeLessThanOrEqual(TOLERANCE_PX)
        expect(newestOffPx).toBeLessThanOrEqual(TOLERANCE_PX)
    })

    test('(d) reading position holds through a keyed append + trim', async ({ page }) => {
        const { driftPx } = await readStats(page, 'readTrim')
        expect(driftPx).toBeLessThanOrEqual(TOLERANCE_PX)
    })

    test('(e) reading position holds through a keyed prepend', async ({ page }) => {
        const { driftPx } = await readStats(page, 'readPrepend')
        expect(driftPx).toBeLessThanOrEqual(TOLERANCE_PX)
    })

    test("(f) the next surviving item takes a removed reading item's place", async ({ page }) => {
        const { driftPx } = await readStats(page, 'readRemoved')
        expect(driftPx).toBeLessThanOrEqual(TOLERANCE_PX)
    })

    test('(g) a prepend shows at the start when resting there', async ({ page }) => {
        const { scrollTop, firstOffPx } = await readStats(page, 'startPrepend')
        expect(scrollTop).toBe(0)
        expect(firstOffPx).toBeLessThanOrEqual(TOLERANCE_PX)
    })

    test('(h) an infinite loader holds the reading position at its end', async ({ page }) => {
        const { pinnedBefore, driftPx } = await readStats(page, 'loaderTrim')
        expect(pinnedBefore).toBeLessThanOrEqual(TOLERANCE_PX)
        expect(driftPx).toBeLessThanOrEqual(TOLERANCE_PX)
    })
})
