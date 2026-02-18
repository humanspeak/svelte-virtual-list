import { expect, test } from '@playwright/test'
import { rafWait } from '../../src/lib/test/utils/rafWait.js'

const VIEWPORT_SELECTOR = '[data-testid="issue-327-list-viewport"]'

/**
 * Issue #327 — Variable height scroll flashes when height changes
 *
 * When scrolled partway through a list and expanding an accordion-style item,
 * the list would visibly flash/blink. Three root causes were fixed:
 *
 * 1. The 100ms debounce on height recalculation left stale averages for
 *    several frames after a ResizeObserver-detected height change.
 *    Fix: immediate processing (0ms) for dirty items.
 *
 * 2. A single expanded item (e.g., 117px) with _measuredCount === 0 would
 *    set itemHeight globally, spiking totalHeight from ~49,000 to ~117,000px.
 *    Fix: guard with newValidCount !== 1 to reject single-item outliers.
 *
 * 3. Browser scroll anchoring interfered with the virtual list's own
 *    scroll correction. Fix: permanent overflow-anchor: none.
 */
test.describe('Issue 327 - Variable height scroll flash on item expand', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-327', { waitUntil: 'domcontentloaded' })
        await page
            .locator('[data-original-index]')
            .first()
            .waitFor({ state: 'attached', timeout: 5000 })
        await rafWait(page, 2)
    })

    /**
     * Scroll down, expand an item, and verify totalHeight doesn't spike.
     *
     * Before the fix, expanding one item would change the global itemHeight
     * estimate, causing totalHeight = 1000 * 117 = 117,000px instead of
     * the correct ~40,000px. This spike manifested as a visible flash.
     */
    test('expanding an item should not cause scrollHeight to spike', async ({ page }) => {
        // Scroll to mid-list so there are many unmeasured items
        await page.evaluate((selector) => {
            const vp = document.querySelector(selector) as HTMLElement | null
            if (vp) vp.scrollTop = 5000
        }, VIEWPORT_SELECTOR)
        await rafWait(page, 2)

        // Record scrollHeight before expand
        const beforeHeight = await page.evaluate((selector) => {
            const vp = document.querySelector(selector) as HTMLElement | null
            return vp?.scrollHeight ?? 0
        }, VIEWPORT_SELECTOR)

        expect(beforeHeight).toBeGreaterThan(0)

        // Find a visible item and expand it
        const toggleBtn = page.locator('[data-testid^="toggle-"]').first()
        await toggleBtn.click()

        // Wait for ResizeObserver to detect the change and the component to react
        await rafWait(page, 3)

        // Record scrollHeight after expand
        const afterHeight = await page.evaluate((selector) => {
            const vp = document.querySelector(selector) as HTMLElement | null
            return vp?.scrollHeight ?? 0
        }, VIEWPORT_SELECTOR)

        // The scrollHeight should increase modestly (one item got taller),
        // not spike by 2-3x. Before the fix it would jump from ~40k to ~117k.
        const ratio = afterHeight / beforeHeight
        expect(ratio).toBeLessThan(1.5) // Should be close to 1.0, never > 1.5x
        expect(ratio).toBeGreaterThan(0.5) // Should not collapse either
    })

    /**
     * The scrollHeight spike was the core visual bug — a single expanded item
     * should not cause the total estimated height to balloon across all items.
     * Test multiple scroll positions to catch edge cases.
     */
    test('scrollHeight should not spike at different scroll positions', async ({ page }) => {
        for (const scrollPos of [1000, 10000, 20000]) {
            await page.evaluate(
                ({ selector, pos }) => {
                    const vp = document.querySelector(selector) as HTMLElement | null
                    if (vp) vp.scrollTop = pos
                },
                { selector: VIEWPORT_SELECTOR, pos: scrollPos }
            )
            await rafWait(page, 2)

            const before = await page.evaluate((selector) => {
                const vp = document.querySelector(selector) as HTMLElement | null
                return vp?.scrollHeight ?? 0
            }, VIEWPORT_SELECTOR)

            const toggleBtn = page.locator('[data-testid^="toggle-"]').first()
            await toggleBtn.click()
            await rafWait(page, 3)

            const after = await page.evaluate((selector) => {
                const vp = document.querySelector(selector) as HTMLElement | null
                return vp?.scrollHeight ?? 0
            }, VIEWPORT_SELECTOR)

            const ratio = after / before
            expect(ratio).toBeLessThan(1.5)
            expect(ratio).toBeGreaterThan(0.5)

            // Collapse before next iteration
            await toggleBtn.click()
            await rafWait(page, 2)
        }
    })

    /**
     * The expanded item should remain visible after expansion — no flash away
     * and back. This tests that the content stays in place rather than
     * disappearing for a frame.
     */
    test('expanded item should remain visible after toggle', async ({ page }) => {
        // Scroll to mid-list
        await page.evaluate((selector) => {
            const vp = document.querySelector(selector) as HTMLElement | null
            if (vp) vp.scrollTop = 5000
        }, VIEWPORT_SELECTOR)
        await rafWait(page, 2)

        // Get the first visible item's testid
        const firstToggle = page.locator('[data-testid^="toggle-"]').first()
        const toggleTestId = await firstToggle.getAttribute('data-testid')
        const itemId = toggleTestId?.replace('toggle-', '')

        // Expand the item
        await firstToggle.click()
        await rafWait(page, 3)

        // The expanded content should be visible
        const expandedContent = page.locator(`[data-testid="content-${itemId}"]`)
        await expect(expandedContent).toBeVisible({ timeout: 2000 })

        // The item itself should still be attached and visible
        const item = page.locator(`[data-testid="list-item-${itemId}"]`)
        await expect(item).toBeVisible()
    })

    /**
     * Rapid expand/collapse cycles should not cause progressive drift
     * in scrollHeight. Each cycle should return to approximately the
     * same scrollHeight, proving the height estimate isn't being
     * permanently corrupted by single-item outliers.
     */
    test('rapid expand/collapse should not cause progressive scrollHeight drift', async ({
        page
    }) => {
        // Scroll to mid-list
        await page.evaluate((selector) => {
            const vp = document.querySelector(selector) as HTMLElement | null
            if (vp) vp.scrollTop = 5000
        }, VIEWPORT_SELECTOR)
        await rafWait(page, 2)

        // Record baseline scrollHeight
        const baselineHeight = await page.evaluate((selector) => {
            const vp = document.querySelector(selector) as HTMLElement | null
            return vp?.scrollHeight ?? 0
        }, VIEWPORT_SELECTOR)

        // Expand and collapse the same item 5 times, recording scrollHeight each cycle
        const toggleBtn = page.locator('[data-testid^="toggle-"]').first()
        const collapsedHeights: number[] = []

        for (let i = 0; i < 5; i++) {
            await toggleBtn.click() // expand
            await rafWait(page, 2)
            await toggleBtn.click() // collapse
            await rafWait(page, 2)

            const h = await page.evaluate((selector) => {
                const vp = document.querySelector(selector) as HTMLElement | null
                return vp?.scrollHeight ?? 0
            }, VIEWPORT_SELECTOR)
            collapsedHeights.push(h)
        }

        // Each collapsed height should be close to baseline — no progressive drift.
        // Before the fix, the single-item outlier guard was missing, so each
        // expand cycle could permanently shift the global estimate.
        for (const h of collapsedHeights) {
            const drift = Math.abs(h - baselineHeight)
            expect(drift).toBeLessThan(500) // generous tolerance for measurement settling
        }

        // The drift should not be increasing over cycles
        if (collapsedHeights.length >= 2) {
            const firstDrift = Math.abs(collapsedHeights[0] - baselineHeight)
            const lastDrift = Math.abs(
                collapsedHeights[collapsedHeights.length - 1] - baselineHeight
            )
            // Last drift should not be dramatically worse than first (no progressive corruption)
            expect(lastDrift).toBeLessThan(firstDrift + 200)
        }
    })

    /**
     * Verify overflow-anchor: none is set on the viewport.
     * Browser scroll anchoring interfered with virtual list scroll correction.
     * Note: WebKit does not support overflow-anchor as a recognized CSS property,
     * so we check the raw style attribute string rather than computed/parsed values.
     */
    test('viewport should have overflow-anchor disabled', async ({ page }) => {
        const hasOverflowAnchor = await page.evaluate((selector) => {
            const vp = document.querySelector(selector) as HTMLElement | null
            if (!vp) return false
            // Check the raw style attribute for the property, since WebKit
            // doesn't parse overflow-anchor into style.overflowAnchor
            const attr = vp.getAttribute('style') ?? ''
            return attr.includes('overflow-anchor') && attr.includes('none')
        }, VIEWPORT_SELECTOR)

        expect(hasOverflowAnchor).toBe(true)
    })
})
