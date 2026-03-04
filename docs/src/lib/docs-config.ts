import type { DocsKitConfig } from '@humanspeak/docs-kit'

export const docsConfig: DocsKitConfig = {
    name: 'Svelte Virtual List',
    slug: 'virtual-list',
    npmPackage: '@humanspeak/svelte-virtual-list',
    repo: 'humanspeak/svelte-virtual-list',
    url: 'https://virtuallist.svelte.page',
    description:
        'A lightweight, high-performance virtual list component for Svelte 5. Efficiently render large datasets with dynamic heights, bidirectional scrolling, and TypeScript support.',
    keywords: [
        'svelte',
        'virtual list',
        'virtual scroll',
        'infinite scroll',
        'performance',
        'typescript'
    ],
    defaultFeatures: [
        'Dynamic Heights',
        'Bidirectional Scrolling',
        'TypeScript Support',
        '5kb Gzipped'
    ],
    fallbackStars: 100
}
