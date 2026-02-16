<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { page } from '$app/state'
    import BreadcrumbContext from '$lib/components/contexts/Breadcrumb/BreadcrumbContext.svelte'
    import SeoContext from '$lib/components/contexts/Seo/SeoContext.svelte'
    import type { SeoContext as SeoContextType } from '$lib/components/contexts/Seo/type'

    const { children } = $props()
    const imageLocation = `${page.url.origin}/`

    const seo = $state<SeoContextType>({
        title: 'Svelte Virtual List - High Performance List Virtualization for Svelte 5',
        description:
            'A lightweight, high-performance virtual list component for Svelte 5. Efficiently render large datasets with dynamic heights, bidirectional scrolling, and TypeScript support. Perfect for infinite scrolling, chat interfaces, and data tables.'
    })
</script>

<svelte:head>
    <title>{seo.title}</title>
    <meta name="description" content={seo.description} />

    <!-- Open Graph / Social Media -->
    <meta property="og:title" content={seo.title} />
    <meta property="og:description" content={seo.description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://virtuallist.svelte.page" />
    <meta property="og:image" content="{imageLocation}svelte-virtual-list-opengraph.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seo.title} />
    <meta name="twitter:description" content={seo.description} />
    <meta name="twitter:image" content="{imageLocation}svelte-virtual-list-twitter.png" />

    <!-- Keywords -->
    <meta
        name="keywords"
        content="svelte, virtual list, virtual scroll, infinite scroll, performance, typescript, svelte5, dom recycling, large lists, chat interface, data table, ui component"
    />

    <!-- Additional Meta -->
    <meta name="author" content="Humanspeak, Inc." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://virtuallist.svelte.page" />

    <!-- JSON-LD structured data -->
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "applicationCategory": "DeveloperApplication",
            "author": {
                "@type": "Organization",
                "name": "Humanspeak, Inc.",
                "url": "https://humanspeak.com"
            },
            "description": "A high-performance virtual list component for Svelte 5 applications that efficiently renders large datasets with minimal memory usage.",
            "name": "Svelte Virtual List",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "operatingSystem": "Any",
            "programmingLanguage": ["Svelte", "TypeScript"]
        }
    </script>
</svelte:head>
<ModeWatcher />

<BreadcrumbContext>
    <SeoContext {seo}>
        {@render children?.()}
    </SeoContext>
</BreadcrumbContext>
