<script lang="ts">
    import { type Snippet } from 'svelte'
    import { type SeoContext } from '$lib/components/contexts/Seo/type'
    import { setSeoContext } from '$lib/components/contexts/Seo/Seo.context'

    const { seo, children } = $props<{
        seo: SeoContext
        children?: Snippet
    }>()

    setSeoContext(seo)
</script>

{@render children?.()}
