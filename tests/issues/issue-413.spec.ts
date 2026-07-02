import { expect, test, type Page } from '@playwright/test'

/**
 * Issue #413 — Estimate-miss corrections paint visible jumps while
 * scrolling the backlog
 *
 * Heights are estimated until items are measured. The fixture's items cycle
 * through 64/96/128/512/700px, so the average estimate converges to the
 * cycle mean (~300px) while every individual unmeasured item is wrong by up
 * to 400px — variable heights mean the misses cannot self-heal. Scrolling
 * up through never-measured backlog forces a correction on nearly every
 * item; each one shifts all content below it by the full estimate error.
 * The component preserves position only at the bottom — mid-list there is
 * no anchor restore at all (and overflow-anchor: none disables the
 * browser's own) — so every correction paints as a lurch.
 *
 * The fixture at /tests/issues/issue-413 measures everything itself and
 * reports live pass/fail stats; these specs assert on those numbers so the
 * page a human debugs and the numbers CI enforces can never diverge.
 */

const JUMP_TOLERANCE_PX = 3
const MIN_SWEEP_SAMPLES = 15

const stat = (name: string) => `[data-testid="stat-${name}"]`

/** Parse the sweep stats line, e.g. "jumps=0 maxJumpPx=0 totalJumpPx=0 samples=24". */
const readSweep = async (page: Page): Promise<Record<string, number>> => {
    const text = await page.locator(stat('sweep')).innerText()
    return Object.fromEntries(
        [...text.matchAll(/(\w+)=([\d.]+)/g)].map((m) => [m[1], parseFloat(m[2])])
    )
}

test.describe('Issue 413 - estimate-miss corrections while scrolling backlog', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-413', { waitUntil: 'domcontentloaded' })
        // The fixture auto-runs its backlog sweep after the component's
        // measurement pass settles; wait for the full cycle.
        await expect(page.locator(stat('sweep'))).toContainText('maxJumpPx=', {
            timeout: 20000
        })
    })

    /**
     * Fixture sanity: rendered wrappers must be exactly their declared cycle
     * height, so any painted jump the sweep records is attributable to
     * estimate-miss corrections rather than the fixture's own layout.
     */
    test('rendered heights should match declared heights', async ({ page }) => {
        await expect(page.locator(stat('heights-match'))).toHaveText(/yes/)
    })

    /**
     * Scrolling up through unmeasured backlog must not paint jumps: each
     * estimate-miss correction has to be hidden by restoring the visual
     * anchor before paint. Pre-fix, corrections shift content below the
     * measured item while scrollTop stays put, so the tracked item lurches
     * by (a batch of) the per-item estimate error on step after step.
     */
    test('estimate corrections should not paint jumps while scrolling backlog', async ({
        page
    }) => {
        const sweep = await readSweep(page)

        // Ensure the sweep actually measured movement rather than vacuously passing.
        expect(sweep.samples).toBeGreaterThan(MIN_SWEEP_SAMPLES)
        expect(sweep.jumps).toBe(0)
        expect(sweep.maxJumpPx).toBeLessThanOrEqual(JUMP_TOLERANCE_PX)
    })
})
