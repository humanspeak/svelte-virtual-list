<script lang="ts">
    import { BrutIndexV2, getSeoContext } from '@humanspeak/docs-kit'

    const title = 'Svelte Virtual List Examples — Svelte 5 Demos'
    const description =
        'Explore Svelte 5 virtual list examples for 10,000 items, variable heights, infinite scroll, horizontal lists, and programmatic scrolling.'

    const seo = getSeoContext()
    if (seo) {
        seo.title = title
        seo.description = description
        seo.ogTitle = 'Svelte Virtual List Examples'
        seo.ogTagline = 'Interactive Svelte 5 demos for common virtual list patterns.'
        seo.ogFeatures = ['10,000 Items', 'Variable Heights', 'Infinite Scroll', 'Horizontal Lists']
        seo.ogSlug = 'examples'
    }

    type Example = {
        slug: string
        title: string
        tag: string
        description: string
    }

    const examples: Example[] = [
        {
            slug: 'basic-list',
            title: 'basic list.',
            tag: 'FIXED ROWS',
            description: 'Render 10,000 items while keeping only visible rows in the DOM.'
        },
        {
            slug: 'infinite-scroll',
            title: 'infinite scroll.',
            tag: 'PAGINATION',
            description: 'Load the next page as the virtual range approaches the end.'
        },
        {
            slug: 'scroll-to-item',
            title: 'scroll to item.',
            tag: 'METHODS',
            description: 'Jump to any index with top, bottom, nearest, or auto alignment.'
        },
        {
            slug: 'variable-height',
            title: 'variable height.',
            tag: 'MEASUREMENT',
            description: 'Expand rows and let the list keep offsets correct as heights change.'
        },
        {
            slug: 'horizontal',
            title: 'horizontal list.',
            tag: 'ORIENTATION',
            description:
                'Virtualize 10,000 variable-width items and switch axes without losing your place.'
        },
        {
            slug: 'header-footer',
            title: 'headers & footers.',
            tag: 'MEASURED CONTENT',
            description:
                'Resize header and footer snippets, keep your reading position, and explore empty lists.'
        }
    ]

    const pad = (n: number) => String(n).padStart(2, '0')
    const items = examples.map((example, i) => ({
        href: `/examples/${example.slug}`,
        title: example.title,
        tag: example.tag,
        line: example.description,
        id: `№ ${pad(i + 1)} / ${pad(examples.length)}`
    }))

    const hero = {
        figLabel: 'FIG-001 · EXAMPLES',
        figId: 'FIG-001',
        sheetLabel: 'SHEET 01 / 02',
        meta: [
            { k: 'examples', v: String(items.length) },
            { k: 'format', v: 'live demos' },
            { k: 'library', v: '@humanspeak/svelte-virtual-list' },
            { rule: 'dashed' as const },
            { k: 'framework', v: 'svelte 5', accent: true },
            { k: 'data scale', v: '10k rows' }
        ],
        metaFooter: '// pick a sheet',
        kicker: '// examples / virtual list patterns',
        title: { prefix: '', accent: 'Svelte Virtual List Examples', end: '.' },
        subHtml:
            'Explore Svelte 5 virtual list examples for 10,000 items, variable heights, infinite scroll, horizontal lists, and programmatic scrolling. Each page includes the exact source behind the preview.',
        ctas: [
            { label: 'basic list ↗', href: '/examples/basic-list', primary: true },
            { label: 'docs', href: '/docs' },
            { label: 'compare', href: '/compare' }
        ]
    }

    const lede = {
        kicker: 'FIG-002 / DEMOS',
        title: { prefix: 'choose a ', accent: 'scenario', suffix: '.' },
        body: 'Start with the smallest list, then explore horizontal orientation, loading, programmatic scroll, and measured dynamic rows.'
    }
</script>

<BrutIndexV2
    {hero}
    {lede}
    {items}
    footer={{ big: { prefix: 'read the ', accent: 'docs', href: '/docs', hint: 'api + guides' } }}
/>
