<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type ListRef = {
        scroll: (_options: {
            index: number
            smoothScroll?: boolean
            align?: 'auto' | 'top' | 'bottom' | 'nearest'
        }) => void
    }

    let listRef: ListRef | undefined = $state(undefined)

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        highlighted: i === 5000 || i === 0 || i === 9999
    }))

    let targetIndex = $state(5000)
    let align = $state<'auto' | 'top' | 'bottom' | 'nearest'>('auto')

    function scrollToTarget() {
        listRef?.scroll({ index: targetIndex, smoothScroll: true, align })
    }
</script>

<div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
        <input
            type="number"
            bind:value={targetIndex}
            min="0"
            max="9999"
            aria-label="Target item index"
            class="border-border bg-background w-24 rounded border px-2 py-1 text-sm"
        />
        <select
            bind:value={align}
            aria-label="Scroll alignment"
            class="border-border bg-background rounded border px-2 py-1 text-sm"
        >
            <option value="auto">auto</option>
            <option value="top">top</option>
            <option value="bottom">bottom</option>
            <option value="nearest">nearest</option>
        </select>
        <button
            onclick={scrollToTarget}
            class="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1 text-sm"
        >
            Go to Item
        </button>
    </div>
    <div class="flex gap-2 text-sm">
        <button
            onclick={() => listRef?.scroll({ index: 0, align: 'top' })}
            class="border-border hover:bg-muted rounded border px-2 py-1"
        >
            First
        </button>
        <button
            onclick={() => listRef?.scroll({ index: 5000, align: 'auto' })}
            class="border-border hover:bg-muted rounded border px-2 py-1"
        >
            Middle
        </button>
        <button
            onclick={() => listRef?.scroll({ index: 9999, align: 'bottom' })}
            class="border-border hover:bg-muted rounded border px-2 py-1"
        >
            Last
        </button>
    </div>
    <div class="border-border h-[300px] rounded border">
        <VirtualList {items} bind:this={listRef}>
            {#snippet renderItem(item)}
                <div
                    class="border-border border-b px-4 py-3 {item.highlighted
                        ? 'bg-primary/10 font-medium'
                        : 'hover:bg-muted'}"
                >
                    {item.text}
                </div>
            {/snippet}
        </VirtualList>
    </div>
</div>
