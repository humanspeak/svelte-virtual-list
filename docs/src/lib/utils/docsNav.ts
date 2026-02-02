/**
 * Shared navigation data for docs section
 * Used by Sidebar and layout for consistent navigation and breadcrumbs
 */

export type NavItem = {
    title: string
    href: string
    icon: string
}

export type NavSection = {
    title: string
    items: NavItem[]
}

export const docsNavigation: NavSection[] = [
    {
        title: 'Get Started',
        items: [{ title: 'Introduction', href: '/docs', icon: 'fa-solid fa-rocket' }]
    },
    {
        title: 'Features',
        items: [
            {
                title: 'Variable Heights',
                href: '/docs/variable-heights',
                icon: 'fa-solid fa-arrows-up-down'
            },
            {
                title: 'Bottom to Top',
                href: '/docs/bottom-to-top',
                icon: 'fa-solid fa-comments'
            },
            {
                title: 'Infinite Scroll',
                href: '/docs/infinite-scroll',
                icon: 'fa-solid fa-infinity'
            },
            {
                title: 'Scroll Methods',
                href: '/docs/scroll-methods',
                icon: 'fa-solid fa-crosshairs'
            },
            {
                title: 'SSR Support',
                href: '/docs/ssr',
                icon: 'fa-solid fa-server'
            },
            {
                title: 'Debug Mode',
                href: '/docs/debug',
                icon: 'fa-solid fa-bug'
            }
        ]
    },
    {
        title: 'API Reference',
        items: [
            {
                title: 'Props',
                href: '/docs/api/props',
                icon: 'fa-solid fa-sliders'
            },
            {
                title: 'Methods',
                href: '/docs/api/methods',
                icon: 'fa-solid fa-code'
            },
            {
                title: 'Events',
                href: '/docs/api/events',
                icon: 'fa-solid fa-bolt'
            },
            {
                title: 'Types',
                href: '/docs/api/types',
                icon: 'fa-solid fa-t'
            }
        ]
    },
    {
        title: 'Integrations',
        items: [{ title: 'Convex', href: '/docs/convex', icon: 'fa-solid fa-database' }]
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
