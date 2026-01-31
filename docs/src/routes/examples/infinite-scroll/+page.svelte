<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import Example from '$lib/components/general/Example.svelte'
    import InfiniteScrollExample from '$lib/examples/InfiniteScrollExample.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Infinite Scroll' }
            ]
        }
    })
</script>

<svelte:head>
    <title>Infinite Scroll | Examples | Svelte Virtual List</title>
</svelte:head>

<Example>
    <InfiniteScrollExample />
</Example>
