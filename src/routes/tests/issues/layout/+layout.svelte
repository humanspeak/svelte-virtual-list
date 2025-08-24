<script lang="ts">
    import type { Snippet } from 'svelte'
    import SvelteVirtualList from '$lib/SvelteVirtualList.svelte'
    import { faker } from '@faker-js/faker'

    const { children }: { children: Snippet } = $props()

    const items: {
        id: string
        label: string
        href: string
    }[] = $state(
        [...Array(1000)].map(() => ({
            id: faker.string.uuid(),
            label: faker.lorem.words(10),
            href: faker.internet.url()
        }))
    )
</script>

<div class="layout">
    <div class="sidebar">
        <SvelteVirtualList {items} debug={false}>
            {#snippet renderItem(item)}
                <a href={`/tests/issues/layout/${item.id}`}>{item.label}</a>
            {/snippet}
        </SvelteVirtualList>
    </div>
    <div class="content">
        {@render children?.()}
    </div>
</div>

<style>
    .layout {
        display: grid;
        grid-template-columns: 300px 1fr;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
    }

    .sidebar {
        border-right: 1px solid #ccc;
        overflow: hidden;
    }

    .content {
        overflow: auto;
        padding: 1rem;
    }

    :global(.sidebar a) {
        display: block;
        padding: 0.5rem 1rem;
        text-decoration: none;
        color: inherit;
    }

    :global(.sidebar a:hover) {
        background-color: #f5f5f5;
    }
</style>
