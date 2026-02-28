<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import BottomToTopExample from '$lib/examples/BottomToTopExample.svelte'

    const breadcrumbs = getBreadcrumbContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [
            { title: 'Examples', href: '/examples' },
            { title: 'Bottom to Top' }
        ]
    }

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Bottom to Top | Examples | Svelte Virtual List'
        seo.description =
            'Chat-style virtual list that renders items from bottom to top, ideal for messaging interfaces and real-time feeds.'
        seo.ogTitle = 'Bottom to Top'
        seo.ogTagline = 'Chat-style list anchored to the bottom.'
        seo.ogFeatures = ['Chat UI', 'Bottom Anchored', 'Real-time Feeds', 'Auto Scroll']
        seo.ogSlug = 'examples-bottom-to-top'
    }
</script>

<Example>
    <BottomToTopExample />
</Example>
