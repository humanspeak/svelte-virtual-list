<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { page } from '$app/state'
    import BreadcrumbContext from '$lib/components/contexts/Breadcrumb/BreadcrumbContext.svelte'

    const { children } = $props()
    const imageLocation = `${page.url.origin}/`
</script>

<svelte:head>
    <title>Svelte Virtual List - High Performance List Virtualization for Svelte 5</title>
    <meta
        name="description"
        content="A lightweight, high-performance virtual list component for Svelte 5. Efficiently render large datasets with dynamic heights, bidirectional scrolling, and TypeScript support. Perfect for infinite scrolling, chat interfaces, and data tables."
    />

    <!-- Open Graph / Social Media -->
    <meta
        property="og:title"
        content="Svelte Virtual List - High Performance List Virtualization"
    />
    <meta
        property="og:description"
        content="Efficiently render large datasets in Svelte 5 with dynamic heights, bidirectional scrolling, and TypeScript support."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://virtuallist.svelte.page" />
    <meta property="og:image" content="{imageLocation}svelte-virtual-list-opengraph.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Svelte Virtual List Component" />
    <meta
        name="twitter:description"
        content="High-performance virtual scrolling for Svelte 5 applications"
    />
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
    {@render children?.()}
</BreadcrumbContext>
