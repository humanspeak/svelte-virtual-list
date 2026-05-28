<script lang="ts">
    import { CompareIndexV2 } from '@humanspeak/docs-kit'
    import { competitors, ours } from '$lib/compare-data'
</script>

<CompareIndexV2
    {competitors}
    {ours}
    introHtml="Honest, side-by-side comparisons of <b>@humanspeak/svelte-virtual-list</b> against the Svelte virtualizer packages you are most likely to evaluate: <b>TanStack Virtual</b>, <b>virtua</b>, <b>svelte-tiny-virtual-list</b>, and the legacy <b>@sveltejs/svelte-virtual-list</b>."
/>
