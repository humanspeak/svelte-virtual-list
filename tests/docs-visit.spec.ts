import { expect, test } from '@playwright/test'

test.describe('External docs site smoke', () => {
    test('loads homepage and shows demo sections', async ({ page }) => {
        try {
            await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
        } catch {
            test.skip(true, 'Docs dev server not running on http://localhost:5173/')
        }

        await expect(page.getByText('Top to bottom').first()).toBeVisible()
        await expect(page.getByText('Bottom to top').first()).toBeVisible()

        // Ensure list items render
        await expect(page.getByText('Item 0').first()).toBeVisible()

        // Verify both lists have the element with data-original-index="0" in view,
        // left aligned to the top edge and right aligned to the bottom edge of its container.
        // Tag the two scroll containers that host the lists so we can target them reliably
        await page.evaluate(() => {
            function findScrollParent(element: HTMLElement): HTMLElement {
                let parent = element.parentElement as HTMLElement | null
                while (parent) {
                    const style = getComputedStyle(parent)
                    const overflowY = style.overflowY
                    const canScrollY =
                        (overflowY === 'auto' || overflowY === 'scroll') &&
                        parent.scrollHeight > parent.clientHeight
                    if (canScrollY) return parent
                    parent = parent.parentElement
                }
                return document.scrollingElement as HTMLElement
            }

            const anyItems = Array.from(
                document.querySelectorAll('[data-original-index]')
            ) as HTMLElement[]
            const containers = Array.from(new Set(anyItems.map((el) => findScrollParent(el)))).sort(
                (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left
            )
            if (containers[0]) containers[0].setAttribute('data-test-container', 'left')
            if (containers[1]) containers[1].setAttribute('data-test-container', 'right')
        })

        const leftContainer = page.locator('[data-test-container="left"]')
        const rightContainer = page.locator('[data-test-container="right"]')

        // Ensure they exist
        await expect(leftContainer).toHaveCount(1)
        await expect(rightContainer).toHaveCount(1)

        // Align left to top and right to bottom, then assert item 0 visibility and alignment
        await leftContainer.evaluate((el) => (el.scrollTop = 0))
        await rightContainer.evaluate((el) => (el.scrollTop = el.scrollHeight))
        await page.waitForTimeout(50)

        const leftItem0 = leftContainer.locator('[data-original-index="0"]').first()
        const rightItem0 = rightContainer.locator('[data-original-index="0"]').first()

        await expect(leftItem0).toBeVisible({ timeout: 5000 })
        await expect(rightItem0).toBeVisible({ timeout: 5000 })

        const [lItemBox, lContBox, rItemBox, rContBox] = await Promise.all([
            leftItem0.boundingBox(),
            leftContainer.boundingBox(),
            rightItem0.boundingBox(),
            rightContainer.boundingBox()
        ])
        expect(lItemBox && lContBox && rItemBox && rContBox).toBeTruthy()
        if (lItemBox && lContBox && rItemBox && rContBox) {
            const tol = 4
            expect(Math.abs(lItemBox.y - lContBox.y)).toBeLessThanOrEqual(tol)
            expect(
                Math.abs(rContBox.y + rContBox.height - (rItemBox.y + rItemBox.height))
            ).toBeLessThanOrEqual(tol)
        }
    })
})
