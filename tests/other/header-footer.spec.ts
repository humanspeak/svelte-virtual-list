import { expect, test, type Page } from '@playwright/test'

type Axis = 'vertical' | 'horizontal'
const viewport = (page: Page) => page.getByTestId('hf-viewport')
const state = async (page: Page) => JSON.parse((await page.getByTestId('state').textContent())!)
const geometry = async (page: Page, axis: Axis) =>
    viewport(page).evaluate(
        (element, axis) => ({
            offset: axis === 'vertical' ? element.scrollTop : element.scrollLeft,
            viewport: axis === 'vertical' ? element.clientHeight : element.clientWidth,
            total: axis === 'vertical' ? element.scrollHeight : element.scrollWidth
        }),
        axis
    )
const inset = async (
    page: Page,
    axis: Axis,
    id: number,
    edge: 'start' | 'end' | 'center' = 'start'
) =>
    page.locator(`[data-row-id="${id}"]`).evaluate(
        (element, { axis, edge }) => {
            const row = element.getBoundingClientRect()
            const view = element.closest('[data-svl-viewport]')!.getBoundingClientRect()
            const start = axis === 'vertical' ? row.top - view.top : row.left - view.left
            const end = axis === 'vertical' ? row.bottom - view.top : row.right - view.left
            return edge === 'start' ? start : edge === 'end' ? end : (start + end) / 2
        },
        { axis, edge }
    )
const alignRow = async (page: Page, index: number, align = 'start', smooth = false) => {
    await page.getByLabel('Index', { exact: true }).fill(String(index))
    await page.getByLabel('Alignment', { exact: true }).selectOption(align)
    await page.getByLabel('Smooth', { exact: true }).setChecked(smooth)
    const before = (await state(page)).completed
    await page.getByRole('button', { name: 'Align row', exact: true }).click()
    await expect.poll(async () => (await state(page)).completed).toBe(before + 1)
}
const raw = async (page: Page, offset: number) => {
    await page.getByLabel('Offset', { exact: true }).fill(String(offset))
    const before = (await state(page)).completed
    await page.getByRole('button', { name: 'Raw offset', exact: true }).click()
    await expect.poll(async () => (await state(page)).completed).toBe(before + 1)
}
const click = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click()
const settled = async (page: Page, axis: Axis) => {
    await expect
        .poll(async () => {
            const s = await state(page)
            const total =
                s.rowExtent +
                (s.showHeader ? s.headerSize + (axis === 'horizontal' ? 20 : 0) : 0) +
                (s.showFooter ? s.footerSize + (axis === 'horizontal' ? 10 : 0) : 0)
            const g = await geometry(page, axis)
            return s.info.totalHeight === total && g.total === Math.max(g.viewport, total)
        })
        .toBe(true)
}
const endPinned = async (page: Page, axis: Axis) =>
    expect
        .poll(async () => {
            const g = await geometry(page, axis)
            return Math.abs(g.offset - (g.total - g.viewport))
        })
        .toBeLessThanOrEqual(2)

