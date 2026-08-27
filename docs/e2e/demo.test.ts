import { expect, test } from '@playwright/test'
import { competitors } from '../src/lib/compare-data'

test('home page has expected h1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
})

test('install intent page exposes package metadata and onboarding links', async ({ page }) => {
    await page.goto('/install')

    await expect(page).toHaveTitle('Svelte Virtual List npm Package — Install for Svelte 5')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        'Install @humanspeak/svelte-virtual-list for Svelte 5. Copy the npm command, see requirements, and render your first virtual list in minutes.'
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        'https://virtuallist.svelte.page/install'
    )
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Install Svelte Virtual List')
    const installHero = page.locator('main section').first()
    await expect(
        installHero.getByText('npm install @humanspeak/svelte-virtual-list', { exact: true })
    ).toBeVisible()

    await page.goto('/docs')
    await expect(page.getByRole('link', { name: /install/i }).first()).toHaveAttribute(
        'href',
        '/install'
    )
})

test('examples index links to the horizontal responsive demo', async ({ page }) => {
    await page.goto('/examples')

    await expect(page).toHaveTitle('Svelte Virtual List Examples — Svelte 5 Demos')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        'Explore Svelte 5 virtual list examples for 10,000 items, variable heights, infinite scroll, horizontal lists, and programmatic scrolling.'
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        'https://virtuallist.svelte.page/examples'
    )
    await expect(
        page.getByRole('heading', { level: 1, name: /Svelte Virtual List Examples/i })
    ).toHaveCount(1)

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

test('example markdown mirrors include the runnable demo implementation', async ({ request }) => {
    const response = await request.get('/examples/basic-list.md')
    expect(response.ok()).toBe(true)

    const mirror = await response.text()
    expect(mirror).toContain('#### Default.svelte')
    expect(mirror).toContain("import VirtualList from '@humanspeak/svelte-virtual-list'")
    expect(mirror).toContain('{#snippet renderItem(item)}')
    expect(mirror).toContain('class="demo-row"')
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

test('svelte-tiny comparison reflects its Svelte 5 snippet API', async ({ page }) => {
    await page.goto('/compare/svelte-tiny-virtual-list')

    await expect(page).toHaveTitle('svelte-tiny-virtual-list Alternative for Svelte 5')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        'Compare svelte-tiny-virtual-list and @humanspeak/svelte-virtual-list for Svelte 5: sizing, dynamic heights, horizontal lists, scrolling, and infinite loading.'
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        'https://virtuallist.svelte.page/compare/svelte-tiny-virtual-list'
    )
    const competitorHeading = page.getByRole('heading', {
        level: 1,
        name: /svelte-tiny-virtual-list/i
    })
    await expect(competitorHeading).toHaveCount(1)
    await expect(page.getByRole('link', { name: /install/i }).first()).toHaveAttribute(
        'href',
        '/install'
    )
    await expect(
        page.getByRole('main').getByRole('link', { name: 'examples', exact: true })
    ).toHaveAttribute('href', '/examples')

    const snippetsRow = page.getByRole('row').filter({ hasText: 'Svelte 5 snippets' })
    const snippetsCells = snippetsRow.getByRole('cell')
    await expect(snippetsCells).toHaveCount(3)
    await expect(snippetsCells.nth(1)).toHaveText('yes')
    await expect(snippetsCells.nth(2)).toHaveText('yes')
    await expect(page.getByText('API predates Svelte 5 snippets', { exact: true })).toHaveCount(0)
    await expect(page.getByText('older slot-style API', { exact: false })).toHaveCount(0)
    await expect(
        page.getByText('Variable sizes from array/function', { exact: true })
    ).toBeVisible()
})

test('LLM files advertise and bundle complete comparison mirrors', async ({ request }) => {
    const llmsResponse = await request.get('/llms.txt')
    expect(llmsResponse.ok()).toBe(true)
    const llms = await llmsResponse.text()

    const prioritySlugs = ['virtua', 'tanstack-virtual', 'sveltejs-svelte-virtual-list'] as const
    const priorityPositions = prioritySlugs.map((slug) =>
        llms.indexOf(`https://virtuallist.svelte.page/compare/${slug}.md`)
    )
    expect(priorityPositions.every((position) => position >= 0)).toBe(true)
    expect(priorityPositions).toEqual([...priorityPositions].sort((a, b) => a - b))

    const llmsFullResponse = await request.get('/llms-full.txt')
    expect(llmsFullResponse.ok()).toBe(true)
    const llmsFull = await llmsFullResponse.text()

    for (const competitor of competitors) {
        const mirrorResponse = await request.get(`/compare/${competitor.slug}.md`)
        expect(mirrorResponse.ok()).toBe(true)
        const mirror = await mirrorResponse.text()

        expect(llms).toContain(
            `- [${competitor.name}](https://virtuallist.svelte.page/compare/${competitor.slug}.md): https://virtuallist.svelte.page/compare/${competitor.slug}\n`
        )
        expect(mirror).toContain(competitor.verdict)
        for (const feature of competitor.features) expect(mirror).toContain(feature.name)
        expect(llmsFull).toContain(competitor.verdict)
    }
})
