<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import Example from '$lib/components/general/Example.svelte'
    import VariableHeightExample from '$lib/examples/VariableHeightExample.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Variable Height' }
            ]
        }
    })
</script>

<svelte:head>
    <title>Variable Height | Examples | Svelte Virtual List</title>
</svelte:head>

<Example>
    <VariableHeightExample />
</Example>
