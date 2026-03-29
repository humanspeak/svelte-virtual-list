<script lang="ts">
    import { BlogLayout } from '@humanspeak/docs-kit/blog'
    import { getBreadcrumbContext } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'

    const { children } = $props()

    const breadcrumbContext = getBreadcrumbContext()
    if (breadcrumbContext) {
        breadcrumbContext.breadcrumbs = [{ title: 'Blog', href: '/blog' }]
    }
</script>

<BlogLayout config={docsConfig} {favicon}>
    {@render children()}
</BlogLayout>
