import { expect, test } from '@playwright/test'
import { rafWait } from '../../src/lib/test/utils/rafWait.js'

test.describe('Issue 195 - bottomToTop keeps anchor on add', () => {
    test('item 0 stays visible and at bottom after adding messages', async ({ page }) => {
        await page.goto('/tests/issues/issue-195', { waitUntil: 'networkidle' })
        await rafWait(page)

        // Ensure list is anchored to bottom
        await page.evaluate(() => {
            const viewport = document.querySelector('#virtual-list-viewport') as HTMLElement | null
            if (viewport) viewport.scrollTo({ top: viewport.scrollHeight })
        })
        await rafWait(page)

        // Wait for item 0 to be attached
        await page
            .locator('[data-original-index="0"]')
            .first()
            .waitFor({ state: 'attached', timeout: 2000 })
        await expect(page.locator('[data-original-index="0"]').first()).toBeVisible()

        // Helper to check if item 0 is at/near bottom of viewport
        const isItem0AtBottom = async () => {
            return page.evaluate(() => {
                const viewport = document.querySelector(
                    '#virtual-list-viewport'
                ) as HTMLElement | null
                const item0 = document.querySelector(
                    '[data-original-index="0"]'
                ) as HTMLElement | null
                if (!viewport || !item0)
                    return {
                        ok: false,
                        distanceFromBottom: Infinity,
                        scrollTop: 0,
                        scrollHeight: 0
                    }
                const vRect = viewport.getBoundingClientRect()
                const iRect = item0.getBoundingClientRect()
                const distanceFromBottom = Math.abs(iRect.bottom - vRect.bottom)
                return {
                    ok: true,
                    distanceFromBottom,
                    scrollTop: (viewport as HTMLElement).scrollTop,
                    scrollHeight: (viewport as HTMLElement).scrollHeight
                }
            })
        }

        const before = await isItem0AtBottom()
        expect(before.ok).toBe(true)
        expect(before.distanceFromBottom).toBeLessThan(40)
        // Item 0 must be visible initially
        await expect(page.locator('[data-original-index="0"]').first()).toBeVisible()

        // Click add message several times; anchoring should keep item 0 pinned to bottom
        const addBtn = page.getByTestId('add-message-button')
        await addBtn.click()
        await rafWait(page)
        const after1 = await isItem0AtBottom()
        expect(after1.ok).toBe(true)
        expect(after1.distanceFromBottom).toBeLessThan(40)
        // Scroll height should increase but scrollTop should remain effectively the same
        expect(after1.scrollHeight).toBeGreaterThan(before.scrollHeight)
        expect(Math.abs(after1.scrollTop - before.scrollTop)).toBeLessThanOrEqual(1)
        await expect(page.locator('[data-original-index="0"]').first()).toBeVisible()

        await addBtn.click()
        await rafWait(page)
        const after2 = await isItem0AtBottom()
        expect(after2.ok).toBe(true)
        expect(after2.distanceFromBottom).toBeLessThan(40)
        expect(after2.scrollHeight).toBeGreaterThan(after1.scrollHeight)
        expect(Math.abs(after2.scrollTop - before.scrollTop)).toBeLessThanOrEqual(1)
        await expect(page.locator('[data-original-index="0"]').first()).toBeVisible()

        await addBtn.click()
        await rafWait(page)
        const after3 = await isItem0AtBottom()
        expect(after3.ok).toBe(true)
        expect(after3.distanceFromBottom).toBeLessThan(40)
        expect(after3.scrollHeight).toBeGreaterThan(after2.scrollHeight)
        expect(Math.abs(after3.scrollTop - before.scrollTop)).toBeLessThanOrEqual(1)
        await expect(page.locator('[data-original-index="0"]').first()).toBeVisible()
    })
})
