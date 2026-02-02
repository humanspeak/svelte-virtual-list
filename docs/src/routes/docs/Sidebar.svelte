<!--
  Left sidebar navigation component
  Hierarchical structure with FontAwesome icons and proper styling
-->
<script lang="ts">
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
