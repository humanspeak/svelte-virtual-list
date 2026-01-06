import type { Locator, Page, TestInfo } from '@playwright/test'

export const rafWait = async (page: Page) =>
    page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
    )

export const injectRafWait = async (page: Page) =>
    page.addInitScript(() => {
        ;(window as unknown as { __rafWait?: () => Promise<void> }).__rafWait = () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
    })

/**
 * Scroll helper that uses mouse.wheel on supported desktop browsers and falls back to scrollTop
 * for mobile browsers and Firefox (which handles wheel events inconsistently).
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
