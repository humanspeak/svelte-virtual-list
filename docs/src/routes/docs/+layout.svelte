<script lang="ts">
    import { DocsLayoutV2 } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import { buildBreadcrumbs, docsSections, headerNav } from '$lib/docsNav'
    import favicon from '$lib/assets/logo.svg'
    import sitemapManifest from '$lib/sitemap-manifest.json'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children, data } = $props()
    const PKG_VERSION = rootPkg.version
</script>

<DocsLayoutV2
    config={docsConfig}
    {favicon}
    sections={docsSections}
    otherProjects={data.otherProjects}
    version={PKG_VERSION}
    nav={headerNav}
    siteUrl={docsConfig.url}
    breadcrumbResolver={buildBreadcrumbs}
    sitemapManifest={sitemapManifest as Record<string, string>}
>
    {@render children()}
</DocsLayoutV2>
