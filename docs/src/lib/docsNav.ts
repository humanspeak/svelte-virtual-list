import type { NavSection } from '@humanspeak/docs-kit'
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
import Type from '@lucide/svelte/icons/type'
import Zap from '@lucide/svelte/icons/zap'

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
    }
]
