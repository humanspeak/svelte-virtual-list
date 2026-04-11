import { expect, test, type Page } from '@playwright/test'
import { MULTI_ITEM_SETTLE_MS, rafWait, SETTLE_MS } from '../../src/lib/test/utils/rafWait.js'

/**
 * Comprehensive test suite for bottomToTop mode with dynamic item height changes.
 *
 * This test verifies that when items change height at the bottom of a bottomToTop list,
 * the scroll position remains stable without jumping, maintaining the "stick to bottom" behavior.
 * This is crucial for chat-like applications where message heights might change due to
 * content loading, image rendering, or user interactions.
 */

const PAGE_URL = '/tests/list/bottomToTop/firstItemHeightChange'
const VIEWPORT_SELECTOR = '[data-testid="basic-list-viewport"]'

type BottomToTopDebugSnapshot = {
    scrollTop: number
    maxScrollTop: number
    measuredCount: number
    stagedMeasurementCount: number
    stagedPromotionPending: boolean
    measurementQueueCount: number
    backfillPending: boolean
    gapFromBottomPx: number
}

async function waitForElementHeight(page: Page, testId: string, height: number, timeout = 2000) {
    await page.waitForFunction(
        ({ testId, height }) => {
            const element = document.querySelector(
                `[data-testid="${testId}"]`
            ) as HTMLElement | null
            return element?.offsetHeight === height
        },
        { testId, height },
        { timeout }
    )
}

async function getElementOffsetHeight(page: Page, testId: string) {
    return page
        .locator(`[data-testid="${testId}"]`)
        .evaluate((el) => (el as HTMLElement).offsetHeight)
}

async function getBottomToTopDebug(page: Page): Promise<BottomToTopDebugSnapshot> {
    return page.locator(VIEWPORT_SELECTOR).evaluate((element) => {
        const el = element as HTMLElement & {
            __svlDebug?: {
                measuredCount?: number
                stagedMeasurementCount?: number
                stagedPromotionPending?: boolean
                measurementQueueCount?: number
                backfillPending?: boolean
                gapFromBottomPx?: number
            }
        }
        return {
            scrollTop: Math.round(el.scrollTop),
            maxScrollTop: Math.round(el.scrollHeight - el.clientHeight),
            measuredCount: el.__svlDebug?.measuredCount ?? 0,
            stagedMeasurementCount: el.__svlDebug?.stagedMeasurementCount ?? 0,
            stagedPromotionPending: el.__svlDebug?.stagedPromotionPending ?? false,
            measurementQueueCount: el.__svlDebug?.measurementQueueCount ?? 0,
            backfillPending: el.__svlDebug?.backfillPending ?? false,
            gapFromBottomPx:
                el.__svlDebug?.gapFromBottomPx ??
                Math.round(el.scrollHeight - el.clientHeight - el.scrollTop)
        }
    })
}

async function getTopVisibleAnchor(page: Page) {
    return page.locator(VIEWPORT_SELECTOR).evaluate((element) => {
        const viewport = element as HTMLElement
        const viewportRect = viewport.getBoundingClientRect()
        const candidates = Array.from(
            viewport.querySelectorAll('[data-original-index]')
        ) as HTMLElement[]

        let anchor: { logicalIndex: number; offsetTop: number } | null = null
        let bestDistance = Number.POSITIVE_INFINITY

        for (const candidate of candidates) {
            const rect = candidate.getBoundingClientRect()
            if (rect.bottom <= viewportRect.top || rect.top >= viewportRect.bottom) continue

            const distance = Math.abs(rect.top - viewportRect.top)
            if (distance < bestDistance) {
                bestDistance = distance
                const logicalIndex = Number.parseInt(candidate.dataset.originalIndex || '-1', 10)
                if (logicalIndex >= 0) {
                    anchor = {
                        logicalIndex,
                        offsetTop: rect.top - viewportRect.top
                    }
                }
            }
        }

        return anchor
    })
}

async function getAnchorOffset(page: Page, logicalIndex: number) {
    return page.locator(VIEWPORT_SELECTOR).evaluate((element, currentLogicalIndex) => {
        const viewport = element as HTMLElement
        const viewportRect = viewport.getBoundingClientRect()
        const anchor = viewport.querySelector(
            `[data-original-index="${currentLogicalIndex}"]`
        ) as HTMLElement | null
        if (!anchor) return null
        return anchor.getBoundingClientRect().top - viewportRect.top
    }, logicalIndex)
}

