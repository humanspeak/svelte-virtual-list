<script lang="ts">
    import { ComparisonPageV2, type CompareSlugLoadData } from '@humanspeak/docs-kit'
    import { competitors, exampleLinks, ours } from '$lib/compare-data'

    const { data }: { data: CompareSlugLoadData } = $props()
    const others = $derived(competitors.filter((c) => c.slug !== data.competitor.slug))
    const example = $derived(exampleLinks[data.competitor.slug])
</script>

<ComparisonPageV2
    competitor={data.competitor}
    {others}
    {ours}
    getStartedHref="/docs/install"
    examplesHref={example?.href}
    examplesLabel={example?.label}
/>
