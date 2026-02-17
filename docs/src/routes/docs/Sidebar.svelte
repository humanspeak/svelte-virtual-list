<!--
  Left sidebar navigation component
  Hierarchical structure with FontAwesome icons and proper styling
-->
<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
    import { onMount } from 'svelte'
    import { docsNavigation, type NavItem } from '$lib/utils/docsNav'

    const { currentPath } = $props()

    type OtherProject = {
        url: string
        slug: string
        shortDescription: string
    }

    let otherProjects: NavItem[] = $state([])

    // Navigation structure combining static docs nav with dynamic other projects
    let navigation = $derived([
        ...docsNavigation,
        {
            title: 'Love and Respect',
            items: [
                {
                    title: 'Beye.ai',
                    href: 'https://beye.ai',
                    icon: 'fa-solid fa-heart',
                    external: true
                }
            ]
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
                icon: 'fa-solid fa-heart',
                external: true
            }))
        } catch (error) {
            console.error('Failed to load other projects:', error)
        }
    })

    function formatTitle(slug: string): string {
        return `/${slug.toLowerCase()}`
    }

    /**
     * @param {string} href
     * @returns {boolean}
     */
    function isActive(href: string) {
        const basePath = currentPath.split(/[?#]/)[0]
        if (href === '/docs' || href === '/docs/examples') {
            return (
                basePath === href ||
                currentPath.startsWith(`${href}?`) ||
                currentPath.startsWith(`${href}#`)
            )
        }
        return (
            basePath === href ||
            currentPath.startsWith(`${href}?`) ||
            currentPath.startsWith(`${href}#`) ||
            basePath.startsWith(`${href}/`)
        )
    }
</script>

<nav class="p-6">
    <div class="space-y-8">
        {#each navigation as section (section.title)}
            <div>
                <h3 class="text-text-primary mb-3 text-sm font-semibold tracking-wide uppercase">
                    {section.title}
                </h3>
                <ul class="space-y-1">
                    {#each section.items as item (item.href)}
                        <motion.li
                            whileHover={{ x: 2 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                            <a
                                href={item.href}
                                target={item?.external ? '_blank' : undefined}
                                rel={item?.external ? 'noopener' : undefined}
                                class="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150
                                 {isActive(item.href)
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                            >
                                {#if item.icon}
                                    <motion.span
                                        class="mr-3 inline-flex"
                                        whileHover={{ scale: 1.25 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                    >
                                        <i
                                            class="{item.icon} fa-fw text-sm {isActive(item.href)
                                                ? 'text-accent-foreground'
                                                : 'text-muted-foreground group-hover:text-foreground'}"
                                        ></i>
                                    </motion.span>
                                {:else}
                                    <i
                                        class="fa-solid fa-arrow-right fa-fw text-muted-foreground mr-3 text-xs"
                                    ></i>
                                {/if}
                                {item.title}
                                {#if item?.external}
                                    <i
                                        class="fa-solid fa-arrow-up-right-from-square ml-2 text-xs opacity-50"
                                    ></i>
                                {/if}
                            </a>
                        </motion.li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>
</nav>
