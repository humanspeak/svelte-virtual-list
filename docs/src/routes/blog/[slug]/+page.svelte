<script lang="ts">
    import { BlogPost } from '@humanspeak/docs-kit/blog'
    import { getBreadcrumbContext } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'

    const { data } = $props()

    const breadcrumbContext = getBreadcrumbContext()
    if (breadcrumbContext) {
        breadcrumbContext.breadcrumbs = [
            { title: 'Blog', href: '/blog' },
            { title: data.post.title }
        ]
    }
</script>

<BlogPost post={data.post} config={docsConfig} basePath="/blog" />
