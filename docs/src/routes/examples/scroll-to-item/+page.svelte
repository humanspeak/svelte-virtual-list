<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getSeoContext,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import ScrollToItemDemo from '$lib/examples/scroll-to-item/demos/Default.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Scroll to Item | Examples | Svelte Virtual List'
        seo.h1 = { title: 'Scroll to Item' }
        seo.description =
            'Programmatically scroll to any item in the virtual list with configurable alignment options like top, bottom, nearest, and auto.'
        seo.ogTitle = 'Scroll to Item'
        seo.ogTagline = 'Jump to any item with configurable alignment.'
        seo.ogFeatures = ['scroll()', 'Top/Bottom/Nearest', 'Smooth Scroll', 'Instant Jump']
        seo.ogSlug = 'examples-scroll-to-item'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-virtual-list/blob/main/docs/src/lib/examples/scroll-to-item/demos/Default.svelte'

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'METHODS',
            title: { prefix: 'imperative ', accent: 'scrolling', end: '.' },
            description:
                'Bind the list instance and call `scroll({ index, align, smoothScroll })` for keyboard navigation, search results, or deep links into large datasets.',
            snippet: demo,
            codeSnippet: code,
            barCells: [
                { k: 'method', v: 'scroll()' },
                { k: 'range', v: '0-9999' },
                { k: 'align', v: 'auto/top/bottom' }
            ],
            sourceUrl: SOURCE_URL
        }
    ]
</script>

{#snippet demo()}
    <ScrollToItemDemo />
{/snippet}

{#snippet code()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'scroll-to-item/demos/Default.svelte',
                'scroll-to-item',
                'Default.svelte'
            )
        ]}
        columns={1}
    />
{/snippet}

{#each sections as section, i (section.figId)}
    <ExampleV2 {...section} sheetLabel={formatSheetLabel(i, sections.length)} codeLabel="show code">
        {@render section.snippet()}
    </ExampleV2>
{/each}
