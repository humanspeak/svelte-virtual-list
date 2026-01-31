<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import Example from '$lib/components/general/Example.svelte'
    import BasicList from '$lib/examples/BasicList.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Basic List' }
            ]
        }
    })
</script>

<svelte:head>
    <title>Basic List | Examples | Svelte Virtual List</title>
</svelte:head>

<Example>
    <BasicList />
</Example>
