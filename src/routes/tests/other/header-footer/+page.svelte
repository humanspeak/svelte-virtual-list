<script lang="ts">
    import { page } from '$app/state'
    import SvelteVirtualList from '$lib/SvelteVirtualList.svelte'
    import type {
        SvelteVirtualListDebugInfo,
        SvelteVirtualListRangeInfo,
        SvelteVirtualListScrollAlign,
        VirtualListOrientation
    } from '$lib/types.js'
    import { untrack } from 'svelte'

    const initial = untrack(() => page.url.searchParams)
    const makeRows = (count: number, start = 0) =>
        Array.from({ length: count }, (_, index) => ({ id: start + index, size: 40 }))
    let items = $state(makeRows(Number(initial.get('count') ?? 100)))
    let orientation = $state<VirtualListOrientation>(
        initial.get('axis') === 'horizontal' ? 'horizontal' : 'vertical'
    )
    let headerSize = $state(Number(initial.get('h') ?? 60))
    let footerSize = $state(Number(initial.get('f') ?? 80))
    let showHeader = $state(initial.get('header') !== 'none')
    let showFooter = $state(initial.get('footer') !== 'none')
    let replacement = $state(false)
    let mounted = $state(true)
    let list = $state<SvelteVirtualList<{ id: number; size: number }>>()
    let range = $state<SvelteVirtualListRangeInfo>()
    let info = $state<SvelteVirtualListDebugInfo>()
    let index = $state(40)
    let align = $state<SvelteVirtualListScrollAlign>('start')
    let smooth = $state(false)
    let offset = $state(0)
    let completed = $state(0)
    let calls = $state(0)
    let pending = $state(0)
    let maxPending = $state(0)
    let hasMore = $state(true)
    const loader = initial.get('load')
    const load = async () => {
        calls++
        pending++
        maxPending = Math.max(maxPending, pending)
        await new Promise((resolve) => setTimeout(resolve, 50))
        if (loader === 'append') {
            const last = items.at(-1)?.id ?? -1
            items = [...items, ...makeRows(10, last + 1)]
            if (calls >= 3) hasMore = false
        } else if (loader === 'fail') {
            try {
                throw new Error('fixture load failure')
            } catch {
                /* consumer handles request failure */
            }
        }
        pending--
    }
</script>

<div class="controls">
    <label>Index <input aria-label="Index" type="number" bind:value={index} /></label>
    <label
        >Alignment <select aria-label="Alignment" bind:value={align}
            ><option>start</option><option>end</option><option>center</option><option
                >nearest</option
            ><option>auto</option></select
        ></label
    >
    <label>Smooth <input aria-label="Smooth" type="checkbox" bind:checked={smooth} /></label>
    <button
        onclick={async () => {
            await list?.scroll({ index, align, smoothScroll: smooth })
            completed++
        }}>Align row</button
    >
    <label>Offset <input aria-label="Offset" type="number" bind:value={offset} /></label>
    <button
        onclick={async () => {
            await list?.scrollToOffset({ offset, smoothScroll: false })
            completed++
        }}>Raw offset</button
    >
    <button onclick={() => (headerSize += 50)}>Grow header</button>
    <button onclick={() => (headerSize += 0.4)}>Tiny header growth</button>
    <button onclick={() => (headerSize = Math.max(0, headerSize - 50))}>Shrink header</button>
    <button onclick={() => (footerSize += 50)}>Grow footer</button>
    <button onclick={() => (footerSize = Math.max(0, footerSize - 50))}>Shrink footer</button>
    <button
        onclick={() =>
            (items = items.map((item) =>
                item.id === 40 ? { ...item, size: item.size + 50 } : item
            ))}>Grow row</button
    >
    <button onclick={() => (showHeader = !showHeader)}>Toggle header</button>
    <button onclick={() => (showFooter = !showFooter)}>Toggle footer</button>
    <button
        onclick={() => {
            replacement = !replacement
            headerSize += 30
        }}>Replace header</button
    >
    <button onclick={() => (orientation = orientation === 'vertical' ? 'horizontal' : 'vertical')}
        >Switch axis</button
    >
    <button onclick={() => (items = [...makeRows(5, -5), ...items])}>Prepend</button>
    <button
        onclick={() =>
            (items = [...items.slice(10, 30), ...items.slice(0, 10), ...items.slice(30)])}
        >Reorder</button
    >
    <button onclick={() => (items = items.slice(10))}>Trim</button>
    <button
        onclick={() => {
            showHeader = false
            items = [...items.slice(40), ...items.slice(0, 40)]
        }}>Remove header and rotate</button
    >
    <button
        onclick={() => {
            showHeader = false
            items = [...makeRows(5, -5), ...items]
        }}>Remove header and prepend</button
    >
    <button
        onclick={() => {
            showHeader = false
            items = items.map((item, index) =>
                index === items.length - 1 ? { ...item, size: item.size + 200 } : item
            )
        }}>Remove header and grow tail</button
    >
    <button onclick={() => (items = [])}>Empty</button>
    <button onclick={() => (items = makeRows(100))}>Populate</button>
    <button onclick={() => (mounted = !mounted)}>Toggle mount</button>
    <button onclick={() => (hasMore = !hasMore)}>Toggle has more</button>
