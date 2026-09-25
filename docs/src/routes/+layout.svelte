<script lang="ts">
    import '../app.css'
    import { RootLayout } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    const { children } = $props()
</script>

<RootLayout config={docsConfig} favicon="/favicon.png" stars={docsConfig.fallbackStars}>
    {@render children?.()}
</RootLayout>
