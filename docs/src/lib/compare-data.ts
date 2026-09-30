import type { ComparisonOurs, Competitor } from '@humanspeak/docs-kit'

export type { ComparisonFeature, ComparisonOurs, Competitor } from '@humanspeak/docs-kit'

export const ours: ComparisonOurs = {
    name: 'Svelte Virtual List',
    npmPackage: '@humanspeak/svelte-virtual-list',
    slug: 'svelte-virtual-list',
    url: 'https://virtuallist.svelte.page'
}

const shared = {
    prosUs: [
        'Svelte 5-native component API with snippets and TypeScript generics',
        'Dynamic height measurement without requiring a size map up front',
        'Built-in infinite loading hooks for feed and pagination workflows',
        'Imperative scroll method with index and alignment control',
        'Vertical and horizontal layouts, including reactive orientation switching',
        'SSR-friendly package for SvelteKit apps',
        'Zero runtime dependencies and MIT licensed'
    ],
    consUs: [
        'Focused on one-dimensional lists, not grids or masonry layouts',
        'Horizontal mode is LTR-only in the current release',
        'Requires Svelte 5',
        'Newer package with a smaller ecosystem than older virtualizer projects'
    ]
}

export const competitors: Competitor[] = [
    {
        slug: 'tanstack-virtual',
        name: 'TanStack Virtual',
        tagline:
            'TanStack Virtual is a powerful headless virtualizer. Svelte Virtual List is the smaller Svelte-first component.',
        seoDescription:
            'TanStack Virtual is a headless virtualizer; Svelte Virtual List is a ready-made Svelte 5 component. Compare setup, row heights, infinite scroll, and grids.',
        description:
            'TanStack Virtual provides headless virtualizer primitives across several frameworks, including Svelte. It is a strong fit when you want to own markup, measurement wiring, and advanced composition. @humanspeak/svelte-virtual-list packages the common Svelte list workflow as a component with snippets, dynamic measurement, infinite loading, and scroll methods built in.',
        website: 'https://tanstack.com/virtual/latest/docs/framework/svelte',
        github: 'https://github.com/TanStack/virtual',
        npm: '@tanstack/svelte-virtual',
        type: 'Headless Virtualizer',
        approach: 'Framework adapter around virtualizer primitives',
        features: [
            { name: 'Svelte support', us: 'Svelte 5 component', them: 'Svelte adapter' },
            { name: 'Component renders rows', us: true, them: false },
            { name: 'Headless primitives', us: false, them: true },
            { name: 'Dynamic item heights', us: true, them: true },
            { name: 'Infinite scroll helpers', us: true, them: 'User-land pattern' },
            { name: 'Programmatic scroll to index', us: true, them: true },
            { name: 'Grid virtualization', us: false, them: true },
            { name: 'SSR-friendly SvelteKit usage', us: true, them: true },
            { name: 'Runtime dependencies', us: '0', them: '@tanstack/virtual-core' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Less boilerplate for ordinary Svelte list and feed views',
            'Row rendering stays in idiomatic Svelte snippets'
        ],
        prosThem: [
            'Battle-tested TanStack ecosystem and broad framework coverage',
            'Headless control over markup and layout',
            'Advanced examples for fixed, variable, dynamic, sticky, infinite, smooth scroll, and table use cases',
            'Better fit for grids or heavily custom virtualizer composition'
        ],
        consUs: [...shared.consUs],
        consThem: [
            'More wiring for common list UI because it is headless',
            'Not a drop-in Svelte row component',
            'Bundle includes a core virtualizer dependency'
        ],
        verdict:
            'Choose TanStack Virtual when you need headless control, grids, tables, or a cross-framework virtualizer strategy. Choose @humanspeak/svelte-virtual-list when you want a compact Svelte 5 component for large vertical or LTR-horizontal lists with dynamic measurement and infinite loading already shaped around Svelte snippets.',
        keywords: [
            'tanstack virtual svelte alternative',
            '@tanstack/svelte-virtual vs svelte virtual list',
            'svelte virtual list comparison'
        ]
    },
    {
        slug: 'svelte-virtual',
        name: 'svelte-virtual',
        tagline:
            'svelte-virtual renders fixed-size lists and grids. Svelte Virtual List measures rows automatically and supports Svelte 5 in its stable release.',
        seoTitle: 'svelte-virtual npm Package Alternative for Svelte 5',
        seoDescription:
            'The svelte-virtual npm package supports Svelte 5 only in a 2024 prerelease and needs fixed item sizes. Compare it with Svelte Virtual List for Svelte 5.',
        description:
            'svelte-virtual provides List and Grid components that render only the visible rows, from an itemCount and a fixed itemSize. Its stable 0.6 release (February 2024) supports Svelte 3 and 4; Svelte 5 support is in the 1.0.0-next prerelease, last published in November 2024. @humanspeak/svelte-virtual-list is a stable Svelte 5 component that measures each row as it renders, loads more data near the end of the list, and scrolls to any index or offset.',
        website: 'https://www.npmjs.com/package/svelte-virtual',
        github: 'https://github.com/ghostebony/svelte-virtual',
        npm: 'svelte-virtual',
        type: 'Svelte List and Grid Virtualizer',
        approach: 'Fixed-size List and Grid components driven by itemCount',
        features: [
            { name: 'Svelte 5 support', us: 'Stable release', them: 'Prerelease (1.0.0-next)' },
            { name: 'Dynamic measured heights', us: true, them: 'Fixed itemSize' },
            { name: 'Grid virtualization', us: false, them: true },
            { name: 'Horizontal lists', us: 'LTR, runtime switchable', them: true },
            { name: 'Sticky rows', us: false, them: true },
            { name: 'Infinite scroll helpers', us: true, them: 'User-land pattern' },
            { name: 'Programmatic scroll to index', us: true, them: true },
            { name: 'Runtime dependencies', us: '0', them: '0' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Rows of different heights need no size data up front',
            'Svelte 5 support in a stable, maintained release'
        ],
        prosThem: [
            'List and Grid components in one package',
            'Sticky indices for pinned rows',
            'Simple itemCount and itemSize API for uniform rows',
            'Scroll-to-index and scroll-to-position methods'
        ],
        consUs: [...shared.consUs],
        consThem: [
            'Svelte 5 support is only in a prerelease, last published November 2024',
            'Every row shares one fixed size; there is no automatic height measurement',
            'Infinite loading is wired in application code'
        ],
        verdict:
            'Choose svelte-virtual when every row has the same fixed size, or when you need a virtual grid or sticky rows. Choose @humanspeak/svelte-virtual-list for Svelte 5 lists whose rows vary in height, with infinite loading and scroll methods in a stable release.',
        keywords: [
            'svelte-virtual alternative',
            'svelte-virtual npm',
            'svelte-virtual vs svelte virtual list'
        ]
    },
    {
        slug: 'virtua',
        name: 'virtua',
        tagline:
            'virtua is a zero-config multi-framework virtualizer. Svelte Virtual List is narrower and Svelte-specific.',
        seoDescription:
            'virtua virtualizes lists and grids for React, Vue, Solid, and Svelte; Svelte Virtual List is Svelte 5 only. Compare features and when to choose each.',
        description:
            'virtua ships virtual list and grid components for React, Vue, Solid, and Svelte. Its design emphasizes zero-config virtualization, dynamic size handling, reverse scrolling, and broad UI scenarios. @humanspeak/svelte-virtual-list focuses on a small Svelte 5 list API with vertical and horizontal layouts, Svelte snippets, SSR-friendly hydration without a manual item-count prop, and built-in feed loading.',
        website: 'https://inokawa.github.io/virtua/',
        github: 'https://github.com/inokawa/virtua',
        npm: 'virtua',
        type: 'Multi-framework Virtualizer',
        approach: 'Zero-config components for list and grid use cases',
        features: [
            { name: 'Svelte support', us: 'Svelte 5 component', them: 'Svelte entrypoint' },
            { name: 'Dynamic item heights', us: true, them: true },
            { name: 'Infinite scroll helpers', us: true, them: 'User-land pattern' },
            { name: 'Programmatic scroll to index', us: true, them: true },
            { name: 'Grid virtualization', us: false, them: true },
            { name: 'Horizontal scrolling', us: 'LTR', them: true },
            { name: 'Reverse scrolling', us: false, them: true },
            { name: 'Framework coverage', us: 'Svelte', them: 'React, Vue, Solid, Svelte' },
            { name: 'Runtime dependencies', us: '0', them: '0' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Svelte-specific docs and examples instead of a shared multi-framework surface',
            'Integrated load-more threshold API'
        ],
        prosThem: [
            'Very broad virtualization feature set',
            'List and grid components',
            'Strong fit for reverse, RTL, mobile, sticky, and placeholder scenarios',
            'Multi-framework package for teams sharing patterns across stacks'
        ],
        consUs: [...shared.consUs],
        consThem: [
            'Broader API surface than many Svelte-only list views need',
            'Infinite loading remains a pattern you wire around the component',
            'Svelte usage shares mindshare with several other framework targets'
        ],
        verdict:
            'Choose virtua for broad virtualization coverage, grids, reverse/RTL scrolling, and multi-framework consistency. Choose @humanspeak/svelte-virtual-list for a focused Svelte 5 vertical or LTR-horizontal list with dynamic measurement, responsive axis switching, SSR-friendly hydration without a manual item-count prop, scrolling methods, and load-more behavior.',
        keywords: [
            'virtua svelte alternative',
            'virtua vs svelte virtual list',
            'svelte virtua compare'
        ]
    },
    {
        slug: 'svelte-tiny-virtual-list',
        name: 'svelte-tiny-virtual-list',
        tagline:
            'svelte-tiny-virtual-list is older, tiny, and flexible. Svelte Virtual List is built around Svelte 5 ergonomics.',
        seoTitle: 'svelte-tiny-virtual-list vs Svelte Virtual List (Svelte 5)',
        seoDescription:
            'A svelte-tiny-virtual-list alternative: it needs item sizes up front, while Svelte Virtual List measures rows automatically. See features and trade-offs.',
        description:
            'svelte-tiny-virtual-list is a small, dependency-free Svelte 5 list that renders rows from sizes you supply: a fixed itemSize, an array, or a function, with recomputeSizes when they change. @humanspeak/svelte-virtual-list measures each row as it renders instead, and adds built-in infinite loading, reactive vertical↔horizontal switching, and index and offset scrolling.',
        website: 'https://github.com/jonasgeiler/svelte-tiny-virtual-list#readme',
        github: 'https://github.com/jonasgeiler/svelte-tiny-virtual-list',
        npm: 'svelte-tiny-virtual-list',
        type: 'Svelte Virtual List Component',
        approach: 'Svelte 5 snippet API with explicit size inputs',
        features: [
            { name: 'Svelte 5 snippets', us: true, them: true },
            { name: 'Dynamic measured heights', us: true, them: 'Explicit sizes / recompute' },
            { name: 'Variable sizes from array/function', us: false, them: true },
            { name: 'Horizontal lists', us: 'LTR, runtime switchable', them: true },
            { name: 'Infinite scroll helpers', us: true, them: 'Footer snippet pattern' },
            { name: 'Programmatic scroll to index', us: true, them: true },
            { name: 'Runtime dependencies', us: '0', them: '0' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Automatic measurement suits content whose height changes after render',
            'Modern Svelte 5 snippet API'
        ],
        prosThem: [
            'Small and dependency-free',
            'Supports fixed, variable, vertical, and horizontal modes',
            'Header and footer snippets are useful for wrappers and loaders',
            'Mature package with a long release history'
        ],
        consUs: [...shared.consUs],
        consThem: [
            'Variable sizes are primarily supplied by itemSize data or recomputeSizes',
            'Infinite loading is composed through external footer patterns'
        ],
        verdict:
            'Choose svelte-tiny-virtual-list for its Svelte 5 snippet API with explicit size arrays/functions and sticky indices. Choose @humanspeak/svelte-virtual-list for automatic dynamic measurement, reactive vertical↔horizontal switching, SSR-friendly docs, and built-in infinite loading.',
        keywords: [
            'svelte-tiny-virtual-list alternative',
            'svelte-tiny-virtual-list vs svelte virtual list',
            'svelte 5 virtual list'
        ]
    },
    {
        slug: 'svelte-virtuallists',
        name: 'svelte-virtuallists',
        tagline:
            'svelte-virtuallists offers list and table virtualizers. Svelte Virtual List keeps a smaller one-dimensional component API.',
        seoTitle: 'svelte-virtuallists vs Svelte Virtual List: Lists and Tables',
        seoDescription:
            'svelte-virtuallists adds virtual tables; Svelte Virtual List is one measured list component. Compare Svelte 5 support, maintenance, and features.',
        description:
            'svelte-virtuallists documents Svelte 5 virtual list and table components with vertical and horizontal layouts. @humanspeak/svelte-virtual-list concentrates on one list component with automatic dynamic measurement, reactive orientation switching, infinite-loading hooks, and index/offset scrolling.',
        website: 'https://orefalo.github.io/svelte-virtuallists/',
        github: 'https://github.com/orefalo/svelte-virtuallists',
        npm: 'svelte-virtuallists',
        type: 'Svelte List and Table Virtualizers',
        approach: 'Dedicated list and table components for Svelte 5',
        features: [
            { name: 'Svelte 5 support', us: true, them: true },
            { name: 'Horizontal and vertical layouts', us: 'List, LTR horizontal', them: true },
            { name: 'Reactive orientation switching', us: true, them: 'Not documented' },
            { name: 'Table virtualization', us: false, them: true },
            { name: 'Dynamic item measurement', us: true, them: true },
            { name: 'Programmatic index scrolling', us: true, them: true },
            { name: 'Raw offset scrolling', us: true, them: 'Not documented' },
            { name: 'Infinite loading hook', us: true, them: 'User-land pattern' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Single list API for static and responsive orientation',
            'Built-in load-more and raw-offset methods'
        ],
        prosThem: [
            'Includes virtual table components',
            'Documents both horizontal and vertical layouts',
            'Svelte 5-focused package and examples'
        ],
        consUs: [...shared.consUs],
        consThem: [
            'Broader list/table surface when only a list is needed',
            'Infinite loading remains application wiring',
            'Reactive axis-switch anchor behavior is not part of the documented contract',
            'No release since March 2025, a maintenance gap of roughly 18 months'
        ],
        verdict:
            'Choose svelte-virtuallists when virtual tables are central to the UI. Choose @humanspeak/svelte-virtual-list when you want one measured list component with responsive axis switching, built-in loading edges, and both index and raw-offset methods.',
        keywords: [
            'svelte-virtuallists alternative',
            'svelte-virtuallists comparison',
            'svelte-virtuallists vs svelte virtual list'
        ]
    },
    {
        slug: 'sveltejs-svelte-virtual-list',
        name: '@sveltejs/svelte-virtual-list',
        tagline:
            'The legacy Svelte package proved the pattern. Svelte Virtual List modernizes it for Svelte 5.',
        seoDescription:
            '@sveltejs/svelte-virtual-list was last published in 2019. Svelte Virtual List is a maintained Svelte 5 replacement built on the same simple component idea.',
        description:
            '@sveltejs/svelte-virtual-list is the historical Svelte virtual list demo package. It renders visible items from an `items` array and uses classic slot syntax. It has not been published in years. @humanspeak/svelte-virtual-list keeps the simple component idea but updates the API for Svelte 5 snippets, TypeScript, dynamic height measurement, infinite loading, methods, and current SvelteKit documentation.',
        website: 'https://www.npmjs.com/package/@sveltejs/svelte-virtual-list',
        github: 'https://github.com/sveltejs/svelte-virtual-list',
        npm: '@sveltejs/svelte-virtual-list',
        type: 'Legacy Svelte Virtual List',
        approach: 'Classic Svelte component demo package',
        features: [
            { name: 'Svelte 5 snippets', us: true, them: false },
            { name: 'Dynamic item heights', us: true, them: 'Limited legacy behavior' },
            { name: 'Infinite scroll helpers', us: true, them: false },
            { name: 'Programmatic scroll to index', us: true, them: false },
            { name: 'TypeScript-first API', us: true, them: false },
            { name: 'Current maintenance', us: true, them: false },
            { name: 'Runtime dependencies', us: '0', them: '0' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Current Svelte 5 syntax and package metadata',
            'Documented methods, events, and examples'
        ],
        prosThem: [
            'Very simple historical API',
            'Recognizable package name from the Svelte organization',
            'Useful as a reference for the original virtual-list concept'
        ],
        consUs: [...shared.consUs],
        consThem: [
            'Published years ago and not shaped for Svelte 5',
            'Classic slot API instead of snippets',
            'No modern infinite loading or scroll method surface',
            'Sparse current documentation'
        ],
        verdict:
            'For new Svelte 5 work, use @humanspeak/svelte-virtual-list. The legacy @sveltejs package is valuable history, but modern apps need current syntax, TypeScript, dynamic height handling, and maintained docs.',
        keywords: [
            '@sveltejs/svelte-virtual-list alternative',
            'sveltejs virtual list replacement',
            'modern svelte virtual list'
        ]
    }
]

/**
 * The example each comparison links to from its masthead, with a
 * descriptive anchor instead of a generic "examples" link: the example that
 * best shows where we differ from that competitor.
 */
export const exampleLinks: Record<string, { href: string; label: string }> = {
    'tanstack-virtual': { href: '/examples/infinite-scroll', label: 'infinite scroll example' },
    'svelte-virtual': { href: '/examples/variable-height', label: 'variable height example' },
    virtua: { href: '/examples/variable-height', label: 'variable height example' },
    'svelte-tiny-virtual-list': {
        href: '/examples/variable-height',
        label: 'dynamic height example'
    },
    'svelte-virtuallists': { href: '/examples/horizontal', label: 'horizontal list example' },
    'sveltejs-svelte-virtual-list': { href: '/examples/basic-list', label: 'basic list example' }
}

export function getCompetitor(slug: string): Competitor | undefined {
    return competitors.find((competitor) => competitor.slug === slug)
}
