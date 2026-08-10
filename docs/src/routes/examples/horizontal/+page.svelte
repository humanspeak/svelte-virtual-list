<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getSeoContext,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import HorizontalDemo from '$lib/examples/horizontal/demos/Default.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Horizontal & Responsive | Examples | Svelte Virtual List'
        seo.h1 = { title: 'Horizontal & Responsive' }
        seo.description =
            'An interactive 10,000-item horizontal virtual list with explicit orientation controls and a responsive breakpoint mode.'
        seo.ogTitle = 'Horizontal & Responsive Lists'
        seo.ogTagline = 'Virtualize wide collections and switch axes at runtime.'
        seo.ogFeatures = ['Horizontal Axis', 'Responsive Mode', '10,000 Items', 'Dynamic Widths']
        seo.ogSlug = 'examples-horizontal'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-virtual-list/blob/main/docs/src/lib/examples/horizontal/demos/Default.svelte'

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'ORIENTATION',
            title: { prefix: 'horizontal ', accent: 'by default', end: '.' },
            description:
                'The first render is visibly horizontal. Switch to vertical, or choose auto to let the list change axes at the 640px breakpoint while preserving the keyed viewport anchor.',
            snippet: demo,
            codeSnippet: code,
            barCells: [
                { k: 'items', v: '10,000' },
                { k: 'axes', v: 'horizontal + vertical' },
                { k: 'breakpoint', v: '640px' }
            ],
            sourceUrl: SOURCE_URL
        }
    ]
</script>

{#snippet demo()}
    <HorizontalDemo />
{/snippet}

{#snippet code()}
    <CodeReferenceV2
        samples={[
            demoCodeSample('horizontal/demos/Default.svelte', 'horizontal', 'Default.svelte')
        ]}
        columns={1}
    />
{/snippet}

{#each sections as section, i (section.figId)}
    <ExampleV2 {...section} sheetLabel={formatSheetLabel(i, sections.length)} codeLabel="show code">
        {@render section.snippet()}
    </ExampleV2>
{/each}
