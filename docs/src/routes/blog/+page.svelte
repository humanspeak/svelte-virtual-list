<script lang="ts">
    import { getSeoContext } from '@humanspeak/docs-kit'
    import { BlogIndexV2 } from '@humanspeak/docs-kit/blog'
    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()

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

<BlogIndexV2 posts={data.posts} />
