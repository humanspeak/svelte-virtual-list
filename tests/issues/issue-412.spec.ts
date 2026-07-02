import { expect, test, type Page } from '@playwright/test'

/**
 * Issue #412 — Item margins escape height measurement
 *
 * Item heights were measured as the wrapper's border box, which excludes
 * margins. The fixture's items are a 100px border box with margin: 12px 0
 * that collapses through the component's unstyled item wrappers, so the
 * real layout pitch (offsetTop delta between neighboring wrappers) is
 * 112px while a border-box measurement reads 100px.
 *
 * The fixture at /tests/issues/issue-412 measures everything itself and
 * reports live pass/fail stats; these specs assert on those numbers so the
 * page a human debugs and the numbers CI enforces can never diverge.
 *
 * Consequences pinned:
 * 1. totalHeight ran ~12px/item short — cache-implied pitch (scrollHeight
 *    ÷ itemCount) disagreed with the rendered layout pitch by exactly the
 *    lost margin (pre-fix: marginLoss=12px, 6,000px of content missing).
 * 2. Content visibly jumped by the lost margin whenever the render-range
 *    start advanced while scrolling (pre-fix: maxJumpPx=24, totalJumpPx=324
 *    across a 25-step one-pitch-per-step sweep).
 */

const REAL_PITCH_PX = 112
const PITCH_TOLERANCE_PX = 1.5
const JUMP_TOLERANCE_PX = 3
const MIN_SWEEP_SAMPLES = 15

const stat = (name: string) => `[data-testid="stat-${name}"]`

const readPx = async (page: Page, name: string): Promise<number> =>
    parseFloat((await page.locator(stat(name)).innerText()).replace('px', ''))

/** Parse the sweep stats line, e.g. "jumps=0 maxJumpPx=0 totalJumpPx=0 samples=24". */
const readSweep = async (page: Page): Promise<Record<string, number>> => {
    const text = await page.locator(stat('sweep')).innerText()
    return Object.fromEntries(
        [...text.matchAll(/(\w+)=([\d.]+)/g)].map((m) => [m[1], parseFloat(m[2])])
    )
}

test.describe('Issue 412 - margins escape item height measurement', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-412', { waitUntil: 'domcontentloaded' })
        // The fixture auto-measures after the component's measurement pass
        // settles, then runs its scroll sweep; wait for the full cycle.
        await expect(page.locator(stat('sweep'))).toContainText('maxJumpPx=', {
            timeout: 15000
        })
    })

    /**
     * The pitch implied by the height cache must match the rendered layout
     * pitch. Pre-fix: marginLoss reads exactly 12px (the collapsed margin)
     * and 6,000px of scrollable content is missing on this fixture.
     */
    test('cache-implied pitch should match rendered layout pitch', async ({ page }) => {
        // Fixture sanity: the collapsed margins really are in the layout.
        expect(await readPx(page, 'real-pitch')).toBe(REAL_PITCH_PX)

        const cachePitch = await readPx(page, 'cache-pitch')
        expect(Math.abs(cachePitch - REAL_PITCH_PX)).toBeLessThanOrEqual(PITCH_TOLERANCE_PX)

        // Allow a bounded residual: the leading collapsed margin belongs to no
        // pitch (a constant ≤ one margin across the whole list).
        expect(Math.abs(await readPx(page, 'margin-loss'))).toBeLessThanOrEqual(PITCH_TOLERANCE_PX)
    })

    /**
     * Scrolling one pitch at a time must move content by exactly one pitch.
     * Pre-fix: every time the render-range start advanced, the items
     * container was re-anchored using cached (margin-less) offsets, so the
     * fixture's tracked item jumped by the lost 12px margin per boundary.
     */
    test('content should not jump at render-range boundaries while scrolling', async ({ page }) => {
        const sweep = await readSweep(page)

        // Ensure the sweep actually measured movement rather than vacuously passing.
        expect(sweep.samples).toBeGreaterThan(MIN_SWEEP_SAMPLES)
        expect(sweep.jumps).toBe(0)
        expect(sweep.maxJumpPx).toBeLessThanOrEqual(JUMP_TOLERANCE_PX)
    })
})
