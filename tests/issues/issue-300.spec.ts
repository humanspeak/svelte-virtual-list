import { expect, test, type Page } from '@playwright/test'
import { rafWait } from '../../src/lib/test/utils/rafWait.js'

test.describe('Issue 300 - dynamic heights middle crossing should not oscillate', () => {
    async function metrics(page: Page) {
        return page.evaluate(() => {
            const vp = document.querySelector('#virtual-list-viewport') as HTMLElement | null
            if (!vp) return null
            const max = vp.scrollHeight - vp.clientHeight
            return {
                top: vp.scrollTop,
                max
            }
        })
    }

    async function setAndCheckStable(page: Page, target: number) {
        await page.evaluate((t) => {
            const vp = document.querySelector('#virtual-list-viewport') as HTMLElement | null
            if (vp) vp.scrollTop = Math.max(0, Math.min(vp.scrollHeight - vp.clientHeight, t))
        }, target)

        const before = await metrics(page)
        await rafWait(page)
        const after1 = await metrics(page)
        await rafWait(page)
        const after2 = await metrics(page)

        expect(before && after1 && after2).not.toBeNull()
        if (!before || !after1 || !after2) return

        // No frame-to-frame 1px flip/flop
        expect(Math.abs(after1.top - before.top)).toBeLessThanOrEqual(1)
        expect(Math.abs(after2.top - after1.top)).toBeLessThanOrEqual(1)
    }

    test('repeated middle crossings remain stable (no 1px jumping)', async ({ page }) => {
        await page.goto('/tests/issues/issue-300', { waitUntil: 'domcontentloaded' })
        await rafWait(page)

        const m = await metrics(page)
        expect(m).not.toBeNull()
        if (!m) return
        const mid = m.max / 2

        // Cross middle twice with different spans
        await setAndCheckStable(page, Math.floor(mid - 5000))
        await setAndCheckStable(page, Math.floor(mid + 5000))
        await setAndCheckStable(page, Math.floor(mid - 8000))
        await setAndCheckStable(page, Math.floor(mid + 8000))
    })
})
