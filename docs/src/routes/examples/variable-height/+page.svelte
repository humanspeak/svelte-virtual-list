<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getSeoContext,
        type DemoManifestEntry,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import VariableHeightDemo from '$lib/examples/variable-height/demos/Default.svelte'
    import demoManifest from '$lib/demo-manifest.json'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Variable Height | Examples | Svelte Virtual List'
        seo.description =
            'Virtual list with automatic handling of variable item heights, supporting dynamic content like accordions and expandable rows.'
        seo.ogTitle = 'Variable Heights'
        seo.ogTagline = 'Auto-measured items with dynamic content.'
        seo.ogFeatures = ['Auto Measurement', 'Dynamic Content', 'Expandable Rows', 'Mixed Sizes']
        seo.ogSlug = 'examples-variable-height'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-virtual-list/blob/main/docs/src/lib/examples/variable-height/demos/Default.svelte'
    const manifest = demoManifest as Record<string, DemoManifestEntry>

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'MEASUREMENT',
            title: { prefix: 'dynamic ', accent: 'heights', end: '.' },
            description:
                'Rows can grow after initial render. The list observes item heights, updates offsets, and preserves scroll behavior as content expands.',
            snippet: demo,
            codeSnippet: code,
            barCells: [
                { k: 'items', v: '1,000' },
                { k: 'content', v: 'expandable' },
                { k: 'height', v: 'auto measured' }
            ],
            sourceUrl: SOURCE_URL
        }
    ]
</script>

{#snippet demo()}
    <VariableHeightDemo />
{/snippet}

{#snippet code()}
    <CodeReferenceV2
        samples={[
            {
                id: 'variable-height',
                label: 'Default.svelte',
                ...manifest['variable-height/demos/Default.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#each sections as section, i (section.figId)}
    <ExampleV2 {...section} sheetLabel={formatSheetLabel(i, sections.length)} codeLabel="show code">
        {@render section.snippet()}
    </ExampleV2>
{/each}
