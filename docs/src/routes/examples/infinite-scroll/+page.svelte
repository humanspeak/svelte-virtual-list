<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getSeoContext,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import InfiniteScrollDemo from '$lib/examples/infinite-scroll/demos/Default.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Infinite Scroll | Examples | Svelte Virtual List'
        seo.h1 = { title: 'Infinite Scroll' }
        seo.description =
            'Automatically load more data as users scroll near the end of the list with seamless pagination and loading indicators.'
        seo.ogTitle = 'Infinite Scroll'
        seo.ogTagline = 'Load more data seamlessly as users scroll.'
        seo.ogFeatures = ['Auto Loading', 'Pagination', 'Loading States', 'Threshold Config']
        seo.ogSlug = 'examples-infinite-scroll'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-virtual-list/blob/main/docs/src/lib/examples/infinite-scroll/demos/Default.svelte'

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'PAGINATION',
            title: { prefix: 'load ', accent: 'on demand', end: '.' },
            description:
                '`onLoadMore`, `hasMore`, and `loadMoreThreshold` cover the common feed pattern without rendering pages the user has not reached yet.',
            snippet: demo,
            codeSnippet: code,
            barCells: [
                { k: 'batch', v: '50 rows' },
                { k: 'threshold', v: '10 rows' },
                { k: 'cap', v: '500 rows' }
            ],
            sourceUrl: SOURCE_URL
        }
    ]
</script>

{#snippet demo()}
    <InfiniteScrollDemo />
{/snippet}

{#snippet code()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'infinite-scroll/demos/Default.svelte',
                'infinite-scroll',
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
