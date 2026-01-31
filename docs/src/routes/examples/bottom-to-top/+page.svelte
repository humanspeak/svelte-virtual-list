<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import Example from '$lib/components/general/Example.svelte'
    import BottomToTopExample from '$lib/examples/BottomToTopExample.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Bottom to Top' }
            ]
        }
    })
</script>

<svelte:head>
    <title>Bottom to Top | Examples | Svelte Virtual List</title>
</svelte:head>

<Example>
    <BottomToTopExample />
</Example>
