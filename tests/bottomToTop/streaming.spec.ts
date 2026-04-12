import { expect, test } from '@playwright/test'
import { waitForLockedBottom } from '../../src/lib/test/utils/bottomToTopHelpers.js'
import { rafWait, SETTLE_MS } from '../../src/lib/test/utils/rafWait.js'

const VIEWPORT_SELECTOR = '[data-testid="streaming-list-viewport"]'

const getStreamingDebugState = (selector: string) => {
    const viewport = document.querySelector(selector) as
        | (HTMLElement & {
              __svlDebug?: {
                  measuredCount?: number
                  stagedMeasurementCount?: number
                  stagedDrainActive?: boolean
                  stagedDrainScheduled?: boolean
                  gapFromBottomPx?: number
                  scrollHeightPx?: number
                  clientHeightPx?: number
                  totalHeightPx?: number
                  maxScrollTopPx?: number
              }
          })
        | null
    if (!viewport) return null
    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    return {
        scrollTop: Math.round(viewport.scrollTop),
        maxScroll: Math.round(maxScroll),
        gap: viewport.__svlDebug?.gapFromBottomPx ?? Math.round(maxScroll - viewport.scrollTop),
        scrollHeightPx: viewport.__svlDebug?.scrollHeightPx ?? Math.round(viewport.scrollHeight),
        clientHeightPx: viewport.__svlDebug?.clientHeightPx ?? Math.round(viewport.clientHeight),
        totalHeightPx: viewport.__svlDebug?.totalHeightPx ?? Math.round(viewport.scrollHeight),
        maxScrollTopPx: viewport.__svlDebug?.maxScrollTopPx ?? Math.round(maxScroll),
        measuredCount: viewport.__svlDebug?.measuredCount ?? 0,
        stagedMeasurementCount: viewport.__svlDebug?.stagedMeasurementCount ?? 0,
        stagedDrainActive: viewport.__svlDebug?.stagedDrainActive ?? false,
        stagedDrainScheduled: viewport.__svlDebug?.stagedDrainScheduled ?? false
    }
}

const waitForStreamingLockedBottom = (page: import('@playwright/test').Page) =>
    waitForLockedBottom(page, VIEWPORT_SELECTOR)

const getScrollState = (selector: string) => {
    const viewport = document.querySelector(selector) as HTMLElement | null
    if (!viewport) return null
    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    return {
        scrollTop: Math.round(viewport.scrollTop),
        maxScroll: Math.round(maxScroll),
        gap: Math.round(maxScroll - viewport.scrollTop)
    }
}

const getNewestMessageDistanceFromBottom = (selector: string) => {
    const viewport = document.querySelector(selector) as HTMLElement | null
    if (!viewport) return null

    const viewportRect = viewport.getBoundingClientRect()
    const newestMessage = viewport.querySelector('[data-original-index="0"]') as HTMLElement | null
    if (!newestMessage) return null

    const messageRect = newestMessage.getBoundingClientRect()
    return viewportRect.bottom - messageRect.bottom
}

const getTopVisibleAnchor = (selector: string) => {
    const viewport = document.querySelector(selector) as HTMLElement | null
    if (!viewport) return null

    const viewportRect = viewport.getBoundingClientRect()
    const candidates = Array.from(
        viewport.querySelectorAll('[data-original-index]')
    ) as HTMLElement[]

    let anchor: { logicalIndex: number; offsetTop: number } | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const candidate of candidates) {
        const rect = candidate.getBoundingClientRect()
        if (rect.bottom <= viewportRect.top || rect.top >= viewportRect.bottom) continue

        const logicalIndex = Number.parseInt(candidate.dataset.originalIndex || '-1', 10)
        if (logicalIndex < 0) continue

        const distance = Math.abs(rect.top - viewportRect.top)
        if (distance < bestDistance) {
            bestDistance = distance
            anchor = {
                logicalIndex,
                offsetTop: rect.top - viewportRect.top
            }
        }
    }

    return anchor
}

const expectBottomGeometryAligned = (
    state: NonNullable<ReturnType<typeof getStreamingDebugState>>
) => {
    expect(state.gap).toBeLessThanOrEqual(2)
    expect(Math.abs(state.scrollHeightPx - state.totalHeightPx)).toBeLessThanOrEqual(2)
}

