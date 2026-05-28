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
        'SSR-friendly package for SvelteKit apps',
        'Zero runtime dependencies and MIT licensed'
    ],
    consUs: [
        'Focused on vertical lists, not grids or masonry layouts',
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
            'Choose TanStack Virtual when you need headless control, grids, tables, or a cross-framework virtualizer strategy. Choose @humanspeak/svelte-virtual-list when you want a compact Svelte 5 component for large vertical lists with dynamic heights and infinite loading already shaped around Svelte snippets.',
        keywords: [
            'tanstack virtual svelte alternative',
            '@tanstack/svelte-virtual vs svelte virtual list',
            'svelte virtual list comparison'
        ]
    },
    {
        slug: 'virtua',
        name: 'virtua',
        tagline:
            'virtua is a zero-config multi-framework virtualizer. Svelte Virtual List is narrower and Svelte-specific.',
        description:
            'virtua ships virtual list and grid components for React, Vue, Solid, and Svelte. Its design emphasizes zero-config virtualization, dynamic size handling, reverse scrolling, horizontal lists, and broad UI scenarios. @humanspeak/svelte-virtual-list deliberately focuses on the Svelte 5 vertical-list path with a small API, Svelte snippets, SSR support, and built-in feed loading.',
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
            { name: 'Horizontal / reverse scrolling', us: false, them: true },
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
            'Strong fit for reverse, horizontal, RTL, mobile, sticky, and placeholder scenarios',
            'Multi-framework package for teams sharing patterns across stacks'
        ],
        consUs: [...shared.consUs],
        consThem: [
            'Broader API surface than many Svelte-only list views need',
            'Infinite loading remains a pattern you wire around the component',
            'Svelte usage shares mindshare with several other framework targets'
        ],
        verdict:
            'Choose virtua for broad virtualization coverage, grids, reverse or horizontal scrolling, and multi-framework consistency. Choose @humanspeak/svelte-virtual-list when the job is a Svelte 5 vertical list or feed and you want the smallest component API that covers dynamic heights, SSR, scrolling methods, and load-more behavior.',
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
        description:
            'svelte-tiny-virtual-list is a dependency-free virtual list inspired by react-tiny-virtual-list. It supports fixed or variable item sizes, horizontal lists, scroll-to-index props, header and footer slots, and a recomputeSizes method. @humanspeak/svelte-virtual-list targets Svelte 5 directly with snippets, dynamic measurement, SSR, and a smaller set of modern list-feed primitives.',
        website: 'https://github.com/jonasgeiler/svelte-tiny-virtual-list#readme',
        github: 'https://github.com/jonasgeiler/svelte-tiny-virtual-list',
        npm: 'svelte-tiny-virtual-list',
        type: 'Svelte Virtual List Component',
        approach: 'Slot-based component with explicit size inputs',
        features: [
            { name: 'Svelte 5 snippets', us: true, them: false },
            { name: 'Dynamic measured heights', us: true, them: 'Explicit sizes / recompute' },
            { name: 'Variable sizes from array/function', us: false, them: true },
            { name: 'Horizontal lists', us: false, them: true },
            { name: 'Infinite scroll helpers', us: true, them: 'Footer slot pattern' },
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
            'Header and footer slots are useful for wrappers and loaders',
            'Mature package with a long release history'
        ],
        consUs: [...shared.consUs],
        consThem: [
            'API predates Svelte 5 snippets',
            'Variable sizes are primarily supplied by itemSize data or recomputeSizes',
            'Infinite loading is composed through external footer patterns'
        ],
        verdict:
            'Choose svelte-tiny-virtual-list when you need horizontal mode or explicit item-size control in an older slot-style Svelte component. Choose @humanspeak/svelte-virtual-list for Svelte 5 snippet ergonomics, automatic dynamic height measurement, SSR-friendly docs, and built-in infinite loading behavior.',
        keywords: [
            'svelte-tiny-virtual-list alternative',
            'svelte-tiny-virtual-list vs svelte virtual list',
            'svelte 5 virtual list'
        ]
    },
    {
        slug: 'sveltejs-svelte-virtual-list',
        name: '@sveltejs/svelte-virtual-list',
        tagline:
            'The legacy Svelte package proved the pattern. Svelte Virtual List modernizes it for Svelte 5.',
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

export function getCompetitor(slug: string): Competitor | undefined {
    return competitors.find((competitor) => competitor.slug === slug)
}
