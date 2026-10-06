<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getSeoContext,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import HeaderFooterDemo from '$lib/examples/header-footer/demos/Default.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Headers & Footers | Examples | Svelte Virtual List'
        seo.h1 = { title: 'Headers & Footers' }
        seo.description =
            'Resize header and footer snippets while preserving your reading position, scroll to the end, and try an empty list.'
        seo.ogTitle = 'Headers & Footers'
        seo.ogTagline = 'Resize content around the rows without losing your place.'
        seo.ogFeatures = ['Header Snippet', 'Footer Snippet', 'Scroll Anchoring', 'Empty Lists']
        seo.ogSlug = 'examples-header-footer'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-virtual-list/blob/main/docs/src/lib/examples/header-footer/demos/Default.svelte'

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'MEASURED CONTENT',
            title: { prefix: 'measured ', accent: 'headers & footers', end: '.' },
            description:
                'Header and footer snippets participate in the scrollable content. Resize either snippet, navigate to a reading row or the physical end, and remove all rows to see how empty lists behave.',
            snippet: demo,
            codeSnippet: code,
            barCells: [
                { k: 'items', v: '100' },
                { k: 'snippets', v: 'header + footer' },
                { k: 'rows', v: '32px' }
            ],
            sourceUrl: SOURCE_URL
        }
    ]
</script>

{#snippet demo()}
    <HeaderFooterDemo />
{/snippet}

{#snippet code()}
    <CodeReferenceV2
        samples={[
            demoCodeSample('header-footer/demos/Default.svelte', 'header-footer', 'Default.svelte')
        ]}
        columns={1}
    />
{/snippet}

{#each sections as section, i (section.figId)}
    <ExampleV2 {...section} sheetLabel={formatSheetLabel(i, sections.length)} codeLabel="show code">
        {@render section.snippet()}
    </ExampleV2>
{/each}
