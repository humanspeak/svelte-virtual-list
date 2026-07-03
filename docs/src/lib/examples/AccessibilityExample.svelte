<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    let lastKey = $state<string | null>(null)
    let focused = $state(false)

    function describeKey(event: KeyboardEvent) {
        // Capture-phase listener on the wrapper so the badge updates without
        // interfering with the component's own handling.
        const name = event.key === ' ' ? (event.shiftKey ? 'Shift+Space' : 'Space') : event.key
        if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key))
            lastKey = name
    }
</script>

<div class="flex w-full grow flex-col gap-4 md:flex-row">
    <div
        class="border-border h-[300px] flex-1 rounded border md:h-auto"
        onkeydowncapture={describeKey}
        onfocusincapture={() => (focused = true)}
        onfocusoutcapture={() => (focused = false)}
    >
        <VirtualList {items} viewportLabel="Keyboard demo list">
            {#snippet renderItem(item)}
                <div class="border-border border-b px-4 py-3">
                    {item.text}
                </div>
            {/snippet}
        </VirtualList>
    </div>
    <div class="border-border bg-muted/50 flex-1 rounded border p-4">
        <h3 class="mb-3 text-sm font-medium">Try it with your keyboard</h3>
        <p class="text-muted-foreground mb-3 text-xs">
            Press <kbd class="rounded border px-1">Tab</kbd> until the list has a focus ring, then use
            the scroll keys.
        </p>
        <div class="space-y-2 text-xs">
            <div class="flex justify-between">
                <span class="text-muted-foreground">List focused:</span>
                <span class="font-mono">{focused ? 'yes' : 'no'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-muted-foreground">Last scroll key:</span>
                <span class="font-mono">{lastKey ?? '—'}</span>
            </div>
        </div>
        <table class="mt-4 w-full text-xs">
            <tbody>
                <tr>
                    <td class="text-muted-foreground py-1">↑ / ↓</td>
                    <td class="text-right">one line</td>
                </tr>
                <tr>
                    <td class="text-muted-foreground py-1">PageUp / PageDown</td>
                    <td class="text-right">one page</td>
                </tr>
                <tr>
                    <td class="text-muted-foreground py-1">Space / Shift+Space</td>
                    <td class="text-right">one page</td>
                </tr>
                <tr>
                    <td class="text-muted-foreground py-1">Home / End</td>
                    <td class="text-right">top / bottom</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
