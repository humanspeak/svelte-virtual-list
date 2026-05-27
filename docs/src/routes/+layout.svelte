<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { MotionConfig } from '@humanspeak/svelte-motion'
    import {
        BreadcrumbContextProvider,
        BreadcrumbJsonLd,
        SeoContextProvider,
        SeoHead,
        type SeoContext
    } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    const { children } = $props()

    const seo = $state<SeoContext>({})
</script>

<ModeWatcher />
<SeoContextProvider {seo}>
    <SeoHead {seo} config={docsConfig} {favicon} />
    <BreadcrumbContextProvider>
        <BreadcrumbJsonLd config={docsConfig} />
        <MotionConfig transition={{ duration: 0.5 }}>
            {@render children?.()}
        </MotionConfig>
    </BreadcrumbContextProvider>
</SeoContextProvider>
