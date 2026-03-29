<script lang="ts">
    import { BlogIndex } from '@humanspeak/docs-kit/blog'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'

    const { data } = $props()

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Blog | Svelte Virtual List'
        seo.description =
            'Guides, tutorials, and deep dives on virtual scrolling, infinite pagination, and building real-time UIs with Svelte.'
        seo.ogTitle = 'Blog'
        seo.ogTagline = 'Guides and tutorials for Svelte Virtual List'
        seo.ogSlug = 'blog'
    }
</script>

<h1 class="text-text-primary mb-2 text-4xl font-bold">Blog</h1>
<p class="text-text-secondary mb-8 text-lg">
    Guides, tutorials, and deep dives on virtual scrolling, infinite pagination, and building
    real-time UIs with Svelte.
</p>

<div class="not-prose">
    <BlogIndex posts={data.posts} basePath="/blog" />
</div>
