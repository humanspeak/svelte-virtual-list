<script lang="ts">
    import '../app.css'
    import { RootLayout } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    const { children } = $props()
</script>

<RootLayout config={docsConfig} {favicon} stars={docsConfig.fallbackStars}>
    {@render children?.()}
</RootLayout>
