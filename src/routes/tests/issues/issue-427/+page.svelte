<script lang="ts">
    import { onMount, tick } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'

    type Item = { id: number; width: number; height: number }
    type Alignment = 'start' | 'end' | 'nearest' | 'center'

    const ITEM_COUNT = 10_000
    const WIDTHS = [72, 104, 136, 88, 164, 116]
    const TARGET_INDEX = 4321
    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, id) => ({
        id,
        width: WIDTHS[id % WIDTHS.length],
        height: 36 + (id % 4) * 12
    }))

    let list: {
        scroll: (_options: {
            index: number
            align: Alignment
            smoothScroll?: boolean
        }) => Promise<void>
        scrollToOffset: (_options: { offset: number; smoothScroll?: boolean }) => Promise<void>
    }
    let scrollLeft = $state(0)
    let clientWidth = $state(0)
    let scrollWidth = $state(0)
    let clientHeight = $state(0)
    let scrollHeight = $state(0)
    let renderedCount = $state(0)
    let firstIndex = $state(-1)
    let lastIndex = $state(-1)
    let transformX = $state(0)
    let anchorError = $state(0)
    let compensationError = $state(0)
    let targetLeftBefore = $state(0)
    let targetLeftAfter = $state(0)
    let resizeScrollDelta = $state(0)
    let measuredOrientation = $state('vertical/unsupported')
    let activeAlignment = $state<string>('none')
    let expandedIndex = $state<number | null>(null)
    let loadMoreCalls = $state(0)
    let hasMore = $state(true)
    let requestedOrientation = $state<'vertical' | 'horizontal'>('horizontal')
    let switchCount = $state(0)
    let preservedAnchor = $state(-1)
    let anchorBeforeSwitch = $state(-1)
    let visibleAnchor = $state(-1)
    let switchAnchorInset = $state(0)
    let settledAnchorInset = $state(0)
    let scrollTop = $state(0)
    let transformY = $state(0)

    const viewport = () =>
        document.querySelector<HTMLElement>('[data-testid="issue-427-list-viewport"]')

    const measure = () => {
        const view = viewport()
        if (!view) return
        const wrappers = Array.from(view.querySelectorAll<HTMLElement>('[data-original-index]'))
        measuredOrientation = view.getAttribute('data-orientation') ?? 'vertical/unsupported'
        const viewportRect = view.getBoundingClientRect()
        visibleAnchor = Number(
            wrappers.find((wrapper) => {
                const rect = wrapper.getBoundingClientRect()
                return measuredOrientation === 'horizontal'
                    ? rect.left >= viewportRect.left - 1
                    : rect.top >= viewportRect.top - 1
            })?.dataset.originalIndex ?? -1
        )
        scrollLeft = Math.round(view.scrollLeft)
        scrollTop = Math.round(view.scrollTop)
        clientWidth = Math.round(view.clientWidth)
        scrollWidth = Math.round(view.scrollWidth)
        clientHeight = Math.round(view.clientHeight)
        scrollHeight = Math.round(view.scrollHeight)
        renderedCount = wrappers.length
        firstIndex = Number(wrappers[0]?.dataset.originalIndex ?? -1)
        lastIndex = Number(wrappers.at(-1)?.dataset.originalIndex ?? -1)
        const transform = getComputedStyle(
            view.querySelector<HTMLElement>('[data-testid="issue-427-list-items"]')!
        ).transform
        const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform)
        transformX = Math.round(matrix.m41)
        transformY = Math.round(matrix.m42)
    }

    const toggleOrientation = async () => {
        measure()
        anchorBeforeSwitch = visibleAnchor
        const view = viewport()
        const anchorElement = view?.querySelector<HTMLElement>(
            `[data-original-index="${anchorBeforeSwitch}"]`
        )
        if (view && anchorElement) {
            const viewRect = view.getBoundingClientRect()
            const anchorRect = anchorElement.getBoundingClientRect()
            switchAnchorInset =
                requestedOrientation === 'horizontal'
                    ? anchorRect.left - viewRect.left
                    : anchorRect.top - viewRect.top
        }
        requestedOrientation = requestedOrientation === 'horizontal' ? 'vertical' : 'horizontal'
        switchCount++
        for (let attempt = 0; attempt < 40; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 50))
            measure()
            if (measuredOrientation === requestedOrientation && visibleAnchor >= 0) break
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
        measure()
        const settledView = viewport()
        const settledAnchor = settledView?.querySelector<HTMLElement>(
            `[data-original-index="${anchorBeforeSwitch}"]`
        )
        preservedAnchor = settledAnchor ? anchorBeforeSwitch : -1
        if (settledView && settledAnchor) {
            const viewRect = settledView.getBoundingClientRect()
            const anchorRect = settledAnchor.getBoundingClientRect()
            const inset =
                requestedOrientation === 'horizontal'
                    ? anchorRect.left - viewRect.left
                    : anchorRect.top - viewRect.top
            settledAnchorInset = Math.round(inset)
            anchorError = Math.round(Math.abs(inset - switchAnchorInset))
        } else anchorError = 9999
        await tick()
    }

    const rapidToggle = async () => {
        for (let i = 0; i < 5; i++) {
            requestedOrientation = requestedOrientation === 'horizontal' ? 'vertical' : 'horizontal'
            switchCount++
            await new Promise((resolve) => setTimeout(resolve, 15))
        }
        await new Promise((resolve) => setTimeout(resolve, 350))
        measure()
    }

    const updateAnchorError = (index: number, align: Alignment) => {
        const view = viewport()
        const item = view?.querySelector<HTMLElement>(`[data-original-index="${index}"]`)
        if (!view || !item) {
            anchorError = 9999
            return
        }
        const v = view.getBoundingClientRect()
        const r = item.getBoundingClientRect()
        if (align === 'start') anchorError = Math.round(Math.abs(r.left - v.left))
        else if (align === 'end') anchorError = Math.round(Math.abs(r.right - v.right))
        else if (align === 'center') {
            anchorError = Math.round(Math.abs((r.left + r.right) / 2 - (v.left + v.right) / 2))
        } else {
            anchorError = Math.round(Math.max(v.left - r.left, r.right - v.right, 0))
        }
    }

    const goDeep = async () => {
        activeAlignment = 'manual-deep'
        const view = viewport()
        if (view) view.scrollLeft = 550_000
        await new Promise((resolve) => setTimeout(resolve, 150))
        measure()
        anchorError = firstIndex > 4000 ? 0 : 9999
    }

    const goToOffset = async () => {
        activeAlignment = 'raw-offset'
        await list.scrollToOffset({ offset: 250_000, smoothScroll: false })
        await new Promise((resolve) => setTimeout(resolve, 150))
        measure()
        anchorError = Math.abs(scrollLeft - 250_000)
    }

    const smoothToIndex = async () => {
        activeAlignment = 'smooth-index'
        await list.scroll({ index: 2500, align: 'center', smoothScroll: true })
        await new Promise((resolve) => setTimeout(resolve, 150))
        measure()
        updateAnchorError(2500, 'center')
    }

    const loadAtEnd = async () => {
        activeAlignment = 'load-end'
        await list.scroll({ index: ITEM_COUNT - 1, align: 'end', smoothScroll: false })
        await new Promise((resolve) => setTimeout(resolve, 250))
        measure()
        updateAnchorError(ITEM_COUNT - 1, 'end')
    }

    const align = async (alignment: Alignment) => {
        activeAlignment = alignment
        await list.scroll({ index: TARGET_INDEX, align: alignment, smoothScroll: false })
        await new Promise((resolve) => setTimeout(resolve, 150))
        measure()
        updateAnchorError(TARGET_INDEX, alignment)
    }

    const widenVisible = async () => {
        activeAlignment = 'resize-anchor'
        await list.scroll({ index: TARGET_INDEX, align: 'start', smoothScroll: false })
        await new Promise((resolve) => setTimeout(resolve, 150))
        measure()
        const view = viewport()
        const target = view?.querySelector<HTMLElement>(`[data-original-index="${TARGET_INDEX}"]`)
        if (!view || !target) {
            anchorError = 9999
            compensationError = 9999
            return
        }
        const viewportLeft = view.getBoundingClientRect().left
        targetLeftBefore = Math.round(target.getBoundingClientRect().left - viewportLeft)
        const scrollBefore = view.scrollLeft
        // Item 4320 is 72px wide and expands to 96px: a deterministic +24px.
        // The delta stays within average-size hysteresis, isolating predecessor
        // compensation instead of changing every unmeasured prefix estimate.
        expandedIndex = TARGET_INDEX - 1
        await new Promise((resolve) => setTimeout(resolve, 300))
        measure()
        const resizedTarget = view.querySelector<HTMLElement>(
            `[data-original-index="${TARGET_INDEX}"]`
        )
        if (!resizedTarget) {
            anchorError = 9999
            compensationError = 9999
            return
        }
        targetLeftAfter = Math.round(resizedTarget.getBoundingClientRect().left - viewportLeft)
        resizeScrollDelta = Math.round(view.scrollLeft - scrollBefore)
        anchorError = Math.abs(targetLeftAfter - targetLeftBefore)
        compensationError = Math.abs(resizeScrollDelta - 24)
    }

    const overflowPass = $derived(scrollWidth > clientWidth * 100)
    const verticalPass = $derived(scrollHeight <= clientHeight + 2)
    const boundedPass = $derived(renderedCount > 0 && renderedCount < 100)
    const orientationPass = $derived(measuredOrientation === requestedOrientation)
    const responsiveAttempted = $derived(anchorBeforeSwitch >= 0)
    const responsivePass = $derived(
        orientationPass && anchorBeforeSwitch >= 0 && preservedAnchor >= 0 && anchorError <= 2
    )
    const geometryPass = $derived(
        boundedPass &&
            orientationPass &&
            (requestedOrientation === 'horizontal'
                ? overflowPass && verticalPass
                : scrollHeight > clientHeight)
    )
    const overallPass = $derived(geometryPass && (!responsiveAttempted || responsivePass))
    const overallState = $derived(
        !responsiveAttempted
            ? overallPass
                ? 'GREEN — HORIZONTAL READY'
                : 'RED — HORIZONTAL FAIL'
            : overallPass
              ? 'GREEN — RESPONSIVE PASS'
              : 'RED — RESPONSIVE FAIL'
    )

    onMount(() => {
        let frame = 0
        const loop = () => {
            measure()
            frame = requestAnimationFrame(loop)
        }
        frame = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(frame)
    })
