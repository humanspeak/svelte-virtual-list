<!--
  Left sidebar navigation component
  Hierarchical structure with FontAwesome icons and proper styling
-->
<script lang="ts">
    import { onMount } from 'svelte'

    const { currentPath } = $props()

    type NavItem = {
        title: string
        href: string
        icon: string
    }

    type OtherProject = {
        url: string
        slug: string
        shortDescription: string
    }

    let otherProjects: NavItem[] = $state([])

    // Navigation structure with FontAwesome icons
    let navigation = $derived([
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
        },
        {
            title: 'Love and Respect',
            items: [{ title: 'Beye.ai', href: 'https://beye.ai', icon: 'fa-solid fa-heart' }]
        },
        ...(otherProjects.length > 0
            ? [
                  {
                      title: 'Other Projects',
                      items: otherProjects
                  }
              ]
            : [])
    ])

    onMount(async () => {
        try {
            const response = await fetch('/api/other-projects')
            if (!response.ok) {
                return
            }
            const projects: OtherProject[] = await response.json()

            // Convert to nav items format
            otherProjects = projects.map((project) => ({
                title: formatTitle(project.slug),
                href: project.url,
                icon: 'fa-solid fa-heart'
            }))
        } catch (error) {
            console.error('Failed to load other projects:', error)
        }
    })

    function formatTitle(slug: string): string {
        return slug
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    /**
     * @param {string} href
     * @returns {boolean}
     */
    function isActive(href: string) {
        return currentPath === href || (href !== '/docs' && currentPath.startsWith(href))
    }
</script>

<nav class="p-6">
    <div class="space-y-8">
        {#each navigation as section (section.title)}
            <div>
                <h3 class="text-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
                    {section.title}
                </h3>
                <ul class="space-y-1">
                    {#each section.items as item (item.href)}
                        <li>
                            <a
                                href={item.href}
                                class="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150
						     	{isActive(item.href)
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                            >
                                {#if item.icon}
                                    <i
                                        class="{item.icon} fa-fw mr-3 text-sm {isActive(item.href)
                                            ? 'text-accent-foreground'
                                            : 'text-muted-foreground group-hover:text-foreground'}"
                                    ></i>
                                {:else}
                                    <i
                                        class="fa-solid fa-arrow-right fa-fw text-muted-foreground mr-3 text-xs"
                                    ></i>
                                {/if}
                                {item.title}
                            </a>
                        </li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>
</nav>
