<script lang="ts">
    import { onMount } from 'svelte'
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
        text: string
    }

    // Fixed-height items: keyboard support is about focus, semantics, and
    // scroll mechanics — measurement is not the variable here.
    const ITEM_COUNT = 200
    const ITEM_HEIGHT_PX = 40

    const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))

    // Every scroll key the viewport must handle itself. Synthetic
    // KeyboardEvents are untrusted, so browsers never natively scroll from
    // them — each probe below measures the COMPONENT's own keydown handler,
    // not engine-dependent native behavior. That is exactly the point:
    // native keyboard scrolling of a bare overflow div is inconsistent
    // across engines (Safari does not even focus it), so the component must
    // own the keys.
    type KeyProbe = {
        stat: string
        key: string
        shiftKey?: boolean
        /** 'down' | 'up' expect a relative move; 'home' | 'end' expect an edge. */
        expect: 'down' | 'up' | 'home' | 'end'
    }
    const KEY_PROBES: KeyProbe[] = [
        { stat: 'arrowDown', key: 'ArrowDown', expect: 'down' },
        { stat: 'arrowUp', key: 'ArrowUp', expect: 'up' },
        { stat: 'pageDown', key: 'PageDown', expect: 'down' },
        { stat: 'pageUp', key: 'PageUp', expect: 'up' },
        { stat: 'space', key: ' ', expect: 'down' },
        { stat: 'shiftSpace', key: ' ', shiftKey: true, expect: 'up' },
        { stat: 'home', key: 'Home', expect: 'home' },
        { stat: 'end', key: 'End', expect: 'end' }
    ]

    let focusable = $state<boolean | null>(null)
    let role = $state<string | null>(null)
    let ariaLabel = $state<string | null>(null)
    let keyResults = $state<Record<string, boolean> | null>(null)
    let running = $state(false)
    let probed = $state(false)

    const labeled = $derived(role === 'region' && !!ariaLabel)
    const keysPass = $derived(keyResults !== null && Object.values(keyResults).every(Boolean))
    const keysLine = $derived(
        keyResults === null
            ? null
            : KEY_PROBES.map((probe) => `${probe.stat}=${keyResults?.[probe.stat] ? 1 : 0}`).join(
                  ' '
              )
    )

    const getViewport = (): HTMLElement | null =>
        document.querySelector('[data-testid="issue-414-list-viewport"]')

    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

    /** Wait until scrollTop has been stable for a few frames (handles both
     *  instant and smooth scrolling), bounded so a dead key resolves fast. */
    const settleScroll = async (viewport: HTMLElement, maxMs = 800) => {
        const start = performance.now()
        let last = viewport.scrollTop
        let stableFrames = 0
        while (performance.now() - start < maxMs) {
            await nextFrame()
            if (viewport.scrollTop === last) {
                stableFrames++
                if (stableFrames >= 3) return
            } else {
                stableFrames = 0
                last = viewport.scrollTop
            }
        }
    }

    const runProbes = async () => {
        const viewport = getViewport()
        if (!viewport || running) return
        running = true
        keyResults = null

        // Semantics: what assistive tech sees.
        role = viewport.getAttribute('role')
        ariaLabel = viewport.getAttribute('aria-label')

        // Focusability: keyboard users must be able to land on the region.
        viewport.focus()
        focusable = document.activeElement === viewport

        // Key matrix, each probe from a mid-list resting point so both
        // directions have room to move.
        const midScrollTop = Math.floor((viewport.scrollHeight - viewport.clientHeight) / 2)
        const maxScrollTop = viewport.scrollHeight - viewport.clientHeight
        const results: Record<string, boolean> = {}

        for (const probe of KEY_PROBES) {
            viewport.scrollTop = midScrollTop
            await nextFrame()
            await nextFrame()
            viewport.focus()

            const before = viewport.scrollTop
            viewport.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: probe.key,
                    shiftKey: probe.shiftKey ?? false,
                    bubbles: true,
                    cancelable: true
                })
            )
            await settleScroll(viewport)
            const after = viewport.scrollTop

            switch (probe.expect) {
                case 'down':
                    results[probe.stat] = after > before + 1
                    break
                case 'up':
                    results[probe.stat] = after < before - 1
                    break
                case 'home':
                    results[probe.stat] = after <= 1
                    break
                case 'end':
                    results[probe.stat] = after >= maxScrollTop - 2
                    break
            }
        }

        keyResults = results
        running = false
        probed = true
    }

    onMount(() => {
        const timer = setTimeout(runProbes, 500)
        return () => clearTimeout(timer)
    })
</script>