</div>
<output data-testid="state"
    >{JSON.stringify({
        range,
        info,
        showHeader,
        showFooter,
        rowExtent: items.reduce((total, item) => total + item.size, 0),
        count: items.length,
        completed,
        calls,
        pending,
        maxPending,
        hasMore,
        headerSize,
        footerSize,
        orientation
    })}</output
>
{#snippet leading()}
    <div
        data-testid="header-body"
        style:height={`${headerSize}px`}
        style:width={orientation === 'horizontal' ? `${headerSize + 20}px` : '100%'}
    >
        {replacement ? 'Replacement header' : 'Header'}
    </div>
{/snippet}
{#snippet alternateLeading()}
    <section
        data-testid="header-body"
        style:height={`${headerSize}px`}
        style:width={orientation === 'horizontal' ? `${headerSize + 20}px` : '100%'}
    >
        Replacement header
    </section>
{/snippet}
{#snippet trailing()}
    <div
        data-testid="footer-body"
        style:height={`${footerSize}px`}
        style:width={orientation === 'horizontal' ? `${footerSize + 10}px` : '100%'}
    >
        Footer: {calls} loads
    </div>
{/snippet}
<div class="frame">
    {#if mounted}
        <SvelteVirtualList
            bind:this={list}
            {items}
            {orientation}
            itemKey={(item) => item.id}
            defaultEstimatedItemSize={40}
            bufferSize={2}
            testId="hf"
            debug
            debugFunction={(value) => (info = value)}
            onRangeChange={(value) => (range = value)}
            header={showHeader ? (replacement ? alternateLeading : leading) : undefined}
            footer={showFooter ? trailing : undefined}
            onLoadMore={loader ? load : undefined}
            {hasMore}
            loadMoreThreshold={2}
        >
            {#snippet renderItem(item, rowIndex)}
                <div
                    data-row-id={item.id}
                    data-row-index={rowIndex}
                    style:height={orientation === 'vertical' ? `${item.size}px` : '100%'}
                    style:width={orientation === 'horizontal' ? `${item.size}px` : '100%'}
                >
                    Row {item.id}
                </div>
            {/snippet}
        </SvelteVirtualList>
    {/if}
</div>

<style>
    .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    input[type='number'] {
        width: 75px;
    }
    output {
        display: block;
        font-size: 10px;
    }
    .frame {
        width: 160px;
        height: 160px;
    }
    [data-testid='header-body'],
    [data-testid='footer-body'],
    [data-row-id] {
        overflow: hidden;
        box-sizing: border-box;
    }
</style>
