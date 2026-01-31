<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import Example from '$lib/components/general/Example.svelte'
    import ScrollToItemExample from '$lib/examples/ScrollToItemExample.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Scroll to Item' }
            ]
        }
    })
</script>

<svelte:head>
    <title>Scroll to Item | Examples | Svelte Virtual List</title>
</svelte:head>

<Example>
    <ScrollToItemExample />
</Example>
