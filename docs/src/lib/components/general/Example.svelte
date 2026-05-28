<script lang="ts">
    import { EmbeddedExampleV2 } from '@humanspeak/docs-kit'
    import type { Snippet } from 'svelte'

    type ExampleProps = {
        children: Snippet
        isSmall?: boolean
        file?: string
        exampleUrl?: string
        title?: string
    }

    const { children, file, exampleUrl, title }: ExampleProps = $props()

    const sourceUrl = $derived(
        file
            ? `https://github.com/humanspeak/svelte-virtual-list/blob/main/docs/src/lib/examples/${file}`
            : undefined
    )
    const filename = $derived(file ? file.split('/').pop() : undefined)
</script>

<EmbeddedExampleV2 {exampleUrl} {sourceUrl} {filename} label={title}>
    <div class="inline-example-fill">
        {@render children()}
    </div>
</EmbeddedExampleV2>

<style>
    .inline-example-fill {
        display: flex;
        min-height: 300px;
        width: 100%;
        flex-direction: column;
    }

    .inline-example-fill :global(> *) {
        width: 100%;
        max-width: none !important;
    }

    .inline-example-fill :global(.max-w-md),
    .inline-example-fill :global(.max-w-2xl) {
        max-width: none !important;
    }
</style>
