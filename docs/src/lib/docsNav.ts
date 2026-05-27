import type { Breadcrumb, NavSection } from '@humanspeak/docs-kit'
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down'
import Book from '@lucide/svelte/icons/book'
import Bug from '@lucide/svelte/icons/bug'
import Code from '@lucide/svelte/icons/code'
import Crosshair from '@lucide/svelte/icons/crosshair'
import Database from '@lucide/svelte/icons/database'
import InfinityIcon from '@lucide/svelte/icons/infinity'
import List from '@lucide/svelte/icons/list'
import Newspaper from '@lucide/svelte/icons/newspaper'
import Play from '@lucide/svelte/icons/play'
import Rocket from '@lucide/svelte/icons/rocket'
import Server from '@lucide/svelte/icons/server'
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal'
import Swords from '@lucide/svelte/icons/swords'
import Type from '@lucide/svelte/icons/type'
import Zap from '@lucide/svelte/icons/zap'

export const headerNav: { label: string; href: string }[] = [
    { label: 'docs', href: '/docs' },
    { label: 'examples', href: '/examples' },
    { label: 'compare', href: '/compare' },
    { label: 'blog', href: '/blog' }
]

const blogPostTitles: Record<string, string> = {
    'cursor-pagination-infinite-scroll-convex-svelte': 'Cursor Pagination with Convex'
}

const titleFor = (pathname: string) => {
    for (const section of docsSections) {
        const item = section.items.find((i) => i.href === pathname)
        if (item) return item.title
    }
    return pathname
        .split('/')
        .filter(Boolean)
        .pop()
        ?.split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}

export const buildBreadcrumbs = (pathname: string): Breadcrumb[] => {
    if (pathname === '/') return []
    if (pathname === '/docs') return [{ title: 'Docs' }]
    if (pathname === '/examples') return [{ title: 'Examples' }]
    if (pathname === '/compare') return [{ title: 'Compare' }]
    if (pathname === '/blog' || pathname === '/blog/') return [{ title: 'Blog' }]
    if (pathname.startsWith('/blog/')) {
        const slug = pathname.replace('/blog/', '').replace(/\/$/, '')
        return [
            { title: 'Blog', href: '/blog' },
            { title: blogPostTitles[slug] ?? titleFor(pathname) ?? slug }
        ]
    }
    if (pathname.startsWith('/examples/')) {
        return [
            { title: 'Examples', href: '/examples' },
            { title: titleFor(pathname) ?? 'Example' }
        ]
    }
    if (pathname.startsWith('/compare/')) {
        return [
            { title: 'Compare', href: '/compare' },
            { title: titleFor(pathname) ?? 'Comparison' }
        ]
    }
    if (pathname.startsWith('/docs/')) {
        return [{ title: 'Docs', href: '/docs' }, { title: titleFor(pathname) ?? 'Docs' }]
    }
    return []
}

export const docsSections: NavSection[] = [
    {
        title: 'Get Started',
        icon: Rocket,
        items: [{ title: 'Introduction', href: '/docs', icon: Rocket }]
    },
    {
        title: 'API Reference',
        icon: Book,
        items: [
            { title: 'Props', href: '/docs/api/props', icon: SlidersHorizontal },
            { title: 'Methods', href: '/docs/api/methods', icon: Code },
            { title: 'Events', href: '/docs/api/events', icon: Zap },
            { title: 'Types', href: '/docs/api/types', icon: Type }
        ]
    },
    {
        title: 'Examples',
        icon: Code,
        items: [
            { title: 'Variable Heights', href: '/docs/variable-heights', icon: ArrowUpDown },
            { title: 'Infinite Scroll', href: '/docs/infinite-scroll', icon: InfinityIcon },
            { title: 'Scroll Methods', href: '/docs/scroll-methods', icon: Crosshair },
            { title: 'SSR Support', href: '/docs/ssr', icon: Server },
            { title: 'Debug Mode', href: '/docs/debug', icon: Bug },
            { title: 'Convex', href: '/docs/convex', icon: Database }
        ]
    },
    {
        title: 'Blog',
        icon: Newspaper,
        items: [
            { title: 'All Posts', href: '/blog', icon: Newspaper },
            {
                title: 'Cursor Pagination with Convex',
                href: '/blog/cursor-pagination-infinite-scroll-convex-svelte',
                icon: Database
            }
        ]
    },
    {
        title: 'Interactive Demos',
        icon: Play,
        items: [
            { title: 'All Examples', href: '/examples', icon: Play },
            { title: 'Basic List', href: '/examples/basic-list', icon: List },
            { title: 'Infinite Scroll', href: '/examples/infinite-scroll', icon: InfinityIcon },
            { title: 'Scroll to Item', href: '/examples/scroll-to-item', icon: Crosshair },
            { title: 'Variable Height', href: '/examples/variable-height', icon: ArrowUpDown }
        ]
    },
    {
        title: 'Compare',
        icon: Swords,
        items: [
            { title: 'All Comparisons', href: '/compare', icon: Swords },
            { title: 'vs TanStack Virtual', href: '/compare/tanstack-virtual', icon: Swords },
            { title: 'vs virtua', href: '/compare/virtua', icon: Swords },
            {
                title: 'vs svelte-tiny-virtual-list',
                href: '/compare/svelte-tiny-virtual-list',
                icon: Swords
            },
            {
                title: 'vs @sveltejs/svelte-virtual-list',
                href: '/compare/sveltejs-svelte-virtual-list',
                icon: Swords
            }
        ]
    }
]
