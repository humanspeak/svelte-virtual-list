/**
 * Playwright test utilities for waiting on animation frames and scrolling.
 *
 * @fileoverview Provides helper functions for E2E tests that need to wait for
 * browser rendering cycles or simulate scroll interactions across different browsers.
 */

import type { Locator, Page, TestInfo } from '@playwright/test'

/**
 * Waits for consecutive animation frame cycles to complete.
 *
 * This function is useful for ensuring that DOM measurements are stable after
 * changes, as browsers may require multiple frames to complete layout calculations.
 * Each cycle waits for two animation frames (the standard synchronization point).
 *
 * @param {Page} page - The Playwright page instance.
 * @param {number} [cycles=1] - Number of double-frame cycles to wait. Use higher
 *   values for slower browsers (webkit, mobile) that need more time for layout.
 * @returns {Promise<void>} Resolves after the specified cycles have completed.
 *
 * @example
 * ```typescript
 * // Wait for layout to stabilize after a DOM change
 * await page.click('[data-testid="add-item"]');
 * await rafWait(page);
 * const height = await page.locator('.item').boundingBox();
 *
 * // Wait longer for webkit/mobile browsers
 * await rafWait(page, 3);
 * ```
 */
export const rafWait = async (page: Page, cycles: number = 1) => {
    for (let i = 0; i < cycles; i++) {
        await page.evaluate(
            () =>
                new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                )
        )
    }
}

/**
 * Injects a rafWait helper function into the page's global scope.
 *
 * This allows in-page scripts to wait for animation frames without requiring
 * additional round-trips to the test runner. The injected function is available
 * as `window.__rafWait()`.
 *
 * @param {Page} page - The Playwright page instance.
 * @returns {Promise<void>} Resolves when the init script has been added.
 *
 * @example
 * ```typescript
 * // Inject before navigation
 * await injectRafWait(page);
 * await page.goto('/test-page');
 *
 * // Use within page.evaluate
 * await page.evaluate(async () => {
 *     await window.__rafWait();
 *     // DOM is now stable
 * });
 * ```
 */
export const injectRafWait = async (page: Page) =>
    page.addInitScript(() => {
        ;(window as unknown as { __rafWait?: () => Promise<void> }).__rafWait = () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
    })

/**
 * Simulates scroll interaction using the appropriate method for the browser.
 *
 * Uses `mouse.wheel` on supported desktop browsers (Chromium, WebKit) for realistic
 * user interaction. Falls back to direct `scrollTop`/`scrollLeft` manipulation for
 * mobile browsers and Firefox, which handle wheel events inconsistently.
 *
 * @param {Page} page - The Playwright page instance.
 * @param {Locator} locator - The scrollable element to scroll.
 * @param {number} deltaX - Horizontal scroll amount in pixels (positive = right).
 * @param {number} deltaY - Vertical scroll amount in pixels (positive = down).
 * @param {TestInfo} [testInfo] - Optional test info for browser detection.
 * @returns {Promise<void>} Resolves when the scroll operation completes.
 *
 * @example
 * ```typescript
 * // Scroll down 500 pixels
 * const viewport = page.locator('[data-testid="list-viewport"]');
 * await scrollByWheel(page, viewport, 0, 500, testInfo);
 *
 * // Scroll up 200 pixels (negative deltaY)
 * await scrollByWheel(page, viewport, 0, -200, testInfo);
 * ```
 */
export const scrollByWheel = async (
    page: Page,
    locator: Locator,
    deltaX: number,
    deltaY: number,
    testInfo?: TestInfo
) => {
    const isMobile = testInfo
        ? /mobile/i.test(testInfo.project.name)
        : await page.evaluate(() => 'ontouchstart' in window)

    // Firefox wheel events are unreliable (scroll amounts differ from delta values)
    const isFirefox = testInfo ? /firefox/i.test(testInfo.project.name) : false

    if (isMobile || isFirefox) {
        // Fallback for mobile and Firefox - use direct scroll manipulation
        await locator.evaluate(
            (el, { dx, dy }) => {
                el.scrollTop += dy
                el.scrollLeft += dx
            },
            { dx: deltaX, dy: deltaY }
        )
    } else {
        // Desktop Chromium/WebKit - use mouse wheel API
        await locator.hover()
        await page.mouse.wheel(deltaX, deltaY)
    }
}