async function getDistanceFromViewportBottom(page: Page, testId: string) {
    return page.locator(VIEWPORT_SELECTOR).evaluate((element, currentTestId) => {
        const viewport = element as HTMLElement
        const viewportRect = viewport.getBoundingClientRect()
        const item = viewport.querySelector(
            `[data-testid="${currentTestId}"]`
        ) as HTMLElement | null
        if (!item) return null

        const itemRect = item.getBoundingClientRect()
        return viewportRect.bottom - itemRect.bottom
    }, testId)
}

test.describe('BottomToTop FirstItemHeightChange', () => {
    test.beforeEach(async ({ page }) => {
        // Install fake timers for page.clock.runFor usage in tests
        await page.clock.install()
        // Navigate to the base page so selectors are present; tests may navigate again with params
        await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('[data-testid="basic-list-container"]')
    })

    test('should expose staged and tracked debug stats on the height change page', async ({
        page
    }) => {
        await expect(page.locator('[data-testid="bottom-to-top-height-stats"]')).toBeVisible()
        await expect(page.locator('[data-testid="stats-measured"]')).toContainText('Measured')
        await expect(page.locator('[data-testid="stats-measured"]')).toContainText('staged')
        await expect(page.locator('[data-testid="stats-measured"]')).toContainText('tracked')
        await expect(page.locator('[data-testid="stats-queue"]')).toContainText('promote')
        await expect(page.locator('[data-testid="stats-queue"]')).toContainText('drain')
    })

    test('should render initial items with correct heights at bottom', async ({ page }) => {
        // Wait for initial render
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Verify initial items are rendered
        const items = await page.locator('[data-testid^="list-item-"]').all()
        expect(items.length).toBeGreaterThan(10) // Should have many items visible

        // Verify initial heights (all should be 20px)
        // Use offsetHeight for cross-browser consistency
        const { h0, h1 } = await page.evaluate(() => {
            const e0 = document.querySelector('[data-testid="list-item-0"]') as HTMLElement
            const e1 = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
            return { h0: e0?.offsetHeight ?? 0, h1: e1?.offsetHeight ?? 0 }
        })
        expect(h0).toBeGreaterThan(10)
        expect(h1).toBeGreaterThan(10)
    })

    test('should position items at bottom of viewport initially', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const container = page.locator('[data-testid="basic-list-container"]')
        const containerBox = await container.boundingBox()

        // Item 0 should be at the very bottom (last visible item)
        const item0 = page.locator('[data-testid="list-item-0"]')
        const item0Box = await item0.boundingBox()

        expect(containerBox).toBeTruthy()
        expect(item0Box).toBeTruthy()

        if (containerBox && item0Box) {
            // Item 0 should be near the bottom of the container
            const distanceFromBottom =
                containerBox.y + containerBox.height - (item0Box.y + item0Box.height)
            expect(distanceFromBottom).toBeLessThan(30) // Allow margin for styling
        }
    })

    test('should detect height change when item 1 grows from 20px to 100px', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-1"]')

        // Get initial height of item 1 (offsetHeight for cross-browser consistency)
        const initialHeight = await page.evaluate(() => {
            const e = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
            return e?.offsetHeight ?? 0
        })
        expect(initialHeight).toBeGreaterThan(10)

        // Trigger the height change by advancing time
        await page.clock.runFor(1000)

        // Wait for the height change to be applied and measured
        await waitForElementHeight(page, 'list-item-1', 100)

        // Verify the height change was applied
        const updatedHeight = await page.evaluate(() => {
            const e = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
            return e?.offsetHeight ?? 0
        })
        expect(updatedHeight).toBe(100)
    })

    test('should maintain bottom scroll position after height change', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const container = page.locator('[data-testid="basic-list-container"]')
        const item0 = page.locator('[data-testid="list-item-0"]')

        // Trigger height change
        await page.clock.runFor(1000)

        // Wait for height change to be processed
        await waitForElementHeight(page, 'list-item-1', 100)

        // Advance fake clock so the scroll correction pipeline settles
        await page.clock.runFor(SETTLE_MS)
        // Flush real browser callbacks (ResizeObserver) not controlled by fake clocks
        await rafWait(page, 2)

        // Verify item 0 is still visible and positioned at bottom
        const finalItem0Box = await item0.boundingBox()
        const containerBox = await container.boundingBox()

        expect(finalItem0Box).toBeTruthy()
        expect(containerBox).toBeTruthy()

        if (finalItem0Box && containerBox) {
            const distanceFromBottom =
                containerBox.y + containerBox.height - (finalItem0Box.y + finalItem0Box.height)

            // Item 0 should still be near the bottom, indicating no unwanted scroll jumping
            expect(distanceFromBottom).toBeLessThan(50)
        }
    })

    test('should keep the bottom anchor visually stable while item 1 grows', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-1"]')

        await page.clock.runFor(1000)
        await waitForElementHeight(page, 'list-item-1', 100)

        const bottomOffsets: number[] = []

        for (let i = 0; i < 10; i++) {
            await rafWait(page, 1)
            const offset = await getDistanceFromViewportBottom(page, 'list-item-0')
            expect(offset).not.toBeNull()
            bottomOffsets.push(offset ?? 0)
            await page.waitForTimeout(100)
        }

        const minOffset = Math.min(...bottomOffsets)
        const maxOffset = Math.max(...bottomOffsets)
        expect(maxOffset - minOffset).toBeLessThanOrEqual(5)
    })

    test('should keep the bottom gap stable after the height change settles', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-1"]')

        await page.clock.runFor(1000)
        await waitForElementHeight(page, 'list-item-1', 100)
        await page.clock.runFor(SETTLE_MS)
        await rafWait(page, 2)

        const gapSamples: number[] = []

        for (let i = 0; i < 10; i++) {
            const sample = await getBottomToTopDebug(page)
            gapSamples.push(sample.gapFromBottomPx)
            await page.waitForTimeout(100)
        }

        const gapOscillation = Math.max(...gapSamples) - Math.min(...gapSamples)

        expect(gapOscillation).toBeLessThanOrEqual(2)
    })

    test('should not cause scroll jumping when height changes', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        // In bottomToTop mode, list-item-0 should be visible at bottom initially
        await expect(page.locator('[data-testid="list-item-0"]')).toBeVisible()

        // Record initial position of item 0 relative to the container bottom
        const container = page.locator('[data-testid="basic-list-container"]')
        const initialContainerBox = await container.boundingBox()
        const initialItem0Box = await page.locator('[data-testid="list-item-0"]').boundingBox()

        // Calculate initial distance from container bottom
        const initialDistanceFromBottom =
            initialContainerBox && initialItem0Box
                ? initialContainerBox.y +
                  initialContainerBox.height -
                  (initialItem0Box.y + initialItem0Box.height)
                : null

        // Trigger height change by navigating with URL parameter
        await page.goto(`${PAGE_URL}?height1=100`, { waitUntil: 'domcontentloaded' })

        // Wait for the page to load and height change to be applied
        await page.waitForSelector('[data-testid="basic-list-container"]')

        // After height change - wait for list-item-1 to have the new height
        await waitForElementHeight(page, 'list-item-1', 100, 5000)

        // Advance fake clock so the scroll correction pipeline settles
        await page.clock.runFor(SETTLE_MS)
        // Flush real browser callbacks (ResizeObserver) not controlled by fake clocks
        await rafWait(page, 2)

        // CRITICAL: In bottomToTop mode, list-item-0 should STILL be visible in viewport after height change
        // This is the main test - if we see middle items (like Item 131) instead, the test should fail
        await expect(page.locator('[data-testid="list-item-0"]')).toBeVisible({
            timeout: 1050
        })

        await page.clock.runFor(SETTLE_MS)
        await rafWait(page, 2)

        // Get fresh references after navigation
        const finalContainerBox = await page
            .locator('[data-testid="basic-list-container"]')
            .boundingBox()
        const finalItem0Box = await page.locator('[data-testid="list-item-0"]').boundingBox()

        // Calculate final distance from container bottom
        const finalDistanceFromBottom =
            finalContainerBox && finalItem0Box
                ? finalContainerBox.y +
                  finalContainerBox.height -
                  (finalItem0Box.y + finalItem0Box.height)
                : null

        // In bottomToTop mode, item 0 should remain anchored near the bottom of the container
        // Compare the distance from bottom rather than absolute Y position (which changes on navigation)
        if (initialDistanceFromBottom !== null && finalDistanceFromBottom !== null) {
            const distanceDifference = Math.abs(finalDistanceFromBottom - initialDistanceFromBottom)
            expect(distanceDifference).toBeLessThan(200) // Allow some cross-browser variance
        }
    })

    test('should not drift back toward bottom after scrolling away post-resize', async ({
        page
    }) => {
        const viewport = page.locator(VIEWPORT_SELECTOR)

        await page.waitForSelector('[data-testid="list-item-1"]')
        await page.clock.runFor(1000)
        await waitForElementHeight(page, 'list-item-1', 100)
        await rafWait(page, 2)

        await viewport.evaluate((el) => {
            el.scrollTop = Math.max(0, el.scrollTop - 600)
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        })
        await page.waitForTimeout(200)

        const initialSample = await getBottomToTopDebug(page)

        expect(initialSample.maxScrollTop - initialSample.scrollTop).toBeGreaterThan(100)

        let maxDrift = 0
        let maxMeasuredCount = initialSample.measuredCount
        let maxStagedCount = initialSample.stagedMeasurementCount

        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(200)
            const sample = await getBottomToTopDebug(page)
            maxDrift = Math.max(maxDrift, Math.abs(sample.scrollTop - initialSample.scrollTop))
            maxMeasuredCount = Math.max(maxMeasuredCount, sample.measuredCount)
            maxStagedCount = Math.max(maxStagedCount, sample.stagedMeasurementCount)
        }

        expect(maxMeasuredCount).toBe(initialSample.measuredCount)
        expect(maxStagedCount).toBeGreaterThan(0)
        expect(maxDrift).toBeLessThan(50)
    })

    test.fixme('should keep a visible height change stable while scrolled away', async ({
        page
    }) => {
        // Known bug: a visible resize while scrolled away can move the viewport anchor
        // due to the averageHeight cascade. Drift is non-deterministic (sometimes <50px,
        // sometimes >100px) so test.fail(true) doesn't work here.
        await page.goto(`${PAGE_URL}?height10=140`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('[data-testid="basic-list-container"]')
        await page.waitForSelector('[data-testid="list-item-10"]')

        const viewport = page.locator(VIEWPORT_SELECTOR)
        await viewport.evaluate((el) => {
            el.scrollTop = Math.max(0, el.scrollTop - 240)
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        })
        await page.waitForTimeout(200)

        await expect(page.locator('[data-testid="list-item-10"]')).toBeVisible()

        const anchor = await getTopVisibleAnchor(page)
        expect(anchor).toBeTruthy()

        await page.clock.runFor(1000)
        await waitForElementHeight(page, 'list-item-10', 140)

        let maxAnchorDrift = 0

        for (let i = 0; i < 8; i++) {
            await page.waitForTimeout(100)
            await getBottomToTopDebug(page)

            if (anchor) {
                const currentOffset = await getAnchorOffset(page, anchor.logicalIndex)
                if (currentOffset !== null) {
                    maxAnchorDrift = Math.max(
                        maxAnchorDrift,
                        Math.abs(currentOffset - anchor.offsetTop)
                    )
                }
            }
        }

        await expect(page.locator('[data-testid="list-item-10"]')).toBeVisible()
        expect(maxAnchorDrift).toBeLessThan(50)
    })

    test('should promote staged measurements when they approach the visible band', async ({
        page
    }) => {
        const viewport = page.locator(VIEWPORT_SELECTOR)

        await page.waitForSelector('[data-testid="list-item-1"]')
        await page.clock.runFor(1000)
        await waitForElementHeight(page, 'list-item-1', 100)
        await rafWait(page, 2)

        await viewport.evaluate((el) => {
            el.scrollTop = Math.max(0, el.scrollTop - 600)
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        })

        let stagedPeak = 0
        for (let i = 0; i < 12; i++) {
            await page.waitForTimeout(200)
            const sample = await getBottomToTopDebug(page)
            stagedPeak = Math.max(stagedPeak, sample.stagedMeasurementCount)
        }

        expect(stagedPeak).toBeGreaterThan(0)

        const beforePromotion = await getBottomToTopDebug(page)
        await viewport.evaluate((el) => {
            el.scrollTop = Math.max(0, el.scrollTop - 1800)
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        })
        await page.waitForTimeout(200)

        const anchor = await getTopVisibleAnchor(page)
        expect(anchor).toBeTruthy()

        let maxAnchorDrift = 0
        let maxMeasuredCount = beforePromotion.measuredCount
        let minStagedCount = beforePromotion.stagedMeasurementCount

        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(200)
            const sample = await getBottomToTopDebug(page)
            maxMeasuredCount = Math.max(maxMeasuredCount, sample.measuredCount)
            minStagedCount = Math.min(minStagedCount, sample.stagedMeasurementCount)

            if (anchor) {
                const currentOffset = await getAnchorOffset(page, anchor.logicalIndex)
                if (currentOffset !== null) {
                    maxAnchorDrift = Math.max(
                        maxAnchorDrift,
                        Math.abs(currentOffset - anchor.offsetTop)
                    )
                }
            }
        }

        expect(maxMeasuredCount).toBeGreaterThan(beforePromotion.measuredCount)
        expect(minStagedCount).toBeLessThan(beforePromotion.stagedMeasurementCount)
        expect(maxAnchorDrift).toBeLessThan(50)
    })

    test('should drain staged measurements when returning to bottom', async ({ page }) => {
        const viewport = page.locator(VIEWPORT_SELECTOR)

        await page.waitForSelector('[data-testid="list-item-1"]')
        await page.clock.runFor(1000)
        await waitForElementHeight(page, 'list-item-1', 100)
        await rafWait(page, 2)

        await viewport.evaluate((el) => {
            el.scrollTop = Math.max(0, el.scrollTop - 600)
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        })

        let stagedPeak = 0
        for (let i = 0; i < 12; i++) {
            await page.waitForTimeout(200)
            const sample = await getBottomToTopDebug(page)
            stagedPeak = Math.max(stagedPeak, sample.stagedMeasurementCount)
        }

        expect(stagedPeak).toBeGreaterThan(0)

        const beforeReturn = await getBottomToTopDebug(page)
        await viewport.evaluate((el) => {
            el.scrollTop = el.scrollHeight - el.clientHeight
            el.dispatchEvent(new Event('scroll', { bubbles: true }))
        })

        // Wait for staged measurements to drain after returning to bottom
        await page.waitForFunction(
            (selector) => {
                const el = document.querySelector(selector) as HTMLElement & {
                    __svlDebug?: { stagedMeasurementCount?: number }
                }
                return (el?.__svlDebug?.stagedMeasurementCount ?? -1) === 0
            },
            VIEWPORT_SELECTOR,
            { timeout: 10000 }
        )

        const finalSample = await getBottomToTopDebug(page)
        expect(finalSample.stagedMeasurementCount).toBe(0)
        expect(finalSample.measuredCount).toBeGreaterThan(beforeReturn.measuredCount)
        expect(finalSample.gapFromBottomPx).toBeLessThanOrEqual(2)
    })

    test('should handle multiple sequential height changes smoothly', async ({ page }) => {
        // Navigate with sequence: 100px → 150px → 50px (every 1 second)
        await page.goto(`${PAGE_URL}?height1=100,150,50`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('[data-testid="list-item-1"]')

        // Wait for first height change (100px)
        await waitForElementHeight(page, 'list-item-1', 100)

        // Wait for second height change (150px)
        await waitForElementHeight(page, 'list-item-1', 150)

        // Wait for third height change (50px)
        await waitForElementHeight(page, 'list-item-1', 50)

        // Verify final height
        expect(await getElementOffsetHeight(page, 'list-item-1')).toBe(50)

        // In bottomToTop mode, large scroll adjustments are expected to maintain bottom anchor
        // const finalScrollTop = await viewport.evaluate((el) => el.scrollTop)
        // const scrollDifference = Math.abs(finalScrollTop - initialScrollTop)
        // console.log(`Sequential height changes caused ${scrollDifference}px scroll adjustment`)
    })

    test('should handle large height changes without breaking layout', async ({ page }) => {
        // Navigate with sequence: 100px → 500px (very large change)
        await page.goto(`${PAGE_URL}?height1=100,500`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('[data-testid="list-item-1"]')

        const viewport = page.locator('[data-testid="basic-list-viewport"]')

        // Wait for initial height change (100px)
        await waitForElementHeight(page, 'list-item-1', 100)

        // Wait for large height change (500px)
        await waitForElementHeight(page, 'list-item-1', 500)

        // Verify the large item is properly rendered
        expect(await getElementOffsetHeight(page, 'list-item-1')).toBe(500)

        // Verify container is still scrollable and functional
        expect(await getElementOffsetHeight(page, 'basic-list-container')).toBe(500)

        // Verify we can still scroll within the viewport
        const scrollHeight = await viewport.evaluate((el) => el.scrollHeight)
        expect(scrollHeight).toBeGreaterThan(500) // Should have scrollable content
    })

    test('should handle height changes on multiple items simultaneously', async ({ page }) => {
        // Navigate once with all height changes applied
        await page.goto(`${PAGE_URL}?height0=80&height1=100&height2=120&height3=60`, {
            waitUntil: 'domcontentloaded'
        })
        await page.waitForSelector('[data-testid="basic-list-container"]')

        // Wait for all changes to be applied
        await page.waitForFunction(
            () => {
                const item0 = document.querySelector(
                    '[data-testid="list-item-0"]'
                ) as HTMLElement | null
                const item1 = document.querySelector(
                    '[data-testid="list-item-1"]'
                ) as HTMLElement | null
                const item2 = document.querySelector(
                    '[data-testid="list-item-2"]'
                ) as HTMLElement | null
                const item3 = document.querySelector(
                    '[data-testid="list-item-3"]'
                ) as HTMLElement | null

                return (
                    item0?.offsetHeight === 80 &&
                    item1?.offsetHeight === 100 &&
                    item2?.offsetHeight === 120 &&
                    item3?.offsetHeight === 60
                )
            },
            { timeout: 3000 }
        )

        // Verify all heights are correct
        expect(await getElementOffsetHeight(page, 'list-item-0')).toBe(80)
        expect(await getElementOffsetHeight(page, 'list-item-1')).toBe(100)
        expect(await getElementOffsetHeight(page, 'list-item-2')).toBe(120)
        expect(await getElementOffsetHeight(page, 'list-item-3')).toBe(60)
        await page.clock.runFor(MULTI_ITEM_SETTLE_MS)
        // Flush real browser callbacks (ResizeObserver) not controlled by fake clocks
        await rafWait(page, 2)

        // Verify layout is still coherent (no overlapping or gaps)
        const item0Box = await page.locator('[data-testid="list-item-0"]').boundingBox()
        const item1Box = await page.locator('[data-testid="list-item-1"]').boundingBox()

        if (item0Box && item1Box) {
            // In bottomToTop mode, item 1 should be directly above item 0
            const gap = item0Box.y - (item1Box.y + item1Box.height)
            expect(Math.abs(gap)).toBeLessThan(10) // Should be adjacent with minimal gap
        }
    })

    test('should maintain proper stacking order after height changes', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-4"]')

        // Get initial positions
        const getItemPositions = async () => {
            const positions: Array<{ id: string; y: number }> = []
            for (let i = 0; i <= 4; i++) {
                const item = page.locator(`[data-testid="list-item-${i}"]`)
                const box = await item.boundingBox()
                if (box) {
                    positions.push({ id: `item-${i}`, y: box.y })
                }
            }
            return positions.sort((a, b) => a.y - b.y) // Sort by Y position
        }

        // Trigger multiple height changes simultaneously via URL navigation
        await page.goto(`${PAGE_URL}?height1=100&height3=150`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('[data-testid="basic-list-container"]')

        // Wait for both height changes to be applied
        await page.waitForFunction(
            () => {
                const item1 = document.querySelector(
                    '[data-testid="list-item-1"]'
                ) as HTMLElement | null
                const item3 = document.querySelector(
                    '[data-testid="list-item-3"]'
                ) as HTMLElement | null
                return item1?.offsetHeight === 100 && item3?.offsetHeight === 150
            },
            { timeout: 2000 }
        )

        const finalPositions = await getItemPositions()

        // In bottomToTop mode, higher indexed items should appear lower on screen
        // Verify the stacking order is maintained: item-4, item-3, item-2, item-1, item-0 (top to bottom)
        expect(finalPositions[0].id).toBe('item-4') // Topmost
        expect(finalPositions[finalPositions.length - 1].id).toBe('item-0') // Bottommost

        // Verify all items are still in correct order
        const expectedOrder = ['item-4', 'item-3', 'item-2', 'item-1', 'item-0']
        finalPositions.forEach((pos, index) => {
            expect(pos.id).toBe(expectedOrder[index])
        })
    })
})
