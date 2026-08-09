<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    const items = Array.from({ length: 1000 }, (_, id) => ({ id, label: `Item ${id}` }))
    let orientation = $state<'vertical' | 'horizontal'>('vertical')

    $effect(() => {
        if (typeof matchMedia === 'undefined') return
        const query = matchMedia('(max-width: 640px)')
        const update = () => (orientation = query.matches ? 'horizontal' : 'vertical')
        update()
        query.addEventListener('change', update)
        return () => query.removeEventListener('change', update)
    })
</script>

<div class="status">active axis · <strong>{orientation}</strong></div>
<div class="frame">
    <VirtualList
        {items}
        itemKey={(item) => item.id}
        {orientation}
        defaultEstimatedItemSize={orientation === 'horizontal' ? 160 : 56}
    >
        {#snippet renderItem(item)}
            <article class:horizontal={orientation === 'horizontal'}>{item.label}</article>
        {/snippet}
    </VirtualList>
</div>

<style>
    .status {
        padding: 0.75rem;
        border: 1px solid currentColor;
        font-family: monospace;
    }
    .frame {
        height: 22rem;
        border: 1px solid currentColor;
    }
    article {
        box-sizing: border-box;
        min-height: 56px;
        padding: 1rem;
        border-bottom: 1px solid currentColor;
    }
    article.horizontal {
        width: 160px;
        height: 100%;
        border-right: 1px solid currentColor;
        border-bottom: 0;
    }
</style>
