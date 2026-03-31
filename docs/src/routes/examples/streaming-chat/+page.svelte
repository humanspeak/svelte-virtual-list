<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import StreamingChatExample from '$lib/examples/StreamingChatExample.svelte'

    const breadcrumbs = getBreadcrumbContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [
            { title: 'Examples', href: '/examples' },
            { title: 'Streaming Chat' }
        ]
    }

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Streaming Chat | Examples | Svelte Virtual List'
        seo.description =
            'LLM-style streaming chat with optimistic messages, token-by-token markdown rendering, and bottom-anchored virtual scrolling.'
        seo.ogTitle = 'Streaming Chat'
        seo.ogTagline = 'Real-time AI chat with virtualized markdown streaming.'
        seo.ogFeatures = [
            'Streaming Markdown',
            'Optimistic UI',
            'Bottom Anchored',
            'Token Streaming'
        ]
        seo.ogSlug = 'examples-streaming-chat'
    }
</script>

<Example>
    <StreamingChatExample />
</Example>
