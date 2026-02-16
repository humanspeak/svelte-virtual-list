<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import BasicList from '$lib/examples/BasicList.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    const seo = getSeoContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Basic List' }
            ]
        }
    })
    $effect(() => {
        if (seo) {
            seo.title = 'Basic List | Examples | Svelte Virtual List'
            seo.description =
                'A simple virtual list rendering thousands of items efficiently with fixed-height rows and smooth scrolling performance.'
        }
    })
</script>

<Example>
    <BasicList />
</Example>
