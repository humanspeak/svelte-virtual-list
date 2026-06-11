<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getSeoContext,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import BasicListDemo from '$lib/examples/basic-list/demos/Default.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Basic List | Examples | Svelte Virtual List'
        seo.h1 = { title: 'Basic List' }
        seo.description =
            'A simple virtual list rendering thousands of items efficiently with fixed-height rows and smooth scrolling performance.'
        seo.ogTitle = 'Basic List'
        seo.ogTagline = 'Render thousands of items with smooth scrolling.'
        seo.ogFeatures = ['Fixed Heights', 'Smooth Scroll', '10k+ Items', 'Minimal Memory']
        seo.ogSlug = 'examples-basic-list'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-virtual-list/blob/main/docs/src/lib/examples/basic-list/demos/Default.svelte'

    type FooterMeta = {
        k: string
        v: string
        accent?: boolean
    }

    type Section = ExampleSection & {
        footerMeta?: FooterMeta[]
    }

    const sections: Section[] = [
        {
            figId: 'FIG-001',
            tag: 'FIXED ROWS',
            title: { prefix: 'basic ', accent: 'virtual list', end: '.' },
            description:
                'Pass an array to `<VirtualList>` and render each item with a Svelte 5 snippet. The component keeps the DOM small even with 10,000 records.',
            snippet: demo,
            codeSnippet: code,
            barCells: [
                { k: 'items', v: '10,000' },
                { k: 'height', v: 'auto measured' },
                { k: 'mode', v: 'windowed' }
            ],
            footerMeta: [
                { k: 'dom', v: 'live stats', accent: true },
                { k: 'viewport', v: 'full panel' }
            ],
            sourceUrl: SOURCE_URL
        }
    ]
</script>

{#snippet demo()}
    <BasicListDemo />
{/snippet}

{#snippet code()}
    <CodeReferenceV2
        samples={[
            demoCodeSample('basic-list/demos/Default.svelte', 'basic-list', 'Default.svelte')
        ]}
        columns={1}
    />
{/snippet}

{#each sections as section, i (section.figId)}
    <ExampleV2 {...section} sheetLabel={formatSheetLabel(i, sections.length)} codeLabel="show code">
        {@render section.snippet()}
    </ExampleV2>
{/each}
