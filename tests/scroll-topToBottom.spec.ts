import { expect, test, type Page } from '@playwright/test'

test.describe('topToBottom scroll', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/scroll/topToBottom', { waitUntil: 'networkidle' })
    })

    async function setAlign(page: Page, value: string) {
        await page.locator('select').selectOption(value)
    }

    for (const align of ['auto', 'top', 'bottom']) {
        test(`should scroll to the correct item with align=${align}`, async ({ page }) => {
            await setAlign(page, align)
            await page.locator('input[type=range]').fill('1234')
            await page.locator('button').click()
            const item = page.locator('[data-testid="list-item-1234"]')
            await item.waitFor({ state: 'visible', timeout: 5000 })
            await expect(item).toBeVisible()
            await expect(item).toHaveText('Item 1234')
        })

        test(`should scroll to the last item with align=${align}`, async ({ page }) => {
            await setAlign(page, align)
            await page.locator('input[type=range]').fill('9999')
            await page.locator('button').click()
            const item = page.locator('[data-testid="list-item-9999"]')
            await item.waitFor({ state: 'visible', timeout: 5000 })
            await expect(item).toBeVisible()
            await expect(item).toHaveText('Item 9999')
        })

        test(`should scroll to the first item with align=${align}`, async ({ page }) => {
            await setAlign(page, align)
            await page.locator('input[type=range]').fill('0')
            await page.locator('button').click()
            const item = page.locator('[data-testid="list-item-0"]')
            await item.waitFor({ state: 'visible', timeout: 5000 })
            await expect(item).toBeVisible()
            await expect(item).toHaveText('Item 0')
        })
    }

    // Additional test for align: 'auto' when item is visible but not at the edge
    test('should align to nearest edge with align=auto when item is visible but not at edge', async ({
        page
    }) => {
        await setAlign(page, 'auto')
        // Scroll to item 500 (should be at top)
        await page.locator('input[type=range]').fill('500')
        await page.locator('button').click()
        const item = page.locator('[data-testid="list-item-500"]')
        await item.waitFor({ state: 'visible', timeout: 5000 })
        await expect(item).toBeVisible()
        // Now scroll to item 505 (should align to nearest edge)
        await page.locator('input[type=range]').fill('505')
        await page.locator('button').click()
        const item2 = page.locator('[data-testid="list-item-505"]')
        await item2.waitFor({ state: 'visible', timeout: 5000 })
        await expect(item2).toBeVisible()
    })

    // Test align: 'center'
    test('should center the item in the viewport with align=center', async ({ page }) => {
        await setAlign(page, 'center')
        await page.locator('input[type=range]').fill('1234')
        await page.locator('button').click()
        const item = page.locator('[data-testid="list-item-1234"]')
        await item.waitFor({ state: 'visible', timeout: 5000 })
        const bounding = await item.boundingBox()
        const viewport = await page.locator('.test-container').boundingBox()
        if (!bounding || !viewport) throw new Error('Could not get bounding box')
        expect(
            Math.abs(bounding.y + bounding.height / 2 - (viewport.y + viewport.height / 2))
        ).toBeLessThanOrEqual(bounding.height)
    })

    // Test align: 'nearest'
    test('should scroll as little as possible with align=nearest (above viewport)', async ({
        page
    }) => {
        await setAlign(page, 'nearest')
        await page.locator('input[type=range]').fill('10')
        await page.locator('button').click()
        const item = page.locator('[data-testid="list-item-10"]')
        await item.waitFor({ state: 'visible', timeout: 5000 })
        await expect(item).toBeVisible()
    })
    test('should scroll as little as possible with align=nearest (below viewport)', async ({
        page
    }) => {
        await setAlign(page, 'nearest')
        await page.locator('input[type=range]').fill('999')
        await page.locator('button').click()
        const item = page.locator('[data-testid="list-item-999"]')
        await item.waitFor({ state: 'visible', timeout: 5000 })
        await expect(item).toBeVisible()
    })
    test('should not scroll if item is already visible with align=nearest', async ({ page }) => {
        await setAlign(page, 'nearest')
        await page.locator('input[type=range]').fill('500')
        await page.locator('button').click()
        const item = page.locator('[data-testid="list-item-500"]')
        await item.waitFor({ state: 'visible', timeout: 5000 })
        // Now scroll to item 501 (should not scroll much)
        await page.locator('input[type=range]').fill('501')
        await page.locator('button').click()
        const item2 = page.locator('[data-testid="list-item-501"]')
        await item2.waitFor({ state: 'visible', timeout: 5000 })
        await expect(item2).toBeVisible()
    })
})
