import { expect, test } from '@playwright/test'

test('home page has expected h1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
})

test('examples index links to the horizontal responsive demo', async ({ page }) => {
    await page.goto('/examples')
    const link = page.getByRole('link', { name: /horizontal/i })
    await expect(link).toHaveAttribute('href', '/examples/horizontal')
    await link.click()
    await expect(page).toHaveURL(/\/examples\/horizontal$/)
    await expect(page.getByText('active axis', { exact: false })).toContainText('horizontal')
    await expect(page.getByRole('button', { name: 'horizontal' })).toHaveAttribute(
        'aria-pressed',
        'true'
    )
})

test('props API documents keyed and axis-neutral list configuration', async ({ page }) => {
    await page.goto('/docs/api/props')

    await expect(page.getByRole('heading', { name: 'itemKey', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'orientation', exact: true })).toBeVisible()
    await expect(
        page.getByRole('heading', { name: 'defaultEstimatedItemSize', exact: true })
    ).toBeVisible()
    await expect(page.getByText('Use a unique, stable value', { exact: false })).toBeVisible()
    await expect(page.getByText('vertical and horizontal', { exact: false })).toBeVisible()
})
