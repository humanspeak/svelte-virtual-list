import { expect, test, type Page } from '@playwright/test'
import { rafWait, scrollByWheel } from '../../src/lib/test/utils/rafWait.js'

const VIEWPORT_SELECTOR = '[data-testid="basic-list-viewport"]'

type BasicDebugSnapshot = {
    scrollTop: number
    maxScrollTop: number
    measuredCount: number
    stagedMeasurementCount: number
    stagedPromotionPending: boolean
    gapFromBottomPx: number
}

async function getBasicDebug(page: Page): Promise<BasicDebugSnapshot> {
    return page.locator(VIEWPORT_SELECTOR).evaluate((element) => {
        const el = element as HTMLElement & {
            __svlDebug?: {
                measuredCount?: number
                stagedMeasurementCount?: number
                stagedPromotionPending?: boolean
                gapFromBottomPx?: number
            }
        }

        return {
            scrollTop: Math.round(el.scrollTop),
            maxScrollTop: Math.round(el.scrollHeight - el.clientHeight),
            measuredCount: el.__svlDebug?.measuredCount ?? 0,
            stagedMeasurementCount: el.__svlDebug?.stagedMeasurementCount ?? 0,
            stagedPromotionPending: el.__svlDebug?.stagedPromotionPending ?? false,
            gapFromBottomPx:
                el.__svlDebug?.gapFromBottomPx ??
                Math.round(el.scrollHeight - el.clientHeight - el.scrollTop)
        }
    })
}

/**
 * Scrolls to max scroll position and waits for stabilization.
 * In bottomToTop mode, max scrollTop shows Item 0 at bottom.
 */
async function scrollToMaxAndWait(page: Page, tolerance = 100, timeout = 5000) {
    await page.evaluate((selector) => {
        const viewport = document.querySelector(selector) as HTMLElement | null
        if (viewport) {
            const maxScroll = viewport.scrollHeight - viewport.clientHeight
            viewport.scrollTo({ top: maxScroll, behavior: 'auto' })
        }
    }, VIEWPORT_SELECTOR)

    await page.waitForFunction(
        ([selector, tol]) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return false
            const maxScroll = viewport.scrollHeight - viewport.clientHeight
            return Math.abs(viewport.scrollTop - maxScroll) < tol
        },
        [VIEWPORT_SELECTOR, tolerance] as const,
        { timeout }
    )

    await rafWait(page, 2)
}

