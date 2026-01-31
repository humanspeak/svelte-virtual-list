<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type Item = {
        id: number
        title: string
        description: string
        expanded: boolean
    }

    const loremSentences = [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
        'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.'
    ]

    function getRandomDescription(seed: number): string {
        const count = (seed % 4) + 1
        return Array.from(
            { length: count },
            (_, i) => loremSentences[(seed + i) % loremSentences.length]
        ).join(' ')
    }

    let items = $state<Item[]>(
        Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            title: `Item ${i}`,
            description: getRandomDescription(i),
            expanded: false
        }))
    )

    function toggleExpand(id: number) {
        items = items.map((item) => (item.id === id ? { ...item, expanded: !item.expanded } : item))
    }
</script>

<div class="border-border h-[400px] w-full max-w-md rounded border">
    <VirtualList {items}>
        {#snippet renderItem(item)}
            <div class="border-border border-b px-4 py-3">
                <button
                    onclick={() => toggleExpand(item.id)}
                    class="flex w-full items-center justify-between text-left"
                >
                    <span class="font-medium">{item.title}</span>
                    <i
                        class="fa-solid fa-chevron-down text-muted-foreground text-xs transition-transform {item.expanded
                            ? 'rotate-180'
                            : ''}"
                    ></i>
                </button>
                {#if item.expanded}
                    <p class="text-muted-foreground mt-2 text-sm">
                        {item.description}
                    </p>
                {/if}
            </div>
        {/snippet}
    </VirtualList>
</div>

<p class="text-muted-foreground mt-2 text-center text-sm">
    Click items to expand/collapse. Heights update automatically.
</p>
