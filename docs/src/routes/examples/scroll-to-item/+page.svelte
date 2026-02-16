<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import ScrollToItemExample from '$lib/examples/ScrollToItemExample.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    const seo = getSeoContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Scroll to Item' }
            ]
        }
    })
    $effect(() => {
        if (seo) {
            seo.title = 'Scroll to Item | Examples | Svelte Virtual List'
            seo.description =
                'Programmatically scroll to any item in the virtual list with configurable alignment options like start, center, and end.'
        }
    })
</script>

<Example>
    <ScrollToItemExample />
</Example>