<div class="page">
    <h1>Issue #414 — keyboard accessibility for the scroll viewport</h1>

    <div class="description">
        <p>
            <strong>What:</strong> the viewport is a bare <code>overflow-y: scroll</code> div.
            Keyboard users can only operate it where the browser happens to make scrollable divs
            focusable (Chrome and Firefox do, Safari does not), and assistive tech announces an
            unlabeled group. The component should expose a labeled
            <code>role="region"</code>, be focusable, and handle the standard scroll keys itself.
        </p>
        <p>
            <strong>How it's measured:</strong> the probes check the rendered attributes, call
            <code>focus()</code> and verify the viewport actually receives focus, then dispatch a
            synthetic <code>keydown</code> per scroll key from a mid-list position and watch
            <code>scrollTop</code>. Synthetic keys are untrusted so the browser never natively
            scrolls from them — every green below is the component's own handler, deterministic
            across engines.
        </p>
    </div>

    <div class="stats" data-testid="issue-414-stats">
        <div class="stat" class:pass={focusable === true} class:fail={focusable === false}>
            <span class="light">{focusable === null ? '…' : focusable ? '✓' : '✗'}</span>
            <span class="label">viewport is focusable</span>
            <span class="value" data-testid="stat-focusable">
                {focusable === null ? '—' : focusable ? 'yes' : 'no'}
            </span>
            <span class="expected"
                >focus() must land on the viewport (tab target for keyboard users)</span
            >
        </div>

        <div class="stat" class:pass={labeled} class:fail={probed && !labeled}>
            <span class="light">{!probed && !labeled ? '…' : labeled ? '✓' : '✗'}</span>
            <span class="label">labeled region for assistive tech</span>
            <span class="value" data-testid="stat-labeled">
                role={role ?? 'none'} label={ariaLabel ? 'yes' : 'none'}
            </span>
            <span class="expected">role="region" with a configurable aria-label</span>
        </div>

        <div class="stat" class:pass={keysPass} class:fail={keyResults !== null && !keysPass}>
            <span class="light"
                >{keyResults === null ? (running ? '⟳' : '…') : keysPass ? '✓' : '✗'}</span
            >
            <span class="label">scroll keys handled</span>
            <span class="value" data-testid="stat-keys">
                {#if keysLine !== null}
                    {keysLine}
                {:else if running}
                    running…
                {:else}
                    —
                {/if}
            </span>
            <span class="expected">
                ArrowUp/Down, PageUp/Down, Space, Shift+Space, Home, End must all move the viewport
            </span>
        </div>

        <button class="remeasure" onclick={runProbes} disabled={running}>
            {running ? 'probing…' : 'Re-run probes'}
        </button>
    </div>

    <div class="test-container" style="height: 400px;">
        <SvelteVirtualList
            defaultEstimatedItemHeight={ITEM_HEIGHT_PX}
            {items}
            testId="issue-414-list"
        >
            {#snippet renderItem(item)}
                <div class="fixed-item" style="height: {ITEM_HEIGHT_PX}px;">
                    {item.text}
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>
</div>

<style>
    .page {
        max-width: 860px;
        margin: 0 auto;
        padding: 16px;
        font-family:
            system-ui,
            -apple-system,
            sans-serif;
    }

    h1 {
        font-size: 18px;
        margin: 0 0 12px;
    }

    .description {
        font-size: 13px;
        line-height: 1.5;
        color: #333;
        background: #fafafa;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 4px 14px;
        margin-bottom: 12px;
    }

    .description code {
        background: #eef2f7;
        padding: 1px 4px;
        border-radius: 3px;
    }

    .stats {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;
        font-size: 13px;
    }

    .stat {
        display: grid;
        grid-template-columns: 22px 210px minmax(120px, auto) 1fr;
        gap: 8px;
        align-items: baseline;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #e5e5e5;
        background: #f6f6f6;
    }

    .stat.pass {
        background: #e9f7ee;
        border-color: #b7e2c4;
    }

    .stat.fail {
        background: #fdeaea;
        border-color: #f2b8b8;
    }

    .light {
        font-weight: 700;
    }

    .stat.pass .light {
        color: #1a7f37;
    }

    .stat.fail .light {
        color: #c62828;
    }

    .label {
        font-weight: 600;
    }

    .value {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
    }

    .stat.pass .value {
        color: #1a7f37;
    }

    .stat.fail .value {
        color: #c62828;
    }

    .expected {
        color: #777;
        font-size: 12px;
    }

    .remeasure {
        align-self: flex-start;
        margin-top: 4px;
        padding: 6px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
    }

    .remeasure:disabled {
        opacity: 0.6;
        cursor: wait;
    }

    .test-container {
        width: 100%;
        border: 1px solid #eee;
    }

    .fixed-item {
        box-sizing: border-box;
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
        font-size: 14px;
    }
</style>
