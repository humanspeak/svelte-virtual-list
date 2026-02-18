import { expect, test } from '@playwright/test'
import { rafWait } from '../../src/lib/test/utils/rafWait.js'

const VIEWPORT_SELECTOR = '[data-testid="issue-341-list-viewport"]'

/**
 * Issue #341 — bottomToTop scroll jitter from averageHeight oscillation
 *
 * When slowly scrolling up in bottomToTop mode with variable-height items,
 * newly measured items would shift the averageHeight estimate. Because many
 * unmeasured items use that average, the total scrollHeight would oscillate
 * ~27px per frame, causing visible jitter as the browser adjusts scrollTop.
 *
 * Fix: content-height ratchet prevents scrollHeight from shrinking during
 * active scroll, and transform calculation uses measured heights instead
 * of the volatile averageHeight.
 */
test.describe('Issue 341 - bottomToTop scroll jitter with variable heights', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-341', { waitUntil: 'domcontentloaded' })
        await page
            .locator('[data-original-index]')
            .first()
            .waitFor({ state: 'attached', timeout: 5000 })
        await rafWait(page, 2)
    })

    /**
     * Core regression test: scrollHeight must not oscillate during slow scroll.
     *
     * Before the fix, scrollHeight would bounce between values like
     * 8933 → 8960 → 8947 → 8933 on every frame during upward scroll.
     * After the fix, scrollHeight should only grow (ratchet) during active
     * scroll, so frame-to-frame delta should be >= 0.
     */
    test('scrollHeight should not oscillate during slow upward scroll', async ({ page }) => {
        // Collect scrollHeight over many small scroll steps
        const measurements = await page.evaluate(
            async ({ selector }) => {
                const vp = document.querySelector(selector) as HTMLElement | null
                if (!vp) return null

                const heights: number[] = []
                const scrollTops: number[] = []

                // Record initial state
                heights.push(vp.scrollHeight)
                scrollTops.push(vp.scrollTop)

                // Simulate slow upward scroll: 30 small steps with a frame between each
                for (let i = 0; i < 30; i++) {
                    // Small scroll increment (negative = scroll up in bottomToTop)
                    vp.scrollTop = Math.max(0, vp.scrollTop - 50)

                    // Wait for a frame to let the component react
                    await new Promise<void>((resolve) =>
                        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                    )

                    heights.push(vp.scrollHeight)
                    scrollTops.push(vp.scrollTop)
                }

                return { heights, scrollTops }
            },
            { selector: VIEWPORT_SELECTOR }
        )

        expect(measurements).not.toBeNull()
        if (!measurements) return

        const { heights } = measurements

        // Count how many times scrollHeight decreased between consecutive frames.
        // Before the fix this would be ~15 out of 30 (oscillating every other frame).
        // After the fix it should be 0 (ratchet only allows growth during scroll).
        let decreaseCount = 0
        let maxDecrease = 0
        for (let i = 1; i < heights.length; i++) {
            const delta = heights[i] - heights[i - 1]
            if (delta < 0) {
                decreaseCount++
                maxDecrease = Math.max(maxDecrease, Math.abs(delta))
            }
        }

        // Allow at most 2 minor decreases (browser rounding) but no large oscillations.
        // Before the fix: ~15 decreases of ~27px each
        expect(decreaseCount).toBeLessThanOrEqual(2)
        expect(maxDecrease).toBeLessThan(5) // No jumps > 5px
    })

    /**
     * Verify transform stability: the translateY on the content wrapper
     * should not jump back and forth during scroll.
     */
    test('transform should not jitter during slow upward scroll', async ({ page }) => {
        const measurements = await page.evaluate(
            async ({ selector }) => {
                const vp = document.querySelector(selector) as HTMLElement | null
                if (!vp) return null

                // The content wrapper that gets translateY applied
                const content = vp.querySelector('[style*="transform"]') as HTMLElement | null
                if (!content) return null

                const getTransformY = (el: HTMLElement): number => {
                    const match = el.style.transform.match(/translateY\(([-\d.]+)px\)/)
                    return match ? parseFloat(match[1]) : 0
                }

                const transforms: number[] = []
                transforms.push(getTransformY(content))

                for (let i = 0; i < 30; i++) {
                    vp.scrollTop = Math.max(0, vp.scrollTop - 50)

                    await new Promise<void>((resolve) =>
                        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                    )

                    transforms.push(getTransformY(content))
                }

                return { transforms }
            },
            { selector: VIEWPORT_SELECTOR }
        )

        expect(measurements).not.toBeNull()
        if (!measurements) return

        const { transforms } = measurements

        // Check for direction reversals: transform should move monotonically
        // (or stay still), not bounce back and forth.
        let reversals = 0
        let lastDirection = 0

        for (let i = 1; i < transforms.length; i++) {
            const delta = transforms[i] - transforms[i - 1]
            if (Math.abs(delta) < 0.5) continue // ignore tiny movements

            const direction = delta > 0 ? 1 : -1
            if (lastDirection !== 0 && direction !== lastDirection) {
                reversals++
            }
            lastDirection = direction
        }

        // Before the fix: many reversals as transform bounced with averageHeight.
        // After the fix: should be mostly monotonic. Allow a few for edge cases.
        expect(reversals).toBeLessThanOrEqual(3)
    })

    /**
     * Verify the list still renders correctly and Item 0 is at the bottom
     * (basic sanity check that the jitter fix doesn't break bottomToTop layout).
     */
    test('items should render correctly in bottomToTop mode', async ({ page }) => {
        // Scroll to max to see Item 0
        await page.evaluate((selector) => {
            const vp = document.querySelector(selector) as HTMLElement | null
            if (vp) {
                vp.scrollTo({ top: vp.scrollHeight - vp.clientHeight, behavior: 'auto' })
            }
        }, VIEWPORT_SELECTOR)

        await rafWait(page, 2)

        await page
            .locator('[data-original-index="0"]')
            .first()
            .waitFor({ state: 'attached', timeout: 3000 })

        const item0 = page.locator('[data-original-index="0"]')
        await expect(item0).toBeVisible()
    })

    /**
     * After scrolling stops and the component goes idle, scrollHeight should
     * settle to a stable value (the ratchet releases on idle).
     */
    test('scrollHeight should stabilize after scroll stops', async ({ page }) => {
        // Scroll up a bit to trigger the ratchet
        await page.evaluate(
            async ({ selector }) => {
                const vp = document.querySelector(selector) as HTMLElement | null
                if (!vp) return

                for (let i = 0; i < 10; i++) {
                    vp.scrollTop = Math.max(0, vp.scrollTop - 100)
                    await new Promise<void>((resolve) =>
                        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                    )
                }
            },
            { selector: VIEWPORT_SELECTOR }
        )

        // Wait for the isScrolling timeout (250ms) plus margin
        await page.waitForTimeout(500)
        await rafWait(page, 2)

        // Now measure scrollHeight over several frames — it should be stable
        const heights = await page.evaluate(
            async ({ selector }) => {
                const vp = document.querySelector(selector) as HTMLElement | null
                if (!vp) return null

                const h: number[] = []
                for (let i = 0; i < 5; i++) {
                    h.push(vp.scrollHeight)
                    await new Promise<void>((resolve) =>
                        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                    )
                }
                return h
            },
            { selector: VIEWPORT_SELECTOR }
        )

        expect(heights).not.toBeNull()
        if (!heights) return

        // All readings should be identical when idle
        const unique = new Set(heights)
        expect(unique.size).toBe(1)
    })
})
