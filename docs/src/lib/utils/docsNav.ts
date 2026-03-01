/**
 * Shared navigation data for docs section
 * Used by Sidebar and layout for consistent navigation and breadcrumbs
 */

export type NavItem = {
    title: string
    href: string
    icon: string
    external?: boolean
}

export type NavSection = {
    title: string
    icon: string
    items: NavItem[]
}

export const docsNavigation: NavSection[] = [
    {
        title: 'Get Started',
        icon: 'rocket',
        items: [{ title: 'Introduction', href: '/docs', icon: 'rocket' }]
    },
    {
        title: 'API Reference',
        icon: 'book',
        items: [
            {
                title: 'Props',
                href: '/docs/api/props',
                icon: 'sliders-horizontal'
            },
            {
                title: 'Methods',
                href: '/docs/api/methods',
                icon: 'code'
            },
            {
                title: 'Events',
                href: '/docs/api/events',
                icon: 'zap'
            },
            {
                title: 'Types',
                href: '/docs/api/types',
                icon: 'type'
            }
        ]
    },
    {
        title: 'Examples',
        icon: 'code',
        items: [
            {
                title: 'Variable Heights',
                href: '/docs/variable-heights',
                icon: 'arrow-up-down'
            },
            {
                title: 'Bottom to Top',
                href: '/docs/bottom-to-top',
                icon: 'message-circle'
            },
            {
                title: 'Infinite Scroll',
                href: '/docs/infinite-scroll',
                icon: 'infinity'
            },
            {
                title: 'Scroll Methods',
                href: '/docs/scroll-methods',
                icon: 'crosshair'
            },
            {
                title: 'SSR Support',
                href: '/docs/ssr',
                icon: 'server'
            },
            {
                title: 'Debug Mode',
                href: '/docs/debug',
                icon: 'bug'
            },
            {
                title: 'Convex',
                href: '/docs/convex',
                icon: 'database'
            }
        ]
    },
    {
        title: 'Interactive Demos',
        icon: 'play',
        items: [
            {
                title: 'All Examples',
                href: '/examples',
                icon: 'play'
            },
            {
                title: 'Basic List',
                href: '/examples/basic-list',
                icon: 'list'
            },
            {
                title: 'Bottom to Top',
                href: '/examples/bottom-to-top',
                icon: 'message-circle'
            },
            {
                title: 'Infinite Scroll',
                href: '/examples/infinite-scroll',
                icon: 'infinity'
            },
            {
                title: 'Scroll to Item',
                href: '/examples/scroll-to-item',
                icon: 'crosshair'
            },
            {
                title: 'Variable Height',
                href: '/examples/variable-height',
                icon: 'arrow-up-down'
            }
        ]
    }
]

/**
 * Look up a docs page title by its pathname
 * @param pathname - The URL pathname (e.g., '/docs/infinite-scroll')
 * @returns The page title or null if not found
 */
export function getDocsTitleByPath(pathname: string): string | null {
    for (const section of docsNavigation) {
        const item = section.items.find((item) => item.href === pathname)
        if (item) return item.title
    }
    return null
}
