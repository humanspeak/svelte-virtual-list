import type { Page } from '@playwright/test'

/**
 * Waits until the bottomToTop virtual list reaches the `lockedBottom` state
 * with measured items and a small gap from bottom (≤2px).
 */
export const waitForLockedBottom = async (page: Page, viewportSelector: string) => {
    await page.waitForFunction(
        (selector) => {
            const viewport = document.querySelector(selector) as
                | (HTMLElement & {
                      __svlDebug?: {
                          bottomToTopState?: string
                          gapFromBottomPx?: number
                          measuredCount?: number
                          maxScrollTopPx?: number
                      }
                  })
                | null
            if (!viewport) return false

            const debug = viewport.__svlDebug
            if (!debug) return false

            return (
                debug.bottomToTopState === 'lockedBottom' &&
                (debug.gapFromBottomPx ?? Number.POSITIVE_INFINITY) <= 2 &&
                (debug.measuredCount ?? 0) > 0
            )
        },
        viewportSelector,
        { timeout: 10000 }
    )
}