</script>

<svelte:head><title>Issue #427 — horizontal virtual list</title></svelte:head>

<main>
    <h1>Issue #427 — deterministic horizontal virtual list</h1>
    <p>
        Ten thousand deterministic, variably wide cards. Red means the horizontal contract is
        measurably broken; green means geometry, virtualization, and the selected anchor agree.
    </p>

    <section class:pass={overallPass} class:fail={!overallPass} class="diagnostics">
        <strong data-testid="overall-state">{overallState}</strong>
        <dl>
            <div>
                <dt>anchor inset before/after</dt>
                <dd data-testid="diag-anchor-insets">
                    {Math.round(switchAnchorInset)}/{settledAnchorInset}
                </dd>
            </div>
            <div>
                <dt>visible anchor</dt>
                <dd data-testid="diag-visible-anchor">{visibleAnchor}</dd>
            </div>
            <div>
                <dt>requested orientation</dt>
                <dd data-testid="diag-requested-orientation">{requestedOrientation}</dd>
            </div>
            <div>
                <dt>orientation</dt>
                <dd data-testid="diag-orientation">
                    {measuredOrientation}
                </dd>
            </div>
            <div>
                <dt>switch count</dt>
                <dd data-testid="diag-switch-count">{switchCount}</dd>
            </div>
            <div>
                <dt>anchor before switch</dt>
                <dd data-testid="diag-anchor-before-switch">{anchorBeforeSwitch}</dd>
            </div>
            <div>
                <dt>preserved anchor</dt>
                <dd data-testid="diag-preserved-anchor">{preservedAnchor}</dd>
            </div>
            <div>
                <dt>responsive result</dt>
                <dd data-testid="diag-responsive-result">
                    {responsiveAttempted ? (responsivePass ? 'GREEN' : 'RED') : 'NOT RUN'}
                </dd>
            </div>
            <div>
                <dt>scrollLeft</dt>
                <dd data-testid="diag-scroll-left">{scrollLeft}</dd>
            </div>
            <div>
                <dt>scrollTop</dt>
                <dd data-testid="diag-scroll-top">{scrollTop}</dd>
            </div>
            <div>
                <dt>clientWidth</dt>
                <dd data-testid="diag-client-width">{clientWidth}</dd>
            </div>
            <div>
                <dt>scrollWidth</dt>
                <dd data-testid="diag-scroll-width">{scrollWidth}</dd>
            </div>
            <div>
                <dt>clientHeight</dt>
                <dd data-testid="diag-client-height">{clientHeight}</dd>
            </div>
            <div>
                <dt>scrollHeight</dt>
                <dd data-testid="diag-scroll-height">{scrollHeight}</dd>
            </div>
            <div>
                <dt>rendered count</dt>
                <dd data-testid="diag-rendered-count">{renderedCount}</dd>
            </div>
            <div>
                <dt>first index</dt>
                <dd data-testid="diag-first-index">{firstIndex}</dd>
            </div>
            <div>
                <dt>last index</dt>
                <dd data-testid="diag-last-index">{lastIndex}</dd>
            </div>
            <div>
                <dt>transform X</dt>
                <dd data-testid="diag-transform-x">{transformX}</dd>
            </div>
            <div>
                <dt>transform Y</dt>
                <dd data-testid="diag-transform-y">{transformY}</dd>
            </div>
            <div>
                <dt>anchor/index error</dt>
                <dd data-testid="diag-anchor-error">{anchorError}</dd>
            </div>
            <div>
                <dt>resize compensation error</dt>
                <dd data-testid="diag-compensation-error">{compensationError}</dd>
            </div>
            <div>
                <dt>target left before</dt>
                <dd data-testid="diag-target-left-before">{targetLeftBefore}</dd>
            </div>
            <div>
                <dt>target left after</dt>
                <dd data-testid="diag-target-left-after">{targetLeftAfter}</dd>
            </div>
            <div>
                <dt>resize scroll delta</dt>
                <dd data-testid="diag-resize-scroll-delta">{resizeScrollDelta}</dd>
            </div>
            <div>
                <dt>active check</dt>
                <dd data-testid="diag-active">{activeAlignment}</dd>
            </div>
            <div>
                <dt>load-more calls</dt>
                <dd data-testid="diag-load-more">{loadMoreCalls}</dd>
            </div>
        </dl>
    </section>

    <nav aria-label="Horizontal test controls">
        <button data-testid="deep-scroll" onclick={goDeep}>Deep manual scroll</button>
        <button data-testid="raw-offset" onclick={goToOffset}>Raw offset API</button>
        <button data-testid="smooth-index" onclick={smoothToIndex}>Smooth to index</button>
        <button data-testid="align-start" onclick={() => align('start')}>Align start</button>
        <button data-testid="align-end" onclick={() => align('end')}>Align end</button>
        <button data-testid="align-nearest" onclick={() => align('nearest')}>Align nearest</button>
        <button data-testid="align-center" onclick={() => align('center')}>Align center</button>
        <button data-testid="widen-visible" onclick={widenVisible}>Widen visible item</button>
        <button data-testid="load-end" onclick={loadAtEnd}>Load at horizontal end</button>
        <button data-testid="toggle-orientation" onclick={toggleOrientation}
            >Toggle orientation</button
        >
        <button data-testid="rapid-toggle" onclick={rapidToggle}>Rapid toggle ×5</button>
    </nav>

    <div class="list-shell">
        <SvelteVirtualList
            bind:this={list}
            {items}
            itemKey={(item) => item.id}
            orientation={requestedOrientation}
            defaultEstimatedItemSize={116}
            bufferSize={8}
            testId="issue-427-list"
            onLoadMore={() => {
                loadMoreCalls++
                hasMore = false
            }}
            loadMoreThreshold={4}
            {hasMore}
        >
            {#snippet renderItem(item: Item, index: number)}
                <article
                    class="card"
                    class:vertical={requestedOrientation === 'vertical'}
                    class:expanded={expandedIndex === index}
                    style:width={`${item.width}px`}
                    style:--item-height={`${item.height}px`}
                    data-testid={`card-${index}`}
                >
                    <div class="box">{index}</div>
                    <span>Item {index} · {item.width}px</span>
                    {#if index === 0}
                        <button data-testid="interactive-child">Native child</button>
                    {/if}
                </article>
            {/snippet}
        </SvelteVirtualList>
    </div>
</main>

<style>
    main {
        max-width: 920px;
        margin: 0 auto;
        padding: 16px;
        font-family: system-ui, sans-serif;
    }
    h1 {
        margin: 0 0 6px;
    }
    .diagnostics {
        position: sticky;
        top: 0;
        z-index: 5;
        pointer-events: none;
        border: 5px solid;
        padding: 10px;
        background: #fff;
    }
    .diagnostics.pass {
        color: #075e28;
        border-color: #12a150;
        background: #dcffe9;
    }
    .diagnostics.fail {
        color: #7e0712;
        border-color: #e0001b;
        background: #ffe3e6;
    }
    .diagnostics > strong {
        display: block;
        font-size: 26px;
        letter-spacing: 0.04em;
    }
    dl {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 5px;
        margin: 8px 0 0;
    }
    dl div {
        border: 1px solid currentColor;
        padding: 4px;
    }
    dt {
        font-size: 11px;
        text-transform: uppercase;
    }
    dd {
        margin: 0;
        font-size: 18px;
        font-variant-numeric: tabular-nums;
        font-weight: 700;
    }
    nav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 12px 0;
    }
    button {
        padding: 8px 12px;
        font-weight: 700;
        scroll-margin-top: 440px;
    }
    .list-shell {
        width: 100%;
        height: 230px;
        border: 4px solid #14213d;
        overflow: hidden;
    }
    .card {
        position: relative;
        box-sizing: border-box;
        flex: 0 0 auto;
        height: 210px;
        margin-right: 12px;
        padding: 8px;
        background: #f5ca54;
        border: 3px solid #14213d;
    }
    .card.expanded {
        width: 96px !important;
        background: #86e7b8;
    }
    .card.vertical {
        width: 100% !important;
        height: var(--item-height, 48px);
        overflow: hidden;
    }
    .card.vertical .box {
        height: calc(var(--item-height, 48px) - 16px);
    }
    .box {
        height: 155px;
        display: grid;
        place-items: center;
        background: #ef476f;
        color: white;
        font-size: 34px;
        font-weight: 900;
    }
    .card span {
        display: block;
        margin-top: 7px;
        white-space: nowrap;
        font-weight: 700;
    }
    .card [data-testid='interactive-child'] {
        position: absolute;
        right: 6px;
        bottom: 6px;
        padding: 2px 4px;
        font-size: 10px;
    }
</style>
