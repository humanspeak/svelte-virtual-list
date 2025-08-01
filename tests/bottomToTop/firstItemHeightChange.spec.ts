import { expect, test } from '@playwright/test'

// Type definition for the test items
interface TestItem {
    id: number
    text: string
    height: number
}

// Type definition for window globals used in tests
declare global {
    interface Window {
        items?: TestItem[]
    }
}

/**
 * Comprehensive test suite for bottomToTop mode with dynamic item height changes.
 *
 * This test verifies that when items change height at the bottom of a bottomToTop list,
 * the scroll position remains stable without jumping, maintaining the "stick to bottom" behavior.
 * This is crucial for chat-like applications where message heights might change due to
 * content loading, image rendering, or user interactions.
 */

const PAGE_URL = '/tests/bottomToTop/firstItemHeightChange'

test.describe('BottomToTop FirstItemHeightChange', () => {
    test.beforeEach(async ({ page }) => {
        // Install fake timers to control setTimeout in the component
        await page.clock.install()
        await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="basic-list-container"]')
    })

    test('should render initial items with correct heights at bottom', async ({ page }) => {
        // Wait for initial render
        await page.waitForSelector('[data-testid="list-item-0"]')

        // Verify initial items are rendered
        const items = await page.locator('[data-testid^="list-item-"]').all()
        expect(items.length).toBeGreaterThan(10) // Should have many items visible

        // Verify initial heights (all should be 20px)
        const item0 = page.locator('[data-testid="list-item-0"]')
        const item1 = page.locator('[data-testid="list-item-1"]')

        const item0Box = await item0.boundingBox()
        const item1Box = await item1.boundingBox()

        expect(item0Box?.height).toBe(20)
        expect(item1Box?.height).toBe(20)
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

        // Get initial height of item 1
        const item1 = page.locator('[data-testid="list-item-1"]')
        const initialBox = await item1.boundingBox()
        expect(initialBox?.height).toBe(20)

        // Trigger the height change by advancing time
        await page.clock.runFor(1000)

        // Wait for the height change to be applied and measured
        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 100
            },
            { timeout: 2000 }
        )

        // Verify the height change was applied
        const updatedBox = await item1.boundingBox()
        expect(updatedBox?.height).toBe(100)
    })

    test('should maintain bottom scroll position after height change', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const container = page.locator('[data-testid="basic-list-container"]')
        const item0 = page.locator('[data-testid="list-item-0"]')

        // Trigger height change
        await page.clock.runFor(1000)

        // Wait for height change to be processed
        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 100
            },
            { timeout: 2000 }
        )

        // Allow some time for any scroll corrections to settle
        await page.waitForTimeout(100)

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

    test('should not cause scroll jumping when height changes', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-0"]')

        const viewport = page.locator('[data-testid="basic-list-viewport"]')

        // Record initial state
        const initialScrollTop = await viewport.evaluate((el) => el.scrollTop)
        const item0 = page.locator('[data-testid="list-item-0"]')
        const initialItem0Y = (await item0.boundingBox())?.y

        // Trigger height change
        await page.clock.runFor(1000)

        // Wait for height change
        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 100
            },
            { timeout: 2000 }
        )

        // Check final state
        const finalScrollTop = await viewport.evaluate((el) => el.scrollTop)
        const finalItem0Y = (await item0.boundingBox())?.y

        // The scroll position should be stable or have minimal change
        // (some change is expected due to height adjustment, but no wild jumping)
        const scrollDifference = Math.abs(finalScrollTop - initialScrollTop)
        expect(scrollDifference).toBeLessThan(200) // Allow reasonable adjustment

        // Item 0 should remain roughly in the same vertical position relative to viewport
        if (initialItem0Y && finalItem0Y) {
            const verticalDifference = Math.abs(finalItem0Y - initialItem0Y)
            expect(verticalDifference).toBeLessThan(100) // Should be relatively stable
        }
    })

    test('should handle multiple sequential height changes smoothly', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-1"]')

        const item1 = page.locator('[data-testid="list-item-1"]')
        const viewport = page.locator('[data-testid="basic-list-viewport"]')

        // Initial state
        expect((await item1.boundingBox())?.height).toBe(20)
        const initialScrollTop = await viewport.evaluate((el) => el.scrollTop)

        // First height change (20px -> 100px)
        await page.clock.runFor(1000)
        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 100
            },
            { timeout: 2000 }
        )

        // Second height change via JavaScript
        await page.evaluate(() => {
            const items = window.items || []
            if (items[1]) {
                items[1].height = 150
            }
        })

        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 150
            },
            { timeout: 2000 }
        )

        // Third height change
        await page.evaluate(() => {
            const items = window.items || []
            if (items[1]) {
                items[1].height = 50
            }
        })

        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 50
            },
            { timeout: 2000 }
        )

        // Verify final height
        expect((await item1.boundingBox())?.height).toBe(50)

        // Verify scroll position remained stable throughout
        const finalScrollTop = await viewport.evaluate((el) => el.scrollTop)
        const scrollDifference = Math.abs(finalScrollTop - initialScrollTop)
        expect(scrollDifference).toBeLessThan(300) // Allow for cumulative adjustments
    })

    test('should handle large height changes without breaking layout', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-1"]')

        const item1 = page.locator('[data-testid="list-item-1"]')
        const container = page.locator('[data-testid="basic-list-container"]')
        const viewport = page.locator('[data-testid="basic-list-viewport"]')

        // Trigger initial height change
        await page.clock.runFor(1000)
        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 100
            },
            { timeout: 2000 }
        )

        // Make a very large height change
        await page.evaluate(() => {
            const items = window.items || []
            if (items[1]) {
                items[1].height = 500 // Very large item
            }
        })

        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 500
            },
            { timeout: 2000 }
        )

        // Verify the large item is properly rendered
        const finalBox = await item1.boundingBox()
        expect(finalBox?.height).toBe(500)

        // Verify container is still scrollable and functional
        const containerHeight = (await container.boundingBox())?.height
        expect(containerHeight).toBe(500) // Container should maintain its size

        // Verify we can still scroll within the viewport
        const scrollHeight = await viewport.evaluate((el) => el.scrollHeight)
        expect(scrollHeight).toBeGreaterThan(500) // Should have scrollable content
    })

    test('should handle height changes on multiple items simultaneously', async ({ page }) => {
        await page.waitForSelector('[data-testid="list-item-2"]')

        // Trigger initial height change
        await page.clock.runFor(1000)

        // Wait for first change to process
        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 100
            },
            { timeout: 2000 }
        )

        // Change multiple items at once
        await page.evaluate(() => {
            const items = window.items || []
            if (items[0]) items[0].height = 80
            if (items[2]) items[2].height = 120
            if (items[3]) items[3].height = 60
        })

        // Wait for all changes to be applied
        await page.waitForFunction(
            () => {
                const item0 = document.querySelector('[data-testid="list-item-0"]') as HTMLElement
                const item2 = document.querySelector('[data-testid="list-item-2"]') as HTMLElement
                const item3 = document.querySelector('[data-testid="list-item-3"]') as HTMLElement

                return (
                    item0 &&
                    item0.getBoundingClientRect().height === 80 &&
                    item2 &&
                    item2.getBoundingClientRect().height === 120 &&
                    item3 &&
                    item3.getBoundingClientRect().height === 60
                )
            },
            { timeout: 3000 }
        )

        // Verify all heights are correct
        expect((await page.locator('[data-testid="list-item-0"]').boundingBox())?.height).toBe(80)
        expect((await page.locator('[data-testid="list-item-1"]').boundingBox())?.height).toBe(100)
        expect((await page.locator('[data-testid="list-item-2"]').boundingBox())?.height).toBe(120)
        expect((await page.locator('[data-testid="list-item-3"]').boundingBox())?.height).toBe(60)

        // Verify layout is still coherent (no overlapping or gaps)
        const item0Box = await page.locator('[data-testid="list-item-0"]').boundingBox()
        const item1Box = await page.locator('[data-testid="list-item-1"]').boundingBox()

        if (item0Box && item1Box) {
            // In bottomToTop mode, item 1 should be directly above item 0
            const gap = item0Box.y - (item1Box.y + item1Box.height)
            expect(Math.abs(gap)).toBeLessThan(5) // Should be adjacent with minimal gap
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

        // Trigger height changes
        await page.clock.runFor(1000)
        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-1"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 100
            },
            { timeout: 2000 }
        )

        // Add more height changes
        await page.evaluate(() => {
            const items = window.items || []
            if (items[3]) items[3].height = 150
        })

        await page.waitForFunction(
            () => {
                const element = document.querySelector('[data-testid="list-item-3"]') as HTMLElement
                return element && element.getBoundingClientRect().height === 150
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
