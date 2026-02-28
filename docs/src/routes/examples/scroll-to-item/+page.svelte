<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import ScrollToItemExample from '$lib/examples/ScrollToItemExample.svelte'

    const breadcrumbs = getBreadcrumbContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [
            { title: 'Examples', href: '/examples' },
            { title: 'Scroll to Item' }
        ]
    }

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Scroll to Item | Examples | Svelte Virtual List'
        seo.description =
            'Programmatically scroll to any item in the virtual list with configurable alignment options like start, center, and end.'
        seo.ogTitle = 'Scroll to Item'
        seo.ogTagline = 'Jump to any item with configurable alignment.'
        seo.ogFeatures = ['scrollToIndex', 'Start/Center/End', 'Smooth Scroll', 'Instant Jump']
        seo.ogSlug = 'examples-scroll-to-item'
    }
</script>

<Example>
    <ScrollToItemExample />
</Example>