test.describe('Basic BottomToTop Rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/list/bottomToTop/basic', { waitUntil: 'domcontentloaded' })
        // Allow brief settling time for height measurements to complete
        await rafWait(page)
        await page
            .locator('[data-original-index]')
            .first()
            .waitFor({ state: 'attached', timeout: 2000 })
    })

    test('should render items in descending order with Item 0 at bottom', async ({ page }) => {
        const itemCount = await page.locator('[data-original-index]').count()
        expect(itemCount).toBeGreaterThan(0)

        // In bottomToTop mode, items should be in descending order (25, 24, 23... 0)
        // with Item 0 visible at the bottom of the viewport
        await scrollToMaxAndWait(page, 50, 3000)

        await page
            .locator('[data-original-index="0"]')
            .first()
            .waitFor({ state: 'attached', timeout: 2000 })
        const firstItem = await page.locator('[data-original-index="0"]')
        await expect(firstItem).toBeVisible()

        // Get all visible items by their original index
        const visibleIndices = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-original-index]')).map((el) =>
                parseInt(el.getAttribute('data-original-index') || '0')
            )
        })

        // Should see some items, including both higher indices and Item 0
        expect(visibleIndices.length).toBeGreaterThan(0)
        expect(visibleIndices).toContain(0)

        // Should also see higher index items
        const hasHigherIndexItems = visibleIndices.some((index) => index > 10)
        expect(hasHigherIndexItems).toBe(true)
    })

    test('should expose bottom-to-top stats on the basic page', async ({ page }) => {
        await expect(page.locator('[data-testid="bottom-to-top-basic-stats"]')).toBeVisible()
        await page.waitForFunction(() => {
            const text = document.querySelector('[data-testid="stats-scroll"]')?.textContent ?? ''
            const match = text.match(/Bottom Gap\s+(\d+)px/)
            const gap = match ? parseInt(match[1] || '0', 10) : Number.POSITIVE_INFINITY
            return Number.isFinite(gap) && gap <= 2
        })

        const stats = await page.evaluate(() => {
            const getText = (testId: string) =>
                document.querySelector(`[data-testid="${testId}"]`)?.textContent ?? ''

            const measuredText = getText('stats-measured')
            const mountedText = getText('stats-mounted')
            const spacersText = getText('stats-spacers')
            const scrollText = getText('stats-scroll')
            const queueText = getText('stats-queue')

            const measuredMatch = measuredText.match(/(\d+)\/(\d+)/)
            const mountedMatch = mountedText.match(/DOM\s+(\d+)/)
            const spacerMatch = spacersText.match(/Spacers\s+(\d+)px/)
            const gapMatch = scrollText.match(/Bottom Gap\s+(\d+)px/)

            return {
                measuredCount: measuredMatch ? parseInt(measuredMatch[1] || '0', 10) : -1,
                totalItems: measuredMatch ? parseInt(measuredMatch[2] || '0', 10) : -1,
                mountedCount: mountedMatch ? parseInt(mountedMatch[1] || '0', 10) : -1,
                topSpacerPx: spacerMatch ? parseInt(spacerMatch[1] || '0', 10) : -1,
                gapFromBottomPx: gapMatch ? parseInt(gapMatch[1] || '0', 10) : -1,
                measuredText,
                queueText
            }
        })

        expect(stats.totalItems).toBe(10000)
        expect(stats.measuredCount).toBeGreaterThan(0)
        expect(stats.mountedCount).toBeGreaterThan(0)
        expect(stats.mountedCount).toBeLessThan(100)
        expect(stats.topSpacerPx).toBeGreaterThanOrEqual(0)
        expect(stats.gapFromBottomPx).toBeLessThanOrEqual(2)
        expect(stats.measuredText).toContain('staged')
        expect(stats.measuredText).toContain('tracked')
        expect(stats.queueText).toContain('promote')
        expect(stats.queueText).toContain('drain')
    })

    test('should render correct item content for visible items', async ({ page }) => {
        // Get the actually visible items and verify they have correct content
        const visibleItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-original-index]')).map((el) => ({
                originalIndex: el.getAttribute('data-original-index'),
                text: el.textContent
            }))
        })

        // Verify each visible item has correct content
        for (const item of visibleItems.slice(0, 3)) {
            // Check first 3 items
            if (item.originalIndex && item.text) {
                expect(item.text).toBe(`Item ${item.originalIndex}`)
            }
        }

        expect(visibleItems.length).toBeGreaterThan(0)
    })

    test('should only render items in viewport plus reasonable buffer', async ({ page }) => {
        const renderedItems = await page.evaluate(() => {
            return document.querySelectorAll('[data-original-index]').length
        })

        // With 500px height and ~22px items, expect between 40-70 items
        // (bottomToTop mode may render more items due to positioning complexity)
        expect(renderedItems).toBeGreaterThan(40) // Reasonable minimum
        expect(renderedItems).toBeLessThan(70) // Reasonable maximum with variance

        // Verify we're actually virtualizing
        expect(renderedItems).toBeLessThan(100) // Much less than total items (10000)
    })

    test('should position Item 0 at bottom of viewport in bottomToTop mode', async ({ page }) => {
        await scrollToMaxAndWait(page)

        await page
            .locator('[data-original-index="0"]')
            .first()
            .waitFor({ state: 'attached', timeout: 3000 })

        // Wait for layout to stabilize after item attachment
        await rafWait(page)

        // Verify that item 0 is positioned at/near the bottom of the viewport
        const isItem0AtBottom = await page.evaluate(() => {
            const viewport = document.querySelector('.virtual-list-container') as HTMLElement
            const item0 = document.querySelector('[data-original-index="0"]') as HTMLElement

            if (!viewport || !item0) {
                return { found: false, debug: 'Item 0 or viewport not found' }
            }

            const viewportRect = viewport.getBoundingClientRect()
            const itemRect = item0.getBoundingClientRect()

            // Calculate distance from item bottom to viewport bottom
            const distanceFromBottom = Math.abs(itemRect.bottom - viewportRect.bottom)

            return {
                found: true,
                distanceFromBottom,
                itemBottom: itemRect.bottom,
                viewportBottom: viewportRect.bottom,
                itemTop: itemRect.top,
                viewportTop: viewportRect.top,
                isAtBottom: distanceFromBottom < 30 // Within 30px is considered "at bottom"
            }
        })

        expect(isItem0AtBottom.found).toBe(true)

        // Item 0 should be positioned close to the bottom of the viewport (within 30px)
        expect(isItem0AtBottom.distanceFromBottom).toBeLessThan(30)
    })

    test('should start at correct scroll position', async ({ page }) => {
        const scrollState = await page.evaluate(() => {
            const container = document.querySelector(
                '.virtual-list-container'
            ) as HTMLElement | null
            if (!container) return null
            const maxScrollTop = container.scrollHeight - container.clientHeight
            return {
                scrollTop: Math.round(container.scrollTop),
                maxScrollTop: Math.round(maxScrollTop),
                gap: Math.round(maxScrollTop - container.scrollTop)
            }
        })

        expect(scrollState).not.toBeNull()
        expect(scrollState!.gap).toBeLessThanOrEqual(2)

        await page
            .locator('[data-original-index="0"]')
            .first()
            .waitFor({ state: 'attached', timeout: 3000 })
        const firstItem = await page.locator('[data-original-index="0"]')
        await expect(firstItem).toBeVisible()
    })

    test('should maintain proper DOM structure', async ({ page }) => {
        // Check that the test container exists
        const testContainer = await page.locator('.test-container')
        await expect(testContainer).toBeVisible()

        // Check that the virtual list container exists (look for the actual container class)
        const virtualListContainer = await page.locator('.virtual-list-container')
        await expect(virtualListContainer).toBeVisible()

        // Check that items are properly nested in the virtual list container
        const itemsInContainer = await page
            .locator('.virtual-list-container [data-original-index]')
            .count()
        expect(itemsInContainer).toBeGreaterThan(0)
    })

    test('should handle scroll events in bottomToTop mode', async ({ page }) => {
        await scrollToMaxAndWait(page)

        // Get initial visible items (should include Item 0 at bottom and higher indices)
        const initialIndices = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-original-index]')).map((el) =>
                parseInt(el.getAttribute('data-original-index') || '0')
            )
        })

        // Scroll up to reveal higher indices using direct scrollTop manipulation
        await page.evaluate((selector) => {
            const el = document.querySelector(selector) as HTMLElement
            if (!el) return
            el.scrollTop = Math.max(0, el.scrollTop - 5000)
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)

        // Wait for scroll to actually change visible items
        await page.waitForFunction(
            (initialIds) => {
                const currentIds = Array.from(
                    document.querySelectorAll('[data-original-index]')
                ).map((el) => parseInt(el.getAttribute('data-original-index') || '0'))
                return (
                    currentIds.length > 0 &&
                    JSON.stringify(currentIds) !== JSON.stringify(initialIds)
                )
            },
            initialIndices,
            { timeout: 5000 }
        )

        // Get new visible items after scrolling
        const newIndices = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-original-index]')).map((el) =>
                parseInt(el.getAttribute('data-original-index') || '0')
            )
        })

        // Should still have some items visible
        expect(newIndices.length).toBeGreaterThan(0)
    })

    test('should not produce console errors on load', async ({ page }) => {
        const errors: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text())
        })

        await page.goto('/tests/list/bottomToTop/basic', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)

        const svelteErrors = errors.filter(
            (e) => e.includes('effect_update_depth_exceeded') || e.includes('Svelte error')
        )
        expect(svelteErrors).toEqual([])
    })

    test('should progressively backfill measurements', async ({ page }) => {
        // Get initial measurement count after settling
        const initial = await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement & {
                __svlDebug?: { measuredCount?: number }
            }
            return viewport?.__svlDebug?.measuredCount ?? 0
        }, VIEWPORT_SELECTOR)

        // Wait a few seconds for backfill to progress
        await page.waitForTimeout(3000)

        const after = await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement & {
                __svlDebug?: { measuredCount?: number; totalItems?: number }
            }
            return {
                measured: viewport?.__svlDebug?.measuredCount ?? 0,
                total: viewport?.__svlDebug?.totalItems ?? 0
            }
        }, VIEWPORT_SELECTOR)

        expect(after.total).toBe(10000)
        // Backfill should be progressively measuring more items over time
        expect(after.measured).toBeGreaterThan(initial)
    })

    test('should stage offscreen measurements while scrolled away', async ({ page }) => {
        await scrollToMaxAndWait(page)

        await page.evaluate((selector) => {
            const el = document.querySelector(selector) as HTMLElement | null
            if (!el) return
            const maxScrollTop = el.scrollHeight - el.clientHeight
            el.scrollTop = Math.max(0, maxScrollTop - 600)
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)

        await page.waitForTimeout(400)

        const baseline = await getBasicDebug(page)
        expect(baseline.gapFromBottomPx).toBeGreaterThan(100)

        let maxMeasuredCount = baseline.measuredCount
        let maxStagedCount = baseline.stagedMeasurementCount
        let maxDrift = 0

        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(200)
            const sample = await getBasicDebug(page)
            maxMeasuredCount = Math.max(maxMeasuredCount, sample.measuredCount)
            maxStagedCount = Math.max(maxStagedCount, sample.stagedMeasurementCount)
            maxDrift = Math.max(maxDrift, Math.abs(sample.scrollTop - baseline.scrollTop))
        }

        expect(maxMeasuredCount).toBeLessThanOrEqual(baseline.measuredCount + 2)
        expect(maxStagedCount).toBeGreaterThan(0)
        expect(maxDrift).toBeLessThan(50)
    })

    test('should anchor scroll position during backfill when scrolled away', async ({
        page
    }, testInfo) => {
        // Scroll up immediately while backfill is still active
        const viewport = page.locator(VIEWPORT_SELECTOR)
        await scrollByWheel(page, viewport, 0, -2000, testInfo)
        await page.waitForTimeout(200)

        // Record the top-edge visible item and its viewport offset.
        const anchor = await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return null

            const viewportRect = viewport.getBoundingClientRect()
            const elements = Array.from(
                viewport.querySelectorAll('[data-original-index]')
            ) as HTMLElement[]

            let bestElement: HTMLElement | null = null
            let bestDistance = Number.POSITIVE_INFINITY

            for (const element of elements) {
                const rect = element.getBoundingClientRect()
                if (rect.bottom <= viewportRect.top || rect.top >= viewportRect.bottom) continue

                const distance = Math.abs(rect.top - viewportRect.top)
                if (distance < bestDistance) {
                    bestDistance = distance
                    bestElement = element
                }
            }

            if (!bestElement) return null

            return {
                logicalIndex: Number.parseInt(bestElement.dataset.originalIndex || '-1', 10),
                offsetTop: bestElement.getBoundingClientRect().top - viewportRect.top
            }
        }, VIEWPORT_SELECTOR)
        expect(anchor).not.toBeNull()

        // Wait while backfill continues, sampling the anchor element position.
        const anchorDrift = await page.evaluate(
            ([selector, logicalIndex, startOffset]) => {
                return new Promise<number>((resolve) => {
                    const viewport = document.querySelector(selector) as HTMLElement | null
                    if (!viewport) {
                        resolve(999999)
                        return
                    }

                    let maxDrift = 0
                    const interval = setInterval(() => {
                        const currentViewport = document.querySelector(
                            selector
                        ) as HTMLElement | null
                        if (!currentViewport) {
                            maxDrift = Math.max(maxDrift, 999999)
                            return
                        }

                        const anchorElement = currentViewport.querySelector(
                            `[data-original-index="${logicalIndex}"]`
                        ) as HTMLElement | null
                        if (!anchorElement) {
                            maxDrift = Math.max(maxDrift, 999999)
                            return
                        }

                        const viewportRect = currentViewport.getBoundingClientRect()
                        const currentOffset =
                            anchorElement.getBoundingClientRect().top - viewportRect.top
                        const d = Math.abs(currentOffset - startOffset)
                        if (d > maxDrift) maxDrift = d
                    }, 50)
                    setTimeout(() => {
                        clearInterval(interval)
                        resolve(maxDrift)
                    }, 2000)
                })
            },
            [VIEWPORT_SELECTOR, anchor!.logicalIndex, anchor!.offsetTop] as const
        )

        // Allow small drift from rounding, but no large visible jumps.
        expect(anchorDrift).toBeLessThan(50)
    })

    test('should re-engage bottom lock when scrolling back to bottom', async ({
        page
    }, testInfo) => {
        await scrollToMaxAndWait(page)

        // Scroll away from bottom using direct scrollTop manipulation for reliability
        await page.evaluate((selector) => {
            const el = document.querySelector(selector) as HTMLElement
            if (!el) return
            el.scrollTop = Math.max(0, el.scrollTop - 1000)
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)
        await page.waitForTimeout(300)

        // Verify we've scrolled away
        const gapAfterScroll = await page.evaluate((selector) => {
            const el = document.querySelector(selector) as HTMLElement
            if (!el) return -1
            return el.scrollHeight - el.clientHeight - el.scrollTop
        }, VIEWPORT_SELECTOR)
        expect(gapAfterScroll).toBeGreaterThan(100)

        // Scroll back to bottom
        await page.evaluate((selector) => {
            const el = document.querySelector(selector) as HTMLElement
            if (el) el.scrollTop = el.scrollHeight - el.clientHeight
        }, VIEWPORT_SELECTOR)
        await page.waitForTimeout(500)

        // Verify bottom lock re-engaged (gap should be <= 2)
        const gapAtBottom = await page.evaluate((selector) => {
            const el = document.querySelector(selector) as HTMLElement
            if (!el) return -1
            return Math.round(el.scrollHeight - el.clientHeight - el.scrollTop)
        }, VIEWPORT_SELECTOR)
        expect(gapAtBottom).toBeLessThanOrEqual(2)

        // Verify Item 0 is visible again
        await expect(page.locator('[data-original-index="0"]').first()).toBeVisible()
    })

    test('should position Item 0 at bottom of viewport', async ({ page }) => {
        // Ensure anchor and Item 0 attachment before measuring positions
        await scrollToMaxAndWait(page)

        await page
            .locator('[data-original-index="0"]')
            .first()
            .waitFor({ state: 'attached', timeout: 3000 })

        // Get the container and Item 0 positions
        const positions = await page.evaluate(() => {
            const container = document.querySelector('.virtual-list-container') as HTMLElement
            const item0 = document.querySelector('[data-original-index="0"]') as HTMLElement

            if (!container || !item0) return null

            const containerRect = container.getBoundingClientRect()
            const itemRect = item0.getBoundingClientRect()

            return {
                containerBottom: containerRect.bottom,
                itemBottom: itemRect.bottom,
                itemTop: itemRect.top,
                containerTop: containerRect.top
            }
        })

        expect(positions).not.toBeNull()

        if (positions) {
            // Item 0 should be near the bottom of the container
            // Allow more margin for scroll bars, padding, viewport differences, etc.
            const margin = 50 // Increased margin to account for browser differences
            const distance = Math.abs(positions.itemBottom - positions.containerBottom)

            // For debugging - log the actual positions if test fails
            if (distance >= margin) {
                console.log('Position debug:', {
                    itemBottom: positions.itemBottom,
                    containerBottom: positions.containerBottom,
                    distance: distance,
                    itemTop: positions.itemTop,
                    containerTop: positions.containerTop
                })
            }

            expect(distance).toBeLessThan(margin)
        }
    })
})
