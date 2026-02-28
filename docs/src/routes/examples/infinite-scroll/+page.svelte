<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import InfiniteScrollExample from '$lib/examples/InfiniteScrollExample.svelte'

    const breadcrumbs = getBreadcrumbContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [
            { title: 'Examples', href: '/examples' },
            { title: 'Infinite Scroll' }
        ]
    }

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Infinite Scroll | Examples | Svelte Virtual List'
        seo.description =
            'Automatically load more data as users scroll near the end of the list with seamless pagination and loading indicators.'
        seo.ogTitle = 'Infinite Scroll'
        seo.ogTagline = 'Load more data seamlessly as users scroll.'
        seo.ogFeatures = ['Auto Loading', 'Pagination', 'Loading States', 'Threshold Config']
        seo.ogSlug = 'examples-infinite-scroll'
    }
</script>

<Example>
    <InfiniteScrollExample />
</Example>
