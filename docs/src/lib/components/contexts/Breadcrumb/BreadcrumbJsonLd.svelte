<script lang="ts">
    import { page } from '$app/state'
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'

    const breadcrumbContext = getBreadcrumbContext()

    const jsonLd = $derived.by(() => {
        if (!breadcrumbContext?.breadcrumbs?.length) return ''

        const items = breadcrumbContext.breadcrumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.title,
            item: crumb.href ? `${page.url.origin}${crumb.href}` : undefined
        }))

        return JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items
        })
    })
</script>

<svelte:head>
    {#if jsonLd}
        {@html `<script type="application/ld+json">${jsonLd}</script>`}
    {/if}
</svelte:head>
