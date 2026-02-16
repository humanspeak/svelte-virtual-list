<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import InfiniteScrollExample from '$lib/examples/InfiniteScrollExample.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    const seo = getSeoContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Infinite Scroll' }
            ]
        }
    })
    $effect(() => {
        if (seo) {
            seo.title = 'Infinite Scroll | Examples | Svelte Virtual List'
            seo.description =
                'Automatically load more data as users scroll near the end of the list with seamless pagination and loading indicators.'
        }
    })
</script>

<Example>
    <InfiniteScrollExample />
</Example>
