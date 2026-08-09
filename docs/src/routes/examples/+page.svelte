<script lang="ts">
    import { BrutIndexV2 } from '@humanspeak/docs-kit'

    const hero = {
        figLabel: 'FIG-001 · EXAMPLES',
        figId: 'FIG-001',
        sheetLabel: 'SHEET 01 / 02',
        meta: [
            { k: 'examples', v: '5' },
            { k: 'format', v: 'live demos' },
            { k: 'library', v: '@humanspeak/svelte-virtual-list' },
            { rule: 'dashed' as const },
            { k: 'framework', v: 'svelte 5', accent: true },
            { k: 'data scale', v: '10k rows' }
        ],
        metaFooter: '// pick a sheet',
        kicker: '// examples / virtual list patterns',
        title: { prefix: 'live ', accent: 'examples', end: '.' },
        subHtml:
            'Interactive demos for fixed rows, horizontal orientation, dynamic measurement, infinite loading, and imperative scrolling. Each page includes the exact source behind the preview.',
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

    const items = [
        {
            href: '/examples/basic-list',
            id: '№ 01 / 05',
            title: 'basic list.',
            tag: 'FIXED ROWS',
            line: 'Render 10,000 items while keeping only visible rows in the DOM.'
        },
        {
            href: '/examples/infinite-scroll',
            id: '№ 02 / 05',
            title: 'infinite scroll.',
            tag: 'PAGINATION',
            line: 'Load the next page as the virtual range approaches the end.'
        },
        {
            href: '/examples/scroll-to-item',
            id: '№ 03 / 05',
            title: 'scroll to item.',
            tag: 'METHODS',
            line: 'Jump to any index with top, bottom, nearest, or auto alignment.'
        },
        {
            href: '/examples/variable-height',
            id: '№ 04 / 05',
            title: 'variable height.',
            tag: 'MEASUREMENT',
            line: 'Expand rows and let the list keep offsets correct as heights change.'
        },
        {
            href: '/examples/horizontal',
            id: '№ 05 / 05',
            title: 'horizontal list.',
            tag: 'ORIENTATION',
            line: 'Virtualize 10,000 variable-width items and switch axes without losing your place.'
        }
    ]
</script>

<BrutIndexV2
    {hero}
    {lede}
    {items}
    footer={{ big: { prefix: 'read the ', accent: 'docs', href: '/docs', hint: 'api + guides' } }}
/>
