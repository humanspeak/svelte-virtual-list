<script lang="ts">
    import { CompareIndexV2 } from '@humanspeak/docs-kit'
    import { competitors, ours } from '$lib/compare-data'
</script>

<CompareIndexV2
    {competitors}
    {ours}
    introHtml="Honest, source-linked comparisons of <b>@humanspeak/svelte-virtual-list</b> against Svelte virtualizers including <b>TanStack Virtual</b>, <b>virtua</b>, <b>svelte-virtuallists</b>, <b>svelte-tiny-virtual-list</b>, and the legacy <b>@sveltejs/svelte-virtual-list</b>."
/>
