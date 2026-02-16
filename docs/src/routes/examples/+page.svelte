<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { motion } from '@humanspeak/svelte-motion'
    import { cn } from '$lib/shadcn/utils'
    import sitemapManifest from '$lib/sitemap-manifest.json'
    import type { PageData } from './$types'

    type ExampleData = {
        title: string
        description: string
        sourceUrl: string | null
    }

    type ExamplesData = Record<string, ExampleData>

    const { data }: { data: PageData } = $props()

    const breadcrumbs = $derived(getBreadcrumbContext())
    const seo = getSeoContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [{ title: 'Examples' }]
        }
    })
    $effect(() => {
        if (seo) {
            seo.title = 'Examples | Svelte Virtual List'
            seo.description =
                'Explore interactive examples showcasing virtual list features including basic lists, infinite scroll, variable heights, and more.'
        }
    })

    /**
     * Get all example routes from the sitemap manifest
     * @returns Array of example objects with route, title, and description
     */
    const examples = $derived(() => {
        const exampleRoutes = Object.keys(sitemapManifest)
            .filter((route) => route.startsWith('/examples/') && route !== '/examples')
            .sort()

        return exampleRoutes.map((route) => {
            const slug = route.replace('/examples/', '')
            const examples = data.examples as ExamplesData
            const exampleData = examples[slug]
            const title = exampleData?.title || formatTitle(slug)
            const description =
                exampleData?.description ||
                `Interactive ${title.toLowerCase()} virtual list example`
            return {
                route,
                slug,
                title,
                description,
                sourceUrl: exampleData?.sourceUrl
            }
        })
    })

    /**
     * Format a slug into a readable title
     * @param slug - The URL slug to format
     * @returns Formatted title string
     */
    function formatTitle(slug: string): string {
        return slug
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }
</script>

<div class="container mx-auto px-4 py-12">
    <!-- Hero Section -->
    <motion.div
        class="mb-16 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
    >
        <h1
            class="from-brand-500 to-brand-600 mb-4 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent md:text-6xl"
        >
            Virtual List Examples
        </h1>
        <p class="text-muted-foreground mx-auto max-w-2xl text-xl">
            Explore interactive examples showcasing different use cases and features of Svelte
            Virtual List. Each example demonstrates different patterns for high-performance list
            rendering.
        </p>
    </motion.div>

    <!-- Examples Grid -->
    <motion.div
        class="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial={containerVariants.hidden}
        animate={containerVariants.visible}
    >
        {#each examples() as example (example.slug)}
            <motion.a
                href={example.route}
                class={cn(
                    'group border-border bg-card relative overflow-hidden rounded-xl border p-6',
                    'hover:shadow-brand-500/10 transition-all duration-300 hover:shadow-lg',
                    'hover:border-brand-500/50 hover:-translate-y-1'
                )}
                variants={itemVariants}
                initial={itemVariants.hidden}
                animate={itemVariants.visible}
                whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
            >
                <!-- Gradient overlay on hover -->
                <div
                    class="from-brand-500/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                ></div>

                <!-- Content -->
                <div class="relative z-10">
                    <!-- Icon placeholder - you can customize this per example -->
                    <div
                        class="from-brand-500 to-brand-600 mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br transition-transform duration-300 group-hover:scale-110"
                    >
                        <i class="fa-solid fa-play text-lg text-white"></i>
                    </div>

                    <h3
                        class="group-hover:text-brand-600 mb-2 text-xl font-semibold transition-colors"
                    >
                        {example.title}
                    </h3>

                    <p class="text-muted-foreground mb-4 line-clamp-2 text-sm">
                        {example.description}
                    </p>

                    <!-- View Example link -->
                    <div
                        class="text-brand-600 group-hover:text-brand-700 flex items-center text-sm font-medium"
                    >
                        View Example
                        <i
                            class="fa-solid fa-arrow-right ml-2 transition-transform duration-200 group-hover:translate-x-1"
                        ></i>
                    </div>
                </div>

                <!-- Decorative elements -->
                <div
                    class="from-brand-500/10 absolute top-0 right-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                ></div>
            </motion.a>
        {/each}
    </motion.div>

    <!-- Call to Action -->
    <motion.div
        class="mt-16 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
    >
        <div
            class="border-brand-500/20 from-brand-500/10 to-brand-600/10 mx-auto max-w-2xl rounded-2xl border bg-gradient-to-r p-8"
        >
            <h2 class="mb-4 text-2xl font-semibold">Ready to Build?</h2>
            <p class="text-muted-foreground mb-6">
                Get started with Svelte Virtual List and create your own high-performance lists.
            </p>
            <motion.a
                href="/docs"
                class="from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 inline-flex items-center rounded-lg bg-gradient-to-r px-6 py-3 font-medium text-white transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                View Documentation
                <i class="fa-solid fa-book ml-2"></i>
            </motion.a>
        </div>
    </motion.div>
</div>

<style>
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