test.describe('BottomToTop Streaming Chat', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/list/bottomToTop/streaming', {
            waitUntil: 'domcontentloaded'
        })
        // Wait for component to initialize and measure heights
        await rafWait(page, 3)
        await page.waitForTimeout(SETTLE_MS)
    })

    test('should start fully scrolled to the bottom', async ({ page }) => {
        // Wait for height measurements to stabilize
        await page.waitForTimeout(500)

        const scrollState = await page.evaluate(getScrollState, VIEWPORT_SELECTOR)

        expect(scrollState).not.toBeNull()
        // The list should be within 2px of the maximum scroll position (fully at bottom)
        expect(scrollState!.gap).toBeLessThanOrEqual(2)
    })

    test('should keep DOM scroll height aligned with list geometry at bottom', async ({ page }) => {
        await page.waitForTimeout(500)

        const debugState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)

        expect(debugState).not.toBeNull()
        expectBottomGeometryAligned(debugState!)
    })

    test('should stage offscreen backfill while bottom-locked on initial load', async ({
        page
    }) => {
        await page.goto('/tests/list/bottomToTop/streaming', {
            waitUntil: 'domcontentloaded'
        })
        await page.waitForSelector(VIEWPORT_SELECTOR)
        await waitForStreamingLockedBottom(page)

        const measuredCounts: number[] = []
        const trackedCounts: number[] = []
        const stagedCounts: number[] = []
        const gaps: number[] = []

        for (let i = 0; i < 16; i++) {
            const debugState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
            expect(debugState).not.toBeNull()

            measuredCounts.push(debugState!.measuredCount)
            trackedCounts.push(debugState!.measuredCount + debugState!.stagedMeasurementCount)
            stagedCounts.push(debugState!.stagedMeasurementCount)
            gaps.push(debugState!.gap)

            await page.waitForTimeout(75)
        }

        expect(Math.max(...trackedCounts)).toBeGreaterThan(Math.min(...trackedCounts))
        expect(Math.max(...measuredCounts)).toBeGreaterThan(0)
        expect(Math.max(...stagedCounts)).toBeGreaterThan(0)
        expect(Math.max(...gaps)).toBeLessThanOrEqual(2)
    })

    test('should keep the newest message visually stable while bottom-locked backfill runs', async ({
        page
    }) => {
        await page.goto('/tests/list/bottomToTop/streaming', {
            waitUntil: 'domcontentloaded'
        })
        await page.waitForSelector(VIEWPORT_SELECTOR)
        await waitForStreamingLockedBottom(page)

        const offsets: number[] = []

        for (let i = 0; i < 10; i++) {
            const offset = await page.evaluate(
                getNewestMessageDistanceFromBottom,
                VIEWPORT_SELECTOR
            )
            expect(offset).not.toBeNull()
            offsets.push(offset ?? 0)

            const debugState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
            expect(debugState).not.toBeNull()
            expect(debugState!.gap).toBeLessThanOrEqual(2)

            await page.waitForTimeout(100)
        }

        const oscillation = Math.max(...offsets) - Math.min(...offsets)
        expect(oscillation).toBeLessThanOrEqual(5)
    })

    test('should keep the top visible anchor stable during initial backfill', async ({ page }) => {
        await page.goto('/tests/list/bottomToTop/streaming', {
            waitUntil: 'domcontentloaded'
        })
        await page.waitForSelector(VIEWPORT_SELECTOR)
        await waitForStreamingLockedBottom(page)

        const initialAnchor = await page.evaluate(getTopVisibleAnchor, VIEWPORT_SELECTOR)
        expect(initialAnchor).not.toBeNull()

        const offsetSamples: number[] = []

        for (let i = 0; i < 12; i++) {
            const currentOffset = await page.evaluate(
                ({ selector, logicalIndex }) => {
                    const viewport = document.querySelector(selector) as HTMLElement | null
                    if (!viewport) return null

                    const viewportRect = viewport.getBoundingClientRect()
                    const anchor = viewport.querySelector(
                        `[data-original-index="${logicalIndex}"]`
                    ) as HTMLElement | null
                    if (!anchor) return null

                    return anchor.getBoundingClientRect().top - viewportRect.top
                },
                {
                    selector: VIEWPORT_SELECTOR,
                    logicalIndex: initialAnchor!.logicalIndex
                }
            )

            expect(currentOffset).not.toBeNull()
            offsetSamples.push(currentOffset ?? 0)

            const debugState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
            expect(debugState).not.toBeNull()

            await page.waitForTimeout(100)
        }

        const oscillation = Math.max(...offsetSamples) - Math.min(...offsetSamples)
        expect(oscillation).toBeLessThanOrEqual(5)
    })

    test('should keep offscreen measurements staged while bottom-locked', async ({ page }) => {
        await page.goto('/tests/list/bottomToTop/streaming', {
            waitUntil: 'domcontentloaded'
        })
        await page.waitForSelector(VIEWPORT_SELECTOR)
        await waitForStreamingLockedBottom(page)

        const stagedCounts: number[] = []
        const gaps: number[] = []
        const scrollTops: number[] = []

        for (let i = 0; i < 28; i++) {
            const debugState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
            expect(debugState).not.toBeNull()

            stagedCounts.push(debugState!.stagedMeasurementCount)
            gaps.push(debugState!.gap)
            scrollTops.push(debugState!.scrollTop)
            expect(debugState!.stagedDrainActive).toBe(false)
            expect(debugState!.stagedDrainScheduled).toBe(false)

            await page.waitForTimeout(100)
        }

        const peakStaged = Math.max(...stagedCounts)
        const finalStaged = stagedCounts.at(-1) ?? 0

        expect(peakStaged).toBeGreaterThan(0)
        expect(finalStaged).toBeGreaterThan(0)
        expect(Math.max(...gaps)).toBeLessThanOrEqual(2)
        expect(Math.max(...scrollTops) - Math.min(...scrollTops)).toBeLessThanOrEqual(1)
    })

    test('should keep DOM scroll height aligned with list geometry during bottom-locked staged backfill', async ({
        page
    }) => {
        await page.goto('/tests/list/bottomToTop/streaming', {
            waitUntil: 'domcontentloaded'
        })
        await page.waitForSelector(VIEWPORT_SELECTOR)
        await waitForStreamingLockedBottom(page)

        const heightDeltas: number[] = []
        const gaps: number[] = []
        let sawStagedWork = false

        for (let i = 0; i < 24; i++) {
            const debugState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
            expect(debugState).not.toBeNull()

            heightDeltas.push(Math.abs(debugState!.scrollHeightPx - debugState!.totalHeightPx))
            gaps.push(debugState!.gap)
            sawStagedWork = sawStagedWork || debugState!.stagedMeasurementCount > 0

            await page.waitForTimeout(100)
        }

        expect(sawStagedWork).toBe(true)
        expect(Math.max(...heightDeltas)).toBeLessThanOrEqual(2)
        expect(Math.max(...gaps)).toBeLessThanOrEqual(2)
    })

    test('should stay locked to bottom after sending a message', async ({ page }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('send-button').click()

        for (const waitMs of [0, 50, 120, 250, 500, 900, 1400]) {
            if (waitMs > 0) {
                await page.waitForTimeout(waitMs)
            }

            const scrollState = await page.evaluate(getScrollState, VIEWPORT_SELECTOR)
            expect(scrollState).not.toBeNull()
            expect(scrollState!.gap).toBeLessThanOrEqual(2)

            const debugState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
            expect(debugState).not.toBeNull()
            expectBottomGeometryAligned(debugState!)
        }
    })

    test('should stay locked to bottom during stress test bursts', async ({ page }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        for (const waitMs of [0, 50, 120, 250, 500, 900, 1400, 2200, 3200, 4500]) {
            if (waitMs > 0) {
                await page.waitForTimeout(waitMs)
            }

            const scrollState = await page.evaluate(getScrollState, VIEWPORT_SELECTOR)
            expect(scrollState).not.toBeNull()
            expect(scrollState!.gap).toBeLessThanOrEqual(2)
        }
    })

    test('should drain staged measurements when returning to bottom after scrolling away', async ({
        page
    }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        await page.waitForFunction(
            (selector) => {
                const viewport = document.querySelector(selector) as HTMLElement | null
                if (!viewport) return false
                return viewport.scrollHeight - viewport.clientHeight > 800
            },
            VIEWPORT_SELECTOR,
            { timeout: 10000 }
        )

        await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return
            const maxScroll = viewport.scrollHeight - viewport.clientHeight
            viewport.scrollTop = Math.max(0, maxScroll - 600)
            viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)

        await page.waitForFunction(
            (selector) => {
                const debug = (
                    document.querySelector(selector) as
                        | (HTMLElement & {
                              __svlDebug?: {
                                  stagedMeasurementCount?: number
                                  gapFromBottomPx?: number
                              }
                          })
                        | null
                )?.__svlDebug
                return (debug?.stagedMeasurementCount ?? 0) > 0
            },
            VIEWPORT_SELECTOR,
            { timeout: 10000 }
        )

        const awayState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
        expect(awayState).not.toBeNull()
        expect(awayState!.gap).toBeGreaterThan(100)
        expect(awayState!.stagedMeasurementCount).toBeGreaterThan(0)

        await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return
            viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight
            viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)

        await page.waitForFunction(
            (selector) => {
                const viewport = document.querySelector(selector) as
                    | (HTMLElement & {
                          __svlDebug?: {
                              stagedMeasurementCount?: number
                              gapFromBottomPx?: number
                          }
                      })
                    | null
                if (!viewport) return false
                const gap =
                    viewport.__svlDebug?.gapFromBottomPx ??
                    viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
                return (viewport.__svlDebug?.stagedMeasurementCount ?? 0) === 0 && gap <= 2
            },
            VIEWPORT_SELECTOR,
            { timeout: 10000 }
        )

        const finalState = await page.evaluate(getStreamingDebugState, VIEWPORT_SELECTOR)
        expect(finalState).not.toBeNull()
        expect(finalState!.stagedMeasurementCount).toBe(0)
        expect(finalState!.gap).toBeLessThanOrEqual(2)
    })

    test('should allow multiple assistant streams concurrently during stress test', async ({
        page
    }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        await page.waitForFunction(
            () => {
                const status = document.querySelector('[data-testid="stream-status"]')
                const streamingTags = document.querySelectorAll('.streaming-tag')
                const statusText = status?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
                return statusText.includes('Active streams: 5') && streamingTags.length === 5
            },
            undefined,
            { timeout: 10000 }
        )

        await expect(page.locator('.streaming-tag')).toHaveCount(5)
    })

    test('should clear all streaming indicators after stress test completes', async ({ page }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        await page.waitForFunction(
            () => {
                const status = document.querySelector('[data-testid="stream-status"]')
                const streamingTags = document.querySelectorAll('.streaming-tag')
                const statusText = status?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
                return (
                    statusText.includes('Streaming: false') &&
                    statusText.includes('Active streams: 0') &&
                    statusText.includes('Pending starts: 0') &&
                    streamingTags.length === 0
                )
            },
            undefined,
            { timeout: 30000 }
        )

        await expect(page.locator('.streaming-tag')).toHaveCount(0)
    })

    test('should keep rendering items when scrolling upward after stress test completes', async ({
        page
    }) => {
        await page.waitForTimeout(500)
        await page.getByTestId('stress-button').click()

        await page.waitForFunction(
            () => {
                const status = document.querySelector('[data-testid="stream-status"]')
                const statusText = status?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
                return (
                    statusText.includes('Streaming: false') &&
                    statusText.includes('Active streams: 0') &&
                    statusText.includes('Pending starts: 0')
                )
            },
            undefined,
            { timeout: 30000 }
        )

        await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return
            const maxScroll = viewport.scrollHeight - viewport.clientHeight
            viewport.scrollTop = Math.floor(maxScroll * 0.5)
            viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, VIEWPORT_SELECTOR)

        await rafWait(page, 3)
        await page.waitForTimeout(SETTLE_MS)

        const visibleCount = await page.evaluate((selector) => {
            const viewport = document.querySelector(selector) as HTMLElement | null
            if (!viewport) return -1
            const viewportRect = viewport.getBoundingClientRect()
            const items = Array.from(document.querySelectorAll('[data-original-index]'))
            return items.filter((item) => {
                const rect = item.getBoundingClientRect()
                return rect.bottom > viewportRect.top && rect.top < viewportRect.bottom
            }).length
        }, VIEWPORT_SELECTOR)

        expect(visibleCount).toBeGreaterThan(0)
    })
})
