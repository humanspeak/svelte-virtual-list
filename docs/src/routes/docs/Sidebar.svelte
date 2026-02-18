<!--
  Left sidebar navigation component
  Hierarchical structure with FontAwesome icons and proper styling
-->
<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
    import { onMount } from 'svelte'
    import { slide } from 'svelte/transition'
    import { PersistedState } from 'runed'
    import { docsNavigation, type NavItem, type NavSection } from '$lib/utils/docsNav'

    const { currentPath } = $props()

    type OtherProject = {
        url: string
        slug: string
        shortDescription: string
    }

    let otherProjects: NavItem[] = $state([])
    const openSections = new PersistedState<Record<string, boolean>>('sidebar-sections', {})

    // Navigation structure combining static docs nav with dynamic other projects
    const navigation: NavSection[] = $derived([
        ...docsNavigation,
        {
            title: 'Love and Respect',
            icon: 'fa-solid fa-heart',
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
                      icon: 'fa-solid fa-cube',
                      items: otherProjects
                  }
              ]
            : [])
    ])

    const isSectionOpen = (section: NavSection): boolean => {
        if (section.title in openSections.current) return openSections.current[section.title]
        return true
    }

    const toggleSection = (section: NavSection) => {
        openSections.current = {
            ...openSections.current,
            [section.title]: !isSectionOpen(section)
        }
    }

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

    const formatTitle = (slug: string): string => slug.toLowerCase()

    const isActive = (href: string) => {
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

<nav class="p-2">
    <div class="space-y-2">
        {#each navigation as section (section.title)}
            <div>
                <button
                    onclick={() => toggleSection(section)}
                    class="text-text-primary hover:bg-muted flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-semibold tracking-wide uppercase transition-colors duration-150"
                >
                    <span class="flex items-center gap-2 text-left">
                        <motion.span
                            class="inline-flex shrink-0"
                            whileHover={{ scale: 1.25 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                            <i class="{section.icon} fa-fw text-muted-foreground text-sm"></i>
                        </motion.span>
                        {section.title}
                    </span>
                    <i
                        class="fa-solid fa-chevron-down text-muted-foreground shrink-0 text-xs transition-transform duration-200 {isSectionOpen(
                            section
                        )
                            ? 'rotate-180'
                            : ''}"
                    ></i>
                </button>
                {#if isSectionOpen(section)}
                    <ul
                        class="border-border mt-1 ml-3 space-y-1 border-l pl-1"
                        transition:slide={{ duration: 200 }}
                    >
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
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 15
                                            }}
                                        >
                                            <i
                                                class="{item.icon} fa-fw text-sm {isActive(
                                                    item.href
                                                )
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
                {/if}
            </div>
        {/each}
    </div>
</nav>
