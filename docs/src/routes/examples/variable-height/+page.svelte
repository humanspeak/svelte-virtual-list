<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import VariableHeightExample from '$lib/examples/VariableHeightExample.svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    const seo = getSeoContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Variable Height' }
            ]
        }
    })
    $effect(() => {
        if (seo) {
            seo.title = 'Variable Height | Examples | Svelte Virtual List'
            seo.description =
                'Virtual list with automatic handling of variable item heights, supporting dynamic content like accordions and expandable rows.'
        }
    })
</script>

<Example>
    <VariableHeightExample />
</Example>
