<script lang="ts">
    import VirtualList from '@humanspeak/svelte-virtual-list'

    type Orientation = 'vertical' | 'horizontal'
    type Mode = Orientation | 'auto'

    const items = Array.from({ length: 10_000 }, (_, id) => ({
        id,
        label: `Item ${id + 1}`,
        width: 128 + (id % 4) * 24
    }))

    let mode = $state<Mode>('horizontal')
    let responsiveOrientation = $state<Orientation>('horizontal')
    const orientation = $derived(mode === 'auto' ? responsiveOrientation : mode)

    $effect(() => {
        if (typeof matchMedia === 'undefined') return
        const query = matchMedia('(max-width: 640px)')
        const update = () => (responsiveOrientation = query.matches ? 'horizontal' : 'vertical')
        update()
        query.addEventListener('change', update)
        return () => query.removeEventListener('change', update)
    })
</script>

<div class="toolbar">
    <div class="status">active axis · <strong>{orientation}</strong></div>
    <div class="controls" aria-label="Choose list orientation">
        {#each ['horizontal', 'vertical', 'auto'] as option (option)}
            <button
                type="button"
                class:active={mode === option}
                aria-pressed={mode === option}
                onclick={() => (mode = option as Mode)}>{option}</button
            >
        {/each}
    </div>
</div>

<div class="frame">
    <VirtualList
        {items}
        itemKey={(item) => item.id}
        {orientation}
        defaultEstimatedItemSize={orientation === 'horizontal' ? 164 : 64}
        viewportLabel="Ten thousand item orientation demo"
    >
        {#snippet renderItem(item)}
            <article
                class:horizontal={orientation === 'horizontal'}
                style:width={orientation === 'horizontal' ? `${item.width}px` : undefined}
            >
                <span class="number">{String(item.id + 1).padStart(5, '0')}</span>
                <strong>{item.label}</strong>
                <small>{orientation === 'horizontal' ? `${item.width}px wide` : '64px row'}</small>
            </article>
        {/snippet}
    </VirtualList>
</div>

<p class="hint">
    Horizontal is the deterministic first render. Choose auto to switch at the 640px breakpoint.
</p>

<style>
    .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem;
        border: 1px solid currentColor;
        font-family: monospace;
    }
    .status strong {
        color: var(--color-primary, #50d8bb);
    }
    .controls {
        display: flex;
        gap: 0.25rem;
    }
    button {
        padding: 0.4rem 0.7rem;
        border: 1px solid currentColor;
        background: transparent;
        color: inherit;
        font: inherit;
        cursor: pointer;
    }
    button.active {
        background: currentColor;
        color: var(--color-background, #07100f);
    }
    .frame {
        height: 22rem;
        border: 1px solid currentColor;
        border-top: 0;
    }
    article {
        box-sizing: border-box;
        display: grid;
        min-height: 64px;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid currentColor;
        gap: 0.2rem;
    }
    article.horizontal {
        height: 100%;
        min-height: 0;
        align-content: space-between;
        border-right: 1px solid currentColor;
        border-bottom: 0;
    }
    .number,
    small {
        opacity: 0.62;
        font-family: monospace;
    }
    .hint {
        margin: 0;
        padding: 0.75rem;
        border: 1px solid currentColor;
        border-top: 0;
        font-family: monospace;
        opacity: 0.75;
    }
</style>
