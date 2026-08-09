import { expect, test } from '@playwright/test'

const number = async (page: import('@playwright/test').Page, testId: string) =>
    Number(await page.getByTestId(testId).textContent())

test('root test index links to the issue 427 fixture', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const link = page.getByRole('link', { name: 'Issue 427 — Horizontal list' })
    await expect(link).toHaveAttribute('href', '/tests/issues/issue-427')
    await link.click()
    await expect(page).toHaveURL(/\/tests\/issues\/issue-427$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Issue #427 — deterministic horizontal virtual list'
    )
})

test.describe('Issue 427 - static LTR horizontal virtualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/issues/issue-427', { waitUntil: 'domcontentloaded' })
        await expect(page.getByTestId('diag-rendered-count')).not.toHaveText('0')
    })

    test('exposes loud horizontal geometry with bounded initial DOM', async ({ page }) => {
        if (process.env.ISSUE427_SCREENSHOT) {
            await page.screenshot({ path: process.env.ISSUE427_SCREENSHOT, fullPage: true })
        }
        await expect(page.getByTestId('diag-orientation')).toHaveText('horizontal')
        expect(await number(page, 'diag-scroll-width')).toBeGreaterThan(
            (await number(page, 'diag-client-width')) * 100
        )
        expect(await number(page, 'diag-scroll-height')).toBeLessThanOrEqual(
            (await number(page, 'diag-client-height')) + 2
        )
        expect(await number(page, 'diag-rendered-count')).toBeLessThan(100)
        expect(await number(page, 'diag-first-index')).toBe(0)
    })

    test('native deep scrolling moves the rendered horizontal window', async ({ page }) => {
        await page.getByTestId('deep-scroll').click()
        await expect(page.getByTestId('diag-scroll-left')).not.toHaveText('0')
        expect(await number(page, 'diag-first-index')).toBeGreaterThan(4000)
        expect(await number(page, 'diag-rendered-count')).toBeLessThan(100)
        expect(await number(page, 'diag-transform-x')).toBeGreaterThan(400_000)
    })

    test('raw offset API lands on an exact horizontal scalar', async ({ page }) => {
        await page.getByTestId('raw-offset').click()
        await expect(page.getByTestId('diag-active')).toHaveText('raw-offset')
        await expect.poll(() => number(page, 'diag-first-index')).toBeGreaterThan(1500)
        await expect(page.getByTestId('diag-anchor-error')).toHaveText(/^[0-2]$/)
    })

    test('smooth index scrolling lands centered', async ({ page }) => {
        await page.getByTestId('smooth-index').click()
        await expect(page.getByTestId('diag-active')).toHaveText('smooth-index')
        await expect
            .poll(() => number(page, 'diag-last-index'), { timeout: 15_000 })
            .toBeGreaterThanOrEqual(2500)
        await expect(page.getByTestId('diag-anchor-error')).toHaveText(/^[0-2]$/, {
            timeout: 15_000
        })
        expect(await number(page, 'diag-first-index')).toBeLessThanOrEqual(2500)
    })

    for (const alignment of ['start', 'end', 'nearest', 'center'] as const) {
        test(`programmatic ${alignment} alignment is measurable`, async ({ page }) => {
            await page.getByTestId(`align-${alignment}`).click()
            await expect(page.getByTestId('diag-active')).toHaveText(alignment)
            await expect.poll(() => number(page, 'diag-last-index')).toBeGreaterThanOrEqual(4321)
            await expect(page.getByTestId('diag-anchor-error')).toHaveText(/^[0-2]$/)
            expect(await number(page, 'diag-first-index')).toBeLessThanOrEqual(4321)
            expect(await number(page, 'diag-last-index')).toBeGreaterThanOrEqual(4321)
        })
    }

    test('a predecessor width change preserves the target pixel anchor', async ({ page }) => {
        await page.getByTestId('widen-visible').click()
        await expect(page.getByTestId('diag-active')).toHaveText('resize-anchor')
        await expect.poll(() => number(page, 'diag-resize-scroll-delta')).not.toBe(0)
        expect(Math.abs(await number(page, 'diag-target-left-before'))).toBeLessThanOrEqual(2)
        expect(Math.abs(await number(page, 'diag-target-left-after'))).toBeLessThanOrEqual(2)
        expect(await number(page, 'diag-anchor-error')).toBeLessThanOrEqual(2)
        expect(await number(page, 'diag-resize-scroll-delta')).toBeGreaterThanOrEqual(22)
        expect(await number(page, 'diag-resize-scroll-delta')).toBeLessThanOrEqual(26)
        expect(await number(page, 'diag-compensation-error')).toBeLessThanOrEqual(2)
    })

    test('horizontal end range triggers infinite loading', async ({ page }) => {
        await page.getByTestId('load-end').click()
        await expect(page.getByTestId('diag-active')).toHaveText('load-end')
        await expect(page.getByTestId('diag-last-index')).toHaveText('9999')
        await expect(page.getByTestId('diag-load-more')).not.toHaveText('0')
        await expect(page.getByTestId('diag-anchor-error')).toHaveText(/^[0-2]$/)
    })

    test('runtime orientation switches preserve the logical anchor and active axis', async ({
        page
    }) => {
        await page.getByTestId('deep-scroll').click()
        await expect.poll(() => number(page, 'diag-first-index')).toBeGreaterThan(4000)
        const anchor = await number(page, 'diag-visible-anchor')
        await page.getByTestId('toggle-orientation').click()
        if (process.env.ISSUE427_RED_SCREENSHOT) {
            await page.screenshot({ path: process.env.ISSUE427_RED_SCREENSHOT, fullPage: true })
        }
        await expect(page.getByTestId('diag-requested-orientation')).toHaveText('vertical')
        await expect(page.getByTestId('diag-orientation')).toHaveText('vertical')
        await expect.poll(() => number(page, 'diag-preserved-anchor')).toBe(anchor)
        expect(await number(page, 'diag-scroll-height')).toBeGreaterThan(
            await number(page, 'diag-client-height')
        )
        expect(Math.abs(await number(page, 'diag-transform-x'))).toBeLessThanOrEqual(1)
        await expect(page.getByTestId('diag-anchor-error')).toHaveText(/^[0-2]$/)
        await expect(page.getByTestId('diag-responsive-result')).toHaveText('GREEN')
        if (process.env.ISSUE427_GREEN_SCREENSHOT) {
            await page.screenshot({ path: process.env.ISSUE427_GREEN_SCREENSHOT, fullPage: true })
        }
    })

    test('rapid switching settles on the latest generation without stale-axis state', async ({
        page
    }) => {
        await page.getByTestId('rapid-toggle').click()
        await expect(page.getByTestId('diag-switch-count')).toHaveText('5')
        await expect(page.getByTestId('diag-requested-orientation')).toHaveText('vertical')
        await expect(page.getByTestId('diag-orientation')).toHaveText('vertical')
        expect(Math.abs(await number(page, 'diag-transform-x'))).toBeLessThanOrEqual(1)
        expect(await number(page, 'diag-rendered-count')).toBeLessThan(100)
    })

    test('horizontal keyboard uses left/right while interactive children keep native keys', async ({
        page
    }) => {
        const viewport = page.getByTestId('issue-427-list-viewport')
        await viewport.focus()
        await viewport.press('ArrowRight')
        await expect.poll(() => number(page, 'diag-scroll-left')).toBe(40)
        await viewport.press('ArrowLeft')
        await expect.poll(() => number(page, 'diag-scroll-left')).toBe(0)
        await viewport.press('End')
        await expect.poll(() => number(page, 'diag-first-index')).toBeGreaterThan(9000)

        await viewport.press('Home')
        await expect.poll(() => number(page, 'diag-scroll-left')).toBe(0)
        const button = page.getByTestId('interactive-child')
        await button.focus()
        const before = await number(page, 'diag-scroll-left')
        await button.press('ArrowLeft')
        await page.waitForTimeout(100)
        expect(await number(page, 'diag-scroll-left')).toBe(before)
    })
})
