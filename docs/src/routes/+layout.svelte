<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { MotionConfig } from '@humanspeak/svelte-motion'
    import { page } from '$app/state'
    import BreadcrumbContext from '$lib/components/contexts/Breadcrumb/BreadcrumbContext.svelte'
    import BreadcrumbJsonLd from '$lib/components/contexts/Breadcrumb/BreadcrumbJsonLd.svelte'
    import SeoContext from '$lib/components/contexts/Seo/SeoContext.svelte'
    import type { SeoContext as SeoContextType } from '$lib/components/contexts/Seo/type'
    import githubStats from '$lib/github-stats.json'

    const { children } = $props()

    const canonicalUrl = $derived(page.url.origin + page.url.pathname)

    const seo = $state<SeoContextType>({
        title: 'Svelte Virtual List - High Performance List Virtualization for Svelte 5',
        description:
            'A lightweight, high-performance virtual list component for Svelte 5. Efficiently render large datasets with dynamic heights, bidirectional scrolling, and TypeScript support. Perfect for infinite scrolling, chat interfaces, and data tables.'
    })

    const ogImageUrl = $derived(
        seo.ogSlug
            ? `${page.url.origin}/social-cards/${seo.ogSlug}-og.png`
            : `${page.url.origin}/svelte-virtual-list-opengraph.png`
    )

    const twitterImageUrl = $derived(
        seo.ogSlug
            ? `${page.url.origin}/social-cards/${seo.ogSlug}-twitter.png`
            : `${page.url.origin}/svelte-virtual-list-twitter.png`
    )

    const softwareAppJsonLd = $derived(
        `<script type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Svelte Virtual List',
            description:
                'A high-performance virtual list component for Svelte 5 applications that efficiently renders large datasets with minimal memory usage.',
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Any',
            programmingLanguage: ['Svelte', 'TypeScript'],
            url: 'https://virtuallist.svelte.page',
            downloadUrl: 'https://www.npmjs.com/package/@humanspeak/svelte-virtual-list',
            softwareRequirements: 'Svelte 5',
            license: 'https://opensource.org/licenses/MIT',
            keywords: [
                'svelte',
                'virtual list',
                'virtual scroll',
                'infinite scroll',
                'performance',
                'typescript'
            ],
            releaseNotes: 'https://github.com/humanspeak/svelte-virtual-list/releases',
            author: {
                '@type': 'Organization',
                name: 'Humanspeak, Inc.',
                url: 'https://humanspeak.com',
                sameAs: ['https://github.com/humanspeak']
            },
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
            },
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '5',
                bestRating: '5',
                ratingCount: String(githubStats.stars)
            }
        })}${'</'}script>`
    )
</script>

<ModeWatcher />

<SeoContext {seo}>
    <BreadcrumbContext>
        <BreadcrumbJsonLd />
        <MotionConfig transition={{ duration: 0.5 }}>
            {@render children?.()}
        </MotionConfig>
    </BreadcrumbContext>
</SeoContext>

<svelte:head>
    <title>{seo.title}</title>
    <meta name="description" content={seo.description} />

    <!-- Open Graph / Social Media -->
    <meta property="og:title" content={seo.title} />
    <meta property="og:description" content={seo.description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seo.title} />
    <meta name="twitter:description" content={seo.description} />
    <meta name="twitter:image" content={twitterImageUrl} />

    <!-- Keywords -->
    <meta
        name="keywords"
        content="svelte, virtual list, virtual scroll, infinite scroll, performance, typescript, svelte5, dom recycling, large lists, chat interface, data table, ui component"
    />

    <!-- Additional Meta -->
    <meta name="author" content="Humanspeak, Inc." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href={canonicalUrl} />
    <link rel="alternate" type="text/plain" title="LLM instructions" href="/llms.txt" />

    <!-- JSON-LD structured data -->
    <!-- eslint-disable svelte/no-at-html-tags -- Safe: content is JSON.stringify'd, not user input -->
    {@html softwareAppJsonLd}

    {@html `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Svelte Virtual List',
        url: 'https://virtuallist.svelte.page',
        description:
            'Documentation for @humanspeak/svelte-virtual-list — a high-performance virtual list component for Svelte 5.',
        publisher: {
            '@type': 'Organization',
            name: 'Humanspeak, Inc.',
            url: 'https://humanspeak.com'
        }
    })}${'</'}script>`}
</svelte:head>
