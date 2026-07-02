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

    /** Viewport-relative painted positions of currently rendered items. */
    async function paintedPositions(page: Page) {
        return page.evaluate(() => {
            const vp = document.querySelector('#virtual-list-viewport') as HTMLElement | null
            if (!vp) return null
            const vpTop = vp.getBoundingClientRect().top
            const out: Record<string, number> = {}
            for (const el of Array.from(vp.querySelectorAll('[data-original-index]'))) {
                const index = (el as HTMLElement).dataset.originalIndex
                if (index !== undefined) {
                    out[index] = el.getBoundingClientRect().top - vpTop
                }
            }
            return out
        })
    }

    async function setAndCheckStable(page: Page, target: number) {
        await page.evaluate((t) => {
            const vp = document.querySelector('#virtual-list-viewport') as HTMLElement | null
            if (vp) vp.scrollTop = Math.max(0, Math.min(vp.scrollHeight - vp.clientHeight, t))
        }, target)

        // One settle frame is allowed: jumping into unmeasured territory
        // mounts items whose measurements correct the estimates, and the
        // anchor-preservation logic (#413) adjusts scrollTop once so the
        // painted content stays put. What issue #300 forbids is SUSTAINED
        // frame-to-frame movement after that settle.
        await rafWait(page)
        const after1 = await metrics(page)
        const painted1 = await paintedPositions(page)
        await rafWait(page)
        const after2 = await metrics(page)
        const painted2 = await paintedPositions(page)
        await rafWait(page)
        const after3 = await metrics(page)

        expect(after1 && after2 && after3).not.toBeNull()
        if (!after1 || !after2 || !after3 || !painted1 || !painted2) return

        // No frame-to-frame flip/flop once settled
        expect(Math.abs(after2.top - after1.top)).toBeLessThanOrEqual(1)
        expect(Math.abs(after3.top - after2.top)).toBeLessThanOrEqual(1)

        // Painted content must not move between frames: items rendered in
        // both frames stay where they are (the user-facing invariant that
        // scrollTop stability used to proxy for).
        let commonItems = 0
        for (const [index, top1] of Object.entries(painted1)) {
            const top2 = painted2[index]
            if (top2 === undefined) continue
            commonItems++
            expect(Math.abs(top2 - top1)).toBeLessThanOrEqual(1)
        }
        expect(commonItems).toBeGreaterThan(0)
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