for (const axis of ['vertical', 'horizontal'] as const) {
    test.describe(`measured content ${axis}`, () => {
        let errors: string[]
        test.beforeEach(async ({ page }) => {
            errors = []
            page.on('pageerror', (error) => errors.push(error.message))
            page.on('console', (message) => {
                if (message.type() === 'error' && /hydrat/i.test(message.text()))
                    errors.push(message.text())
            })
        })
        test.afterEach(() => expect(errors).toEqual([]))
        const open = async (page: Page, query = '') => {
            const response = await page.goto(
                `/tests/other/header-footer?axis=${axis}&compact=1&${query}`
            )
            expect(response?.ok()).toBe(true)
            await expect
                .poll(async () => (await state(page)).info?.totalHeight)
                .toBeGreaterThanOrEqual(0)
            return response!
        }

        test('empty snippets are SSR rendered, measured and scrollable without row indices', async ({
            page
        }) => {
            const response = await open(page, 'count=0&h=240&f=200')
            const html = await response.text()
            expect(html).toContain('data-svl-header')
            expect(html).toContain('data-svl-footer')
            expect(html).toContain('Footer: 0 loads')
            const expected = axis === 'vertical' ? 440 : 470
            await expect.poll(async () => (await geometry(page, axis)).total).toBe(expected)
            await raw(page, 10000)
            await endPinned(page, axis)
            expect((await state(page)).range).toMatchObject({ start: 0, end: 0, atBottom: true })
            await expect(page.locator('[data-svl-item]')).toHaveCount(0)
        })

        test('optional snippets and short lists have exact physical order and no trailing spacer between content', async ({
            page
        }) => {
            for (const mode of ['both', 'header', 'footer', 'none']) {
                await open(
                    page,
                    `count=2&header=${mode === 'footer' || mode === 'none' ? 'none' : 'yes'}&footer=${mode === 'header' || mode === 'none' ? 'none' : 'yes'}`
                )
                const h = mode === 'both' || mode === 'header' ? (axis === 'vertical' ? 60 : 80) : 0
                const f = mode === 'both' || mode === 'footer' ? (axis === 'vertical' ? 80 : 90) : 0
                await expect
                    .poll(async () => (await geometry(page, axis)).total)
                    .toBe(Math.max(160, h + 80 + f))
                await expect.poll(async () => inset(page, axis, 0)).toBe(h)
                if (f) {
                    await expect
                        .poll(async () =>
                            page.locator('[data-svl-footer]').evaluate((element, axis) => {
                                const r = element.getBoundingClientRect(),
                                    v = element
                                        .closest('[data-svl-viewport]')!
                                        .getBoundingClientRect()
                                return axis === 'vertical' ? r.top - v.top : r.left - v.left
                            }, axis)
                        )
                        .toBe(h + 80)
                }
                expect((await state(page)).info.totalItems).toBe(2)
                expect((await state(page)).count).toBe(2)
            }
        })

        test('header-only and footer-only viewport projections keep bounded indices and preserve raw offsets', async ({
            page
        }) => {
            await open(page, 'count=5&h=240&f=240')
            const h = axis === 'vertical' ? 240 : 260
            await settled(page, axis)
            await raw(page, 40)
            await expect.poll(async () => inset(page, axis, 0)).toBe(h - 40)
            let current = (await state(page)).range
            expect(current.start).toBeGreaterThanOrEqual(0)
            expect(current.end).toBeLessThanOrEqual(5)
            await raw(page, h - 20)
            await expect.poll(async () => inset(page, axis, 0)).toBe(20)
            current = (await state(page)).range
            expect(current.start).toBe(0)
            expect(current.end).toBeGreaterThanOrEqual(4)
            await raw(page, h + 200 + 30)
            const offset = (await geometry(page, axis)).offset
            current = (await state(page)).range
            expect(current.start).toBeGreaterThanOrEqual(0)
            expect(current.end).toBeLessThanOrEqual(5)
            expect(current.atBottom).toBe(false)
            await click(page, 'Grow header')
            await settled(page, axis)
            expect((await geometry(page, axis)).offset).toBe(offset)
            await click(page, 'Shrink footer')
            await settled(page, axis)
            expect((await geometry(page, axis)).offset).toBe(offset)
        })

        test('deep alignment uses physical row coordinates for every mode and raw offsets start at zero', async ({
            page
        }) => {
            await open(page)
            const h = axis === 'vertical' ? 60 : 80
            await expect
                .poll(async () => (await geometry(page, axis)).total)
                .toBe(axis === 'vertical' ? 4140 : 4170)
            for (const [alignment, position, edge] of [
                ['start', 0, 'start'],
                ['end', 160, 'end'],
                ['center', 80, 'center']
            ] as const) {
                await alignRow(page, 40, alignment)
                await expect
                    .poll(async () => Math.abs((await inset(page, axis, 40, edge)) - position))
                    .toBeLessThanOrEqual(2)
            }
            await raw(page, h + 40 * 40)
            const before = (await geometry(page, axis)).offset
            await alignRow(page, 40, 'nearest')
            expect((await geometry(page, axis)).offset).toBe(before)
            await raw(page, 0)
            await alignRow(page, 40, 'auto')
            await expect
                .poll(async () => Math.abs((await inset(page, axis, 40, 'end')) - 160))
                .toBeLessThanOrEqual(2)
            await raw(page, 25)
            expect((await geometry(page, axis)).offset).toBe(25)
        })

        test('final row end excludes footer while keyboard End and debug describe physical end', async ({
            page
        }) => {
            await open(page)
            await alignRow(page, 99, 'end')
            await expect
                .poll(async () => Math.abs((await inset(page, axis, 99, 'end')) - 160))
                .toBeLessThanOrEqual(2)
            expect((await state(page)).range.atBottom).toBe(false)
            expect((await state(page)).info.atBottom).toBe(false)
            await viewport(page).focus()
            await viewport(page).press('End')
            await endPinned(page, axis)
            await expect.poll(async () => (await state(page)).range.atBottom).toBe(true)
            expect((await state(page)).info.atBottom).toBe(true)
        })

        test('header/footer grow and shrink preserve reading rows and dynamic row measurement', async ({
            page
        }) => {
            await open(page)
            await alignRow(page, 40)
            const before = await inset(page, axis, 40)
            for (const control of [
                'Grow header',
                'Shrink header',
                'Grow footer',
                'Shrink footer',
                'Grow row'
            ]) {
                await click(page, control)
                if (control === 'Grow row') {
                    // A changed row also updates estimates for unmeasured rows;
                    // its total need not equal the fixture's actual-size sum.
                    await expect
                        .poll(async () => (await state(page)).info.averageItemHeight)
                        .toBeGreaterThan(40)
                    await expect
                        .poll(async () =>
                            page.locator('[data-row-id="40"]').evaluate((element, axis) => {
                                const rect = element.getBoundingClientRect()
                                return axis === 'vertical' ? rect.height : rect.width
                            }, axis)
                        )
                        .toBe(90)
                } else {
                    await settled(page, axis)
                }
                await expect
                    .poll(async () => Math.abs((await inset(page, axis, 40)) - before))
                    .toBeLessThanOrEqual(2)
            }
        })

        test('repeated fractional header resizes do not accumulate reading drift', async ({
            page
        }) => {
            await open(page)
            await alignRow(page, 40)
            const before = await inset(page, axis, 40)
            for (let count = 0; count < 20; count++) {
                await click(page, 'Tiny header growth')
                await expect
                    .poll(async () => {
                        const s = await state(page)
                        const measured = await page
                            .locator('[data-svl-header]')
                            .evaluate((element, axis) => {
                                const rect = element.getBoundingClientRect()
                                return axis === 'vertical' ? rect.height : rect.width
                            }, axis)
                        return Math.abs(
                            s.info.totalHeight - (4000 + measured + (axis === 'vertical' ? 80 : 90))
                        )
                    })
                    .toBeLessThan(0.02)
                await expect
                    .poll(async () => Math.abs((await inset(page, axis, 40)) - before))
                    .toBeLessThanOrEqual(2)
            }
        })

        test('non-item resize keeps physical start and pinned end, including shrink', async ({
            page
        }) => {
            await open(page)
            for (const control of [
                'Grow header',
                'Grow footer',
                'Shrink header',
                'Shrink footer'
            ]) {
                await click(page, control)
                await settled(page, axis)
                await expect.poll(async () => (await geometry(page, axis)).offset).toBe(0)
            }
            await raw(page, 100000)
            for (const control of [
                'Grow header',
                'Grow footer',
                'Shrink header',
                'Shrink footer'
            ]) {
                await click(page, control)
                await settled(page, axis)
                await endPinned(page, axis)
            }
        })

        test('keyed prepend, reorder and trim preserve painted reading positions with snippets', async ({
            page
        }) => {
            await open(page)
            await alignRow(page, 20)
            const before = await inset(page, axis, 20)
            for (const control of ['Prepend', 'Reorder', 'Trim']) {
                await click(page, control)
                await settled(page, axis)
                await expect
                    .poll(async () => Math.abs((await inset(page, axis, 20)) - before))
                    .toBeLessThanOrEqual(2)
            }
            await raw(page, 0)
            await click(page, 'Empty')
            await click(page, 'Populate')
            await expect.poll(async () => (await geometry(page, axis)).offset).toBe(0)
            expect((await state(page)).count).toBe(100)
            await open(page, 'scenario=combined-reading')
            await alignRow(page, 40)
            await click(page, 'Remove header and rotate')
            await settled(page, axis)
            await expect
                .poll(async () => Math.abs(await inset(page, axis, 40)))
                .toBeLessThanOrEqual(2)
        })

        test('composed pinned-end mutations and snippet removal preserve end intent', async ({
            page
        }) => {
            for (const mutation of ['prepend', 'grow tail']) {
                await open(
                    page,
                    `scenario=composed-${mutation.replace(' ', '-')}&h=${axis === 'vertical' ? 200 : 180}&footer=none`
                )
                await raw(page, 100000)
                await endPinned(page, axis)
                await click(page, `Remove header and ${mutation}`)
                if (mutation === 'prepend') {
                    await settled(page, axis)
                } else {
                    await expect
                        .poll(async () => (await state(page)).info.averageItemHeight)
                        .toBeGreaterThan(40)
                }
                await endPinned(page, axis)
                await expect.poll(async () => (await state(page)).range.atBottom).toBe(true)
                expect((await state(page)).info.atBottom).toBe(true)
            }
        })

        test('removal, replacement and orientation round trip remeasure and preserve the responsive row anchor', async ({
            page
        }) => {
            await open(page)
            await alignRow(page, 40)
            const before = await inset(page, axis, 40)
            await click(page, 'Replace header')
            await settled(page, axis)
            await expect(page.getByTestId('header-body')).toHaveText('Replacement header')
            await expect
                .poll(async () => Math.abs((await inset(page, axis, 40)) - before))
                .toBeLessThanOrEqual(2)
            for (const control of [
                'Toggle header',
                'Toggle footer',
                'Toggle header',
                'Toggle footer'
            ]) {
                await click(page, control)
                await settled(page, axis)
                await expect
                    .poll(async () => Math.abs((await inset(page, axis, 40)) - before))
                    .toBeLessThanOrEqual(2)
            }
            const other: Axis = axis === 'vertical' ? 'horizontal' : 'vertical'
            await click(page, 'Switch axis')
            await settled(page, other)
            await expect
                .poll(async () => Math.abs((await inset(page, other, 40)) - before))
                .toBeLessThanOrEqual(2)
            await click(page, 'Switch axis')
            await settled(page, axis)
            await expect
                .poll(async () => Math.abs((await inset(page, axis, 40)) - before))
                .toBeLessThanOrEqual(2)
        })

        test('footer loader UI stays item based and empty/failed loads stall until explicit retry', async ({
            page
        }) => {
            for (const mode of ['empty', 'fail', 'append']) {
                await open(page, `count=2&load=${mode}`)
                await expect.poll(async () => (await state(page)).calls).toBeGreaterThanOrEqual(1)
                await expect.poll(async () => (await state(page)).pending).toBe(0)
                await click(page, 'Grow footer')
                await click(page, 'Grow header')
                if (mode !== 'append') {
                    expect((await state(page)).calls).toBe(1)
                    await click(page, 'Toggle has more')
                    await click(page, 'Toggle has more')
                    await expect.poll(async () => (await state(page)).calls).toBe(2)
                } else {
                    while ((await state(page)).calls < 3) {
                        const previousCalls = (await state(page)).calls
                        await raw(page, 100000)
                        await expect
                            .poll(async () => (await state(page)).calls)
                            .toBeGreaterThan(previousCalls)
                        await expect.poll(async () => (await state(page)).pending).toBe(0)
                    }
                    await expect.poll(async () => (await state(page)).hasMore).toBe(false)
                    expect((await state(page)).count).toBe(32)
                }
                expect((await state(page)).maxPending).toBe(1)
            }
        })

        test('smooth alignment survives non-item resize and observer activity can unmount safely', async ({
            page
        }) => {
            await open(page)
            await page.getByLabel('Index', { exact: true }).fill('80')
            await page.getByLabel('Smooth', { exact: true }).check()
            const before = (await state(page)).completed
            await click(page, 'Align row')
            await click(page, 'Grow header')
            await click(page, 'Grow footer')
            await expect.poll(async () => (await state(page)).completed).toBe(before + 1)
            await expect
                .poll(async () => Math.abs(await inset(page, axis, 80)))
                .toBeLessThanOrEqual(2)
            await click(page, 'Grow header')
            await click(page, 'Toggle mount')
            await expect(viewport(page)).toHaveCount(0)
            await click(page, 'Toggle mount')
            await expect(viewport(page)).toHaveCount(1)
            await expect.poll(async () => (await geometry(page, axis)).offset).toBe(0)
        })
    })
}
