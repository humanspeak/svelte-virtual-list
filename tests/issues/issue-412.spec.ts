import { expect, test } from '@playwright/test'
import { rafWait } from '../../src/lib/test/utils/rafWait.js'

const VIEWPORT_SELECTOR = '[data-testid="issue-412-list-viewport"]'

/**
 * Issue #412 — Item margins escape height measurement
 *
 * Item heights are measured as the wrapper's border box, which excludes
 * margins. The fixture's items are a 100px border box with margin: 12px 0
 * that collapses through the component's unstyled item wrappers, so the
 * real layout pitch (offsetTop delta between neighboring wrappers) is
 * 112px while the height cache reads 100px.
 *
 * Consequences pinned by these specs:
 * 1. totalHeight (viewport scrollHeight) runs ~12px/item short — the
 *    cache-implied pitch disagrees with the rendered layout pitch.
 * 2. While scrolling, content visibly jumps by the lost margin whenever
 *    the render-range start advances: the items container is translated
 *    by cache offsets (100/item) while real content stacks at 112/item.
 */

const ITEM_COUNT = 500
const BORDER_BOX_PX = 100
const MARGIN_PX = 12
const REAL_PITCH_PX = BORDER_BOX_PX + MARGIN_PX

/** Real layout pitch: offsetTop delta between consecutive rendered wrappers. */
const measureRealPitch = (selector: string): number | null => {
    const viewport = document.querySelector(selector) as HTMLElement | null
    if (!viewport) return null
    const wrappers = Array.from(viewport.querySelectorAll('[data-original-index]')) as HTMLElement[]
    if (wrappers.length < 2) return null
    return wrappers[1].offsetTop - wrappers[0].offsetTop
}

test.describe('Issue 412 - margins escape item height measurement', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-412', { waitUntil: 'domcontentloaded' })
        await page
            .locator('[data-original-index]')
            .first()
            .waitFor({ state: 'attached', timeout: 5000 })
        // Let the post-hydration measurement pass and debounced height
        // recalculation settle before sampling geometry.
        await rafWait(page, 5)
    })

    /**
     * The pitch implied by the height cache (scrollHeight / itemCount) must
     * match the rendered layout pitch. Pre-fix: cache pitch reads ~100px
     * (border box) while the layout pitch is 112px — totalHeight runs
     * ~6,000px short on this fixture.
     */
    test('cache-implied pitch should match rendered layout pitch', async ({ page }) => {
        // Sanity: the fixture really produces a 112px pitch (collapsed margins).
        const realPitch = await page.evaluate(measureRealPitch, VIEWPORT_SELECTOR)
        expect(realPitch).toBe(REAL_PITCH_PX)

        // Wait until measurements have settled (scrollHeight stable across frames).
        await expect
            .poll(
                async () => {
                    const before = await page.evaluate(
                        (sel) => document.querySelector(sel)?.scrollHeight ?? 0,
                        VIEWPORT_SELECTOR
                    )
                    await rafWait(page, 3)
                    const after = await page.evaluate(
                        (sel) => document.querySelector(sel)?.scrollHeight ?? 0,
                        VIEWPORT_SELECTOR
                    )
                    return after - before
                },
                { timeout: 5000 }
            )
            .toBe(0)

        const scrollHeight = await page.evaluate(
            (sel) => document.querySelector(sel)?.scrollHeight ?? 0,
            VIEWPORT_SELECTOR
        )
        const cachePitch = scrollHeight / ITEM_COUNT

        // Allow a bounded residual: the leading collapsed margin belongs to no
        // pitch (a constant ≤ one margin across the whole list).
        expect(Math.abs(cachePitch - REAL_PITCH_PX)).toBeLessThanOrEqual(1.5)
    })

    /**
     * Scrolling one pitch at a time must move content by exactly one pitch.
     * Pre-fix: every time the render-range start advances, the items
     * container is re-anchored using cached (margin-less) offsets, so a
     * tracked item visibly jumps by the lost 12px margin per boundary.
     */
    test('content should not jump at render-range boundaries while scrolling', async ({ page }) => {
        const result = await page.evaluate(
            async ({ selector, pitch, steps }) => {
                const viewport = document.querySelector(selector) as HTMLElement | null
                if (!viewport) return { error: 'no viewport', maxJumpPx: -1, samples: 0 }

                const nextFrame = () =>
                    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

                // Start mid-list so range boundaries are crossed on every step.
                viewport.scrollTop = 2000
                await nextFrame()
                await nextFrame()

                const rectTopOf = (index: number): number | null => {
                    const el = viewport.querySelector(
                        `[data-original-index="${index}"]`
                    ) as HTMLElement | null
                    return el ? el.getBoundingClientRect().top : null
                }

                // Track the middle rendered item so it stays attached while
                // the window advances behind it.
                const rendered = Array.from(
                    viewport.querySelectorAll('[data-original-index]')
                ) as HTMLElement[]
                if (rendered.length < 3)
                    return { error: 'too few items', maxJumpPx: -1, samples: 0 }
                let trackedIndex = parseInt(
                    rendered[Math.floor(rendered.length / 2)].dataset.originalIndex ?? '-1',
                    10
                )

                let maxJumpPx = 0
                let samples = 0

                for (let step = 0; step < steps; step++) {
                    // Re-anchor to a middle rendered item when the tracked one
                    // is about to leave the window.
                    if (rectTopOf(trackedIndex) === null) {
                        const current = Array.from(
                            viewport.querySelectorAll('[data-original-index]')
                        ) as HTMLElement[]
                        trackedIndex = parseInt(
                            current[Math.floor(current.length / 2)]?.dataset.originalIndex ?? '-1',
                            10
                        )
                    }

                    const before = rectTopOf(trackedIndex)
                    viewport.scrollTop += pitch
                    await nextFrame()
                    await nextFrame()
                    const after = rectTopOf(trackedIndex)

                    if (before === null || after === null) continue
                    // Content scrolled up by `pitch`; any deviation is a painted jump.
                    const jump = Math.abs(after - before + pitch)
                    maxJumpPx = Math.max(maxJumpPx, jump)
                    samples++
                }

                return { error: null, maxJumpPx, samples }
            },
            { selector: VIEWPORT_SELECTOR, pitch: REAL_PITCH_PX, steps: 25 }
        )

        expect(result.error).toBeNull()
        // Ensure the sweep actually measured movement rather than vacuously passing.
        expect(result.samples).toBeGreaterThan(15)
        // Pre-fix this reads ~12px (one lost margin) or a multiple of it.
        expect(result.maxJumpPx).toBeLessThanOrEqual(3)
    })
})
