/**
 * Playwright helpers for fixtures that report live pass/fail stats
 * (see src/routes/tests/issues/issue-412 and issue-413).
 *
 * Fixtures render each stat's value inside `[data-testid="stat-<name>"]`,
 * either as a plain value or as a `key=value key=value …` line. Specs assert
 * on those numbers so the page a human debugs and the numbers CI enforces
 * can never diverge.
 */

import type { Page } from '@playwright/test'

/** Selector for a fixture stat value by name. */
export const stat = (name: string) => `[data-testid="stat-${name}"]`

/** Parse a stats line of key=value pairs, e.g. "jumps=0 maxJumpPx=0 samples=24". */
export const readStats = async (page: Page, name: string): Promise<Record<string, number>> => {
    const text = await page.locator(stat(name)).innerText()
    return Object.fromEntries(
        [...text.matchAll(/(\w+)=([\d.]+)/g)].map((m) => [m[1], parseFloat(m[2])])
    )
}
