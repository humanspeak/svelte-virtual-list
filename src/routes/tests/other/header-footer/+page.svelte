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
    const headerExtent = $derived(orientation === 'horizontal' ? headerSize + 20 : headerSize)
    const footerExtent = $derived(orientation === 'horizontal' ? footerSize + 10 : footerSize)
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
    const prependRows = () => {
        const firstId = items.reduce((minimum, item) => Math.min(minimum, item.id), 0)
        items = [...makeRows(5, firstId - 5), ...items]
    }
    let compact = $state(initial.get('compact') === '1')
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

<svelte:head>
    <title>Header & footer playground · Svelte Virtual List</title>
</svelte:head>

<main class="playground">
    <header class="page-heading">
        <div>
            <p class="eyebrow">Svelte Virtual List · Playground</p>
            <h1>Headers & footers</h1>
            <p class="intro">Resize the header and footer while keeping your place in the list.</p>
        </div>
        <button class="reset" onclick={() => window.location.reload()}>Reset demo</button>
    </header>

    <nav class="presets" aria-label="Demo scenarios">
        <span>Start with</span>
        <a data-sveltekit-reload href={`?axis=${orientation}`}>100 rows</a>
        <a data-sveltekit-reload href={`?axis=${orientation}&count=2`}>Short list</a>
        <a data-sveltekit-reload href={`?axis=${orientation}&count=0&h=240&f=200`}>No rows</a>
        <a data-sveltekit-reload href={`?axis=${orientation}&count=2&load=append`}>Loading demo</a>
    </nav>

    <div class="workbench">
        <section class="preview-card" aria-labelledby="preview-title">
            <div class="card-heading">
                <h2 id="preview-title">Live preview</h2>
                <span class="badge">{orientation}</span>
            </div>
            <p class="hint">
                Scroll inside this area. Blue is the header; green is the footer. Each row starts at
                40px.
            </p>
            <div class="preview-surface">
                <div class="frame" class:compact>
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
                            header={showHeader
                                ? replacement
                                    ? alternateLeading
                                    : leading
                                : undefined}
                            footer={showFooter ? trailing : undefined}
                            onLoadMore={loader ? load : undefined}
                            {hasMore}
                            loadMoreThreshold={2}
                        >
                            {#snippet renderItem(item, rowIndex)}
                                <div
                                    data-row-id={item.id}
                                    data-orientation={orientation}
                                    data-row-index={rowIndex}
                                    style:height={orientation === 'vertical'
                                        ? `${item.size}px`
                                        : '100%'}
                                    style:width={orientation === 'horizontal'
                                        ? `${item.size}px`
                                        : '100%'}
                                >
                                    Row {item.id}
                                </div>
                            {/snippet}
                        </SvelteVirtualList>
                    {:else}
                        <p class="unmounted">
                            List unmounted. Use “Toggle mount” to bring it back.
                        </p>
                    {/if}
                </div>
            </div>
            <div class="preview-options">
                <label class="checkbox"
                    ><input type="checkbox" bind:checked={compact} /> Compact viewport (160 × 160)</label
                >
                <button
                    onclick={() =>
                        (orientation = orientation === 'vertical' ? 'horizontal' : 'vertical')}
                    >Switch axis</button
                >
            </div>
            <dl class="stats" aria-label="Live list measurements">
                <div>
                    <dt>Rows</dt>
                    <dd>{items.length}</dd>
                </div>
                <div>
                    <dt>Rendered range</dt>
                    <dd>
                        {mounted && range && range.end > range.start
                            ? `${range.start}–${range.end - 1}`
                            : 'No rows'}
                    </dd>
                </div>
                <div>
                    <dt>Content size</dt>
                    <dd>{info ? `${Math.round(info.totalHeight * 10) / 10}px` : 'Measuring…'}</dd>
                </div>
                <div>
                    <dt>Position</dt>
                    <dd>
                        {!mounted
                            ? 'Unmounted'
                            : range?.atTop
                              ? 'At start'
                              : range?.atBottom
                                ? 'At end'
                                : 'Reading'}
                    </dd>
                </div>
                <div>
                    <dt>Header</dt>
                    <dd>
                        {showHeader ? `${Math.round(headerExtent * 10) / 10}px` : 'Hidden'}
                    </dd>
                </div>
                <div>
                    <dt>Footer</dt>
                    <dd>
                        {showFooter ? `${footerExtent}px` : 'Hidden'}
                    </dd>
                </div>
            </dl>
            <aside class="try-this">
                <h3>Try this</h3>
                <ol>
                    <li>Align row <strong>40</strong> to <strong>start</strong>.</li>
                    <li>
                        Choose <strong>Grow header</strong>. Row 40 should stay in the same place.
                    </li>
                    <li>
                        <strong>Jump to end</strong>, then grow the footer. The list should stay at
                        the end.
                    </li>
                </ol>
            </aside>
        </section>

        <div class="control-panels">
            <section class="control-card" aria-labelledby="navigate-title">
                <h2 id="navigate-title">Move through the list</h2>
                <p class="hint">
                    Row numbers start at zero. Alignment places the chosen row inside the viewport.
                </p>
                <div class="fields">
                    <label
                        >Row index <input
                            aria-label="Index"
                            type="number"
                            min="0"
                            max={Math.max(0, items.length - 1)}
                            bind:value={index}
                        /></label
                    >
                    <label
                        >Alignment <select aria-label="Alignment" bind:value={align}
                            ><option>start</option><option>end</option><option>center</option
                            ><option>nearest</option><option>auto</option></select
                        ></label
                    >
                </div>
                <label class="checkbox"
                    ><input aria-label="Smooth" type="checkbox" bind:checked={smooth} /> Smooth scrolling</label
                >
                <div class="buttons">
                    <button
                        class="primary"
                        onclick={async () => {
                            await list?.scroll({ index, align, smoothScroll: smooth })
                            completed++
                        }}>Align row</button
                    >
                    <button
                        onclick={async () => {
                            await list?.scrollToOffset({ offset: 0, smoothScroll: smooth })
                            completed++
                        }}>Jump to start</button
                    >
                    <button
                        onclick={async () => {
                            await list?.scrollToOffset({ offset: 1_000_000, smoothScroll: smooth })
                            completed++
                        }}>Jump to end</button
                    >
                </div>
                <div class="offset-control">
                    <label
                        >Pixel offset <input
                            aria-label="Offset"
                            type="number"
                            min="0"
                            bind:value={offset}
                        /></label
                    >
                    <button
                        onclick={async () => {
                            await list?.scrollToOffset({ offset, smoothScroll: false })
                            completed++
                        }}>Raw offset</button
                    >
                </div>
                <p class="hint">
                    Pixel offsets include the header and footer. Aligning the last row to “end”
                    stops before the footer.
                </p>
            </section>

            <section class="control-card" aria-labelledby="content-title">
                <h2 id="content-title">Resize header & footer</h2>
                <p class="hint">
                    Grow or shrink by 50px. Resizing should preserve the visible row, start, or end.
                </p>
                <h3>Header</h3>
                <div class="buttons">
                    <button onclick={() => (headerSize += 50)}>Grow header</button>
                    <button onclick={() => (headerSize = Math.max(0, headerSize - 50))}
                        >Shrink header</button
                    >
                    <button aria-pressed={!showHeader} onclick={() => (showHeader = !showHeader)}
                        >Toggle header</button
                    >
                    <button
                        onclick={() => {
                            replacement = !replacement
                            headerSize += 30
                        }}>Replace header</button
                    >
                </div>
                <h3>Footer</h3>
                <div class="buttons">
                    <button onclick={() => (footerSize += 50)}>Grow footer</button>
                    <button onclick={() => (footerSize = Math.max(0, footerSize - 50))}
                        >Shrink footer</button
                    >
                    <button aria-pressed={!showFooter} onclick={() => (showFooter = !showFooter)}
                        >Toggle footer</button
                    >
                </div>
            </section>

            <section class="control-card" aria-labelledby="rows-title">
                <h2 id="rows-title">Change the rows</h2>
                <p class="hint">
                    Prepend adds five rows; reorder moves a block; trim removes the first ten. Watch
                    whether your reading row stays put.
                </p>
                <div class="buttons">
                    <button onclick={prependRows}>Prepend</button>
                    <button
                        onclick={() =>
                            (items = [
                                ...items.slice(10, 30),
                                ...items.slice(0, 10),
                                ...items.slice(30)
                            ])}>Reorder</button
                    >
                    <button onclick={() => (items = items.slice(10))}>Trim</button>
                    <button
                        onclick={() =>
                            (items = items.map((item) =>
                                item.id === 40 ? { ...item, size: item.size + 50 } : item
                            ))}>Grow row</button
                    >
                    <button onclick={() => (items = [])}>Empty</button>
                    <button onclick={() => (items = makeRows(100))}>Populate</button>
                </div>
                <p class="hint">
                    Grow row increases row 40 by 50px. Empty removes all rows; Populate restores 100
                    rows.
                </p>
            </section>

            <details class="control-card" open={compact}>
                <summary>Combined changes & lifecycle</summary>
                <p class="hint">
                    Stress cases: apply two changes at once, check tiny resizes, or unmount the
                    list.
                </p>
                <div class="buttons">
                    <button onclick={() => (headerSize += 0.4)}>Tiny header growth</button>
                    <button
                        onclick={() => {
                            showHeader = false
                            items = [...items.slice(40), ...items.slice(0, 40)]
                        }}>Remove header and rotate</button
                    >
                    <button
                        onclick={() => {
                            showHeader = false
                            prependRows()
                        }}>Remove header and prepend</button
                    >
                    <button
                        onclick={() => {
                            showHeader = false
                            items = items.map((item, row) =>
                                row === items.length - 1 ? { ...item, size: item.size + 200 } : item
                            )
                        }}>Remove header and grow tail</button
                    >
                    <button aria-pressed={!mounted} onclick={() => (mounted = !mounted)}
                        >Toggle mount</button
                    >
                    <button aria-pressed={hasMore} onclick={() => (hasMore = !hasMore)}
                        >Toggle has more</button
                    >
                </div>
                <p class="hint">
                    Tiny growth adds 0.4px. Tail growth adds 200px. Loading: {loader ?? 'off'} · {calls}
                    requests · {pending} pending.
                </p>
            </details>
        </div>
    </div>

    <details class="technical">
        <summary>Technical details · raw state</summary>
        <p class="hint">
            Rendered range uses an exclusive end index. Row measurements exclude header and footer.
        </p>
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
    </details>
</main>

{#snippet leading()}
    <div
        data-testid="header-body"
        style:height={`${headerSize}px`}
        style:width={orientation === 'horizontal' ? `${headerExtent}px` : '100%'}
    >
        {replacement ? 'Replacement header' : 'Header'}
    </div>
{/snippet}
{#snippet alternateLeading()}
    <section
        data-testid="header-body"
        style:height={`${headerSize}px`}
        style:width={orientation === 'horizontal' ? `${headerExtent}px` : '100%'}
    >
        Replacement header
    </section>
{/snippet}
{#snippet trailing()}
    <div
        data-testid="footer-body"
        style:height={`${footerSize}px`}
        style:width={orientation === 'horizontal' ? `${footerExtent}px` : '100%'}
    >
        Footer: {calls} loads
    </div>
{/snippet}

<style>
    :global(body) {
        margin: 0;
        background: #f3f6fb;
    }
    .playground {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px 24px 48px;
        color: #17243b;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.5;
    }
    .page-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 24px;
        margin-bottom: 24px;
    }
    .eyebrow {
        color: #476284;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin: 0 0 8px;
    }
    h1 {
        margin: 0 0 8px;
        font-size: clamp(28px, 4vw, 38px);
        line-height: 1.25;
        letter-spacing: -0.03em;
    }
    .intro {
        max-width: 680px;
        margin: 0;
        color: #52647d;
        font-size: 16px;
    }
    h2 {
        margin: 0;
        font-size: 18px;
    }
    h3 {
        margin: 16px 0 8px;
        font-size: 13px;
    }
    .presets {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 24px;
    }
    .presets > span {
        color: #52647d;
        margin-right: 4px;
    }
    .presets a {
        color: #255cbe;
        background: #e7eefb;
        border: 1px solid #d5e1f5;
        border-radius: 20px;
        padding: 6px 14px;
        text-decoration: none;
        font-weight: 600;
    }
    .presets a:hover {
        background: #d5e1f5;
    }
    .workbench {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 370px;
        gap: 24px;
        align-items: start;
    }
    .preview-card,
    .control-card {
        background: white;
        border: 1px solid #dce4ef;
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 3px 12px #17243b05;
    }
    .preview-card {
        min-width: 0;
    }
    .card-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }
    .badge {
        border-radius: 20px;
        background: #edf2f8;
        color: #52647d;
        padding: 3px 10px;
        font-size: 12px;
    }
    .hint {
        color: #617189;
        margin: 8px 0 14px;
        font-size: 13px;
    }
    .preview-surface {
        background: #f8fafc;
        border: 1px solid #dce4ef;
        border-radius: 10px;
        padding: 12px;
    }
    .frame {
        width: 100%;
        height: 320px;
        background: white;
    }
    .frame.compact {
        width: 160px;
        height: 160px;
    }
    .preview-options {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin: 14px 0;
    }
    .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        border-top: 1px solid #e5ebf3;
        padding-top: 16px;
        margin: 0;
    }
    dt {
        color: #617189;
        font-size: 11px;
    }
    dd {
        margin: 3px 0 0;
        font-size: 15px;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
    }
    .try-this {
        background: #f1f5fd;
        border-radius: 10px;
        margin-top: 18px;
        padding: 12px 16px;
    }
    .try-this h3 {
        margin: 0 0 6px;
        color: #255cbe;
    }
    ol {
        margin: 0;
        padding-left: 18px;
        color: #52647d;
        font-size: 12px;
    }
    li + li {
        margin-top: 4px;
    }
    .control-panels {
        display: grid;
        gap: 16px;
        min-width: 0;
    }
    .fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }
    label {
        display: grid;
        gap: 5px;
        color: #52647d;
        font-size: 13px;
    }
    .checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 12px 0;
    }
    input,
    select,
    button {
        font: inherit;
    }
    input[type='number'],
    select {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        padding: 8px 10px;
        background: #fff;
        border: 1px solid #cbd6e6;
        border-radius: 7px;
        color: #17243b;
    }
    input[type='checkbox'] {
        accent-color: #255cbe;
    }
    button {
        border: 1px solid #cbd6e6;
        border-radius: 7px;
        background: white;
        color: #334963;
        padding: 8px 11px;
        font-weight: 600;
        cursor: pointer;
    }
    button:hover {
        background: #edf2f8;
        border-color: #9aacc5;
    }
    button[aria-pressed='true'] {
        background: #e7eefb;
        border-color: #7197d5;
    }
    button.primary {
        background: #255cbe;
        color: white;
        border-color: #255cbe;
    }
    button.primary:hover {
        background: #184b9f;
    }
    button:focus-visible,
    a:focus-visible,
    input:focus-visible,
    select:focus-visible,
    summary:focus-visible {
        outline: 3px solid #80aaff;
        outline-offset: 3px;
    }
    .reset {
        white-space: nowrap;
    }
    .buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 12px 0;
    }
    .offset-control {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: end;
        gap: 12px;
        border-top: 1px solid #e5ebf3;
        padding-top: 14px;
    }
    summary {
        cursor: pointer;
        font-weight: 650;
    }
    .technical {
        margin-top: 24px;
        color: #52647d;
        background: white;
        border: 1px solid #dce4ef;
        border-radius: 10px;
        padding: 16px 20px;
    }
    output {
        display: block;
        margin-top: 12px;
        padding: 12px;
        font-family: ui-monospace, monospace;
        font-size: 11px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        background: #f3f6fb;
        border-radius: 6px;
    }
    .unmounted {
        margin: 0;
        padding: 24px;
        color: #617189;
    }
    [data-testid='header-body'],
    [data-testid='footer-body'],
    [data-row-id] {
        overflow: hidden;
        box-sizing: border-box;
        display: flex;
        align-items: center;
    }
    /* Indent text without padding so snippet extents stay exactly as declared. */
    [data-testid='header-body'],
    [data-testid='footer-body'] {
        text-indent: 10px;
        white-space: nowrap;
    }
    [data-testid='header-body'] {
        background: #e6efff;
        color: #255cbe;
        font-weight: 700;
    }
    [data-testid='footer-body'] {
        background: #e4f4ed;
        color: #277351;
        font-weight: 700;
    }
    [data-row-id] {
        padding: 0 10px;
        color: #52647d;
        box-shadow: inset 0 -1px #e5ebf3;
        font-size: 14px;
    }
    [data-row-id][data-orientation='horizontal'] {
        padding: 8px 0;
        justify-content: center;
        text-align: center;
    }
    [data-row-id='40'] {
        background: #fff5d9;
        color: #8b640c;
        font-weight: 700;
    }
    @media (min-width: 901px) and (min-height: 800px) {
        .preview-card {
            position: sticky;
            top: 20px;
        }
    }
    @media (max-width: 900px) {
        .workbench {
            grid-template-columns: 1fr;
        }
    }
    @media (max-width: 480px) {
        .playground {
            padding: 20px 12px 32px;
        }
        .page-heading {
            flex-direction: column;
            gap: 12px;
        }
        .preview-card,
        .control-card {
            padding: 16px;
        }
        .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
</style>
