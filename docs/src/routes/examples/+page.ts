import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
    // Load example metadata - this could be expanded to read from individual +page.ts files
    // or from a centralized configuration file
    const examples = {
        'basic-list': {
            title: 'Basic List',
            description: 'Interactive basic list animation example using Svelte Motion.',
            sourceUrl: null
        },
        'bottom-to-top': {
            title: 'Bottom To Top',
            description: 'Interactive bottom to top animation example using Svelte Motion.',
            sourceUrl: null
        },
        'infinite-scroll': {
            title: 'Infinite Scroll',
            description: 'Interactive infinite scroll animation example using Svelte Motion.',
            sourceUrl: null
        },
        'scroll-to-item': {
            title: 'Scroll To Item',
            description: 'Interactive scroll to item animation example using Svelte Motion.',
            sourceUrl: null
        },
        'variable-height': {
            title: 'Variable Height',
            description: 'Interactive variable height animation example using Svelte Motion.',
            sourceUrl: null
        }
    }

    return {
        examples
    }
}
