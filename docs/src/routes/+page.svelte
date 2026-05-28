<script lang="ts">
    import { FooterV2, HeaderV2, getBreadcrumbContext, getSeoContext } from '@humanspeak/docs-kit'
    import { AnimatePresence, MotionButton, MotionSpan } from '@humanspeak/svelte-motion'
    import VirtualList from '@humanspeak/svelte-virtual-list'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import { competitors } from '$lib/compare-data'
    import { headerNav } from '$lib/docsNav'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'
    import type { PageData } from './$types'

    type Align = 'auto' | 'top' | 'bottom' | 'nearest'
    type ListRef = {
        scroll: (_options: { index: number; smoothScroll?: boolean; align?: Align }) => void
    }

    const { data }: { data: PageData } = $props()
    const packageStats = $derived(data.packageStats)

    const breadcrumbContext = getBreadcrumbContext()
    if (breadcrumbContext) breadcrumbContext.breadcrumbs = []

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Svelte Virtual List - Dynamic virtual scrolling for Svelte 5'
        seo.description =
            'A dependency-free virtual list component for Svelte 5 with dynamic height measurement, infinite loading, scroll methods, TypeScript, and SSR support.'
        seo.ogTitle = 'Svelte Virtual List'
        seo.ogTagline = 'Dynamic virtual scrolling for Svelte 5.'
        seo.ogFeatures = ['Dynamic Heights', 'Infinite Loading', 'Scroll Methods', 'SSR Ready']
        seo.ogSlug = 'home'
    }

    const PKG_NAME = $derived(packageStats.name)
    const PKG_VERSION = $derived(packageStats.version)
    const TARBALL_KB = $derived(
        packageStats.tarballBytes !== null
            ? Math.round(packageStats.tarballBytes / 102.4) / 10
            : null
    )

    interface StatItem {
        k: string
        v: string
        sup?: string
        n: string
        ac?: boolean
    }

    const stats: StatItem[] = $derived([
        { k: 'items', v: '10k+', n: 'smooth list demo', ac: true },
        {
            k: 'tarball',
            v: TARBALL_KB !== null ? String(TARBALL_KB) : '-',
            sup: TARBALL_KB !== null ? 'kB' : undefined,
            n: 'packed on npm'
        },
        { k: 'runtime deps', v: '0', n: 'zero dependencies' },
        { k: 'heights', v: 'auto', n: 'ResizeObserver measured', ac: true },
        { k: 'loading', v: 'built-in', n: 'threshold callback' },
        { k: 'licence', v: 'MIT', n: 'open source' }
    ])

    const features = [
        {
            title: 'Dynamic Height Measurement',
            body: 'Rows are measured after render with ResizeObserver so expanded content, async media, and mixed layouts keep their scroll offsets.'
        },
        {
            title: 'Svelte 5 Snippets',
            body: 'Render each item with typed snippets instead of slot-era wrappers or headless measurement glue.'
        },
        {
            title: 'Imperative Scroll Methods',
            body: 'Jump to any index with auto, top, bottom, or nearest alignment for search, keyboard navigation, and focus workflows.'
        },
        {
            title: 'Infinite Loading',
            body: 'Trigger load-more behavior near the rendered range without keeping unreached pages in the DOM.'
        },
        {
            title: 'SSR Friendly',
            body: 'Import safely in SvelteKit routes and hydrate into a measured virtual viewport on the client.'
        },
        {
            title: 'Zero Runtime Dependencies',
            body: 'A focused Svelte component package without a virtualizer core dependency or framework adapter layer.'
        }
    ]

    const demoSource = [
        '<script lang="ts">',
        "    import VirtualList from '@humanspeak/svelte-virtual-list'",
        '',
        '    const items = Array.from({ length: 10000 }, (_, i) => ({',
        '        id: i,',
        '        title: `Virtual row ${i.toLocaleString()}`',
        '    }))',
        '</' + 'script>',
        '',
        '<VirtualList {items}>',
        '    {#snippet renderItem(item)}',
        '        <div>{item.title}</div>',
        '    {/snippet}',
        '</VirtualList>'
    ].join('\n')

    const coordinateRows = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        title: `Virtual row ${i.toLocaleString()}`,
        meta:
            i % 5 === 0
                ? 'dynamic content ready'
                : i % 5 === 1
                  ? 'measured row'
                  : i % 5 === 2
                    ? 'recycled DOM'
                    : i % 5 === 3
                      ? 'stable offset'
                      : 'typed snippet'
    }))

    let demoFrame: HTMLDivElement | undefined = $state(undefined)
    let demoDomRows = $state(0)
    let demoDomNodes = $state(0)
    let demoFirstIndex = $state(0)
    let demoLastIndex = $state(0)

    const updateDemoStats = () => {
        if (!demoFrame) return
        const rows = Array.from(demoFrame.querySelectorAll<HTMLElement>('.demo-row'))
        demoDomRows = rows.length
        demoDomNodes = demoFrame.querySelectorAll('*').length

        const indices = rows
            .map((row) => row.querySelector('strong')?.textContent?.match(/\d[\d,]*/)?.[0])
            .filter((value): value is string => Boolean(value))
            .map((value) => Number(value.replaceAll(',', '')))

        if (indices.length > 0) {
            demoFirstIndex = indices[0]
            demoLastIndex = indices[indices.length - 1]
        }
    }

    $effect(() => {
        if (typeof window === 'undefined' || !demoFrame) return
        updateDemoStats()
        const intervalId = window.setInterval(updateDemoStats, 250)
        return () => window.clearInterval(intervalId)
    })

    const labItems = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        title: `Item ${i.toLocaleString()}`,
        detail:
            i % 7 === 0
                ? 'Expanded copy makes this row taller so the list has to measure real content instead of trusting a fixed size.'
                : i % 5 === 0
                  ? 'Medium row with enough content to vary height.'
                  : 'Compact row.',
        highlighted: i === 0 || i === 5000 || i === 9999
    }))

    let listRef: ListRef | undefined = $state(undefined)
    let targetIndex = $state(5000)
    let align = $state<Align>('auto')

    const labSource = $derived(
        [
            '<script lang="ts">',
            "    import VirtualList from '@humanspeak/svelte-virtual-list'",
            '',
            '    let listRef',
            `    let targetIndex = ${targetIndex}`,
            `    let align = '${align}'`,
            '',
            '    function scrollToTarget() {',
            '        listRef.scroll({',
            '            index: targetIndex,',
            '            smoothScroll: true,',
            '            align',
            '        })',
            '    }',
            '</' + 'script>',
            '',
            '<VirtualList items={items} bind:this={listRef}>',
            '    {#snippet renderItem(item)}',
            '        <div>{item.title}</div>',
            '    {/snippet}',
            '</VirtualList>'
        ].join('\n')
    )

    const clampIndex = (index: number) => Math.max(0, Math.min(9999, Math.round(index)))

    function scrollToIndex(index = targetIndex, nextAlign = align) {
        targetIndex = clampIndex(index)
        listRef?.scroll({ index: targetIndex, smoothScroll: true, align: nextAlign })
    }

    const compareRows = competitors.map((competitor) => {
        const featureMap = new Map(competitor.features.map((feature) => [feature.name, feature]))
        const find = (name: string) => featureMap.get(name)?.them
        return {
            slug: competitor.slug,
            name: competitor.name,
            type: competitor.type,
            dynamic: find('Dynamic item heights') ?? find('Dynamic measured heights') ?? false,
            loading: find('Infinite scroll helpers') ?? false,
            scroll: find('Programmatic scroll to index') ?? false,
            deps: find('Runtime dependencies') ?? '-'
        }
    })

    const formatCell = (value: string | boolean): { text: string; cls: string } => {
        if (value === true) return { text: 'yes', cls: 'y' }
        if (value === false) return { text: 'no', cls: 'n' }
        return { text: String(value), cls: '' }
    }

    const aiDocs = [
        {
            href: '/llms.txt',
            key: '01 · index',
            title: '/llms.txt',
            body: 'Compact map of the package, API surface, examples, and comparison routes for agent lookup.',
            foot: 'open index ↗'
        },
        {
            href: '/llms-full.txt',
            key: '02 · full',
            title: '/llms-full.txt',
            body: 'Full generated reference with docs content, component usage, props, methods, and example source.',
            foot: 'open full ↗'
        },
        {
            href: '/docs/index.md',
            key: '03 · mirrors',
            title: '/docs/<slug>.md',
            body: 'Every docs page mirrored as markdown so LLMs can cite the same material humans read.',
            foot: 'open mirror ↗'
        }
    ]

    const featuredExamples = [
        {
            href: '/examples/basic-list',
            title: 'Basic List',
            body: 'Render ten thousand typed rows while keeping the DOM focused on the visible range.'
        },
        {
            href: '/examples/infinite-scroll',
            title: 'Infinite Scroll',
            body: 'Append more items when the viewport nears the end of the rendered range.'
        },
        {
            href: '/examples/scroll-to-item',
            title: 'Scroll To Item',
            body: 'Use the component ref to jump to a target index with alignment controls.'
        },
        {
            href: '/examples/variable-height',
            title: 'Variable Height',
            body: 'Expand rows with different content heights and let the list keep offsets accurate.'
        },
        {
            href: '/docs/scroll-methods',
            title: 'Scroll Methods',
            body: 'Reference the scroll API for top, bottom, nearest, and automatic alignment.'
        },
        {
            href: '/docs/variable-heights',
            title: 'Dynamic Heights',
            body: 'Understand measurement, resizing, and layout changes inside virtualized rows.'
        }
    ]

    const installCmd = $derived(`npm i ${PKG_NAME}`)
    let copied = $state(false)
    let copyResetTimer: ReturnType<typeof setTimeout> | undefined

    const showCopied = () => {
        copied = true
        if (copyResetTimer) clearTimeout(copyResetTimer)
        copyResetTimer = setTimeout(() => (copied = false), 1500)
    }

    const fallbackCopy = () => {
        const textarea = document.createElement('textarea')
        textarea.value = installCmd
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
    }

    const copyInstall = async () => {
        if (typeof navigator === 'undefined' || typeof document === 'undefined') return
        showCopied()
        try {
            await navigator.clipboard.writeText(installCmd)
        } catch {
            fallbackCopy()
        }
    }
</script>

<div class="brut-wrap flex min-h-svh flex-col">
    <HeaderV2 config={docsConfig} {favicon} version={PKG_VERSION} nav={headerNav} />

    <main class="brut">
        <div class="brut-coord" aria-hidden="true">
            {#each coordinateRows as coord (coord)}
                <div>{coord}</div>
            {/each}
        </div>

        <section class="brut-hero">
            <div class="corner tr">FIG-001 · MASTHEAD</div>
            <aside class="meta">
                <div><span class="k">pkg</span> · <span class="v">{PKG_NAME}</span></div>
                <div><span class="k">version</span> · <span class="v">{PKG_VERSION}</span></div>
                <div>
                    <span class="k">tarball</span> ·
                    <span class="v">{TARBALL_KB !== null ? `${TARBALL_KB} kB gz` : '-'}</span>
                </div>
                <div><span class="k">deps</span> · <span class="v">0</span></div>
                <div><span class="k">licence</span> · <span class="v">MIT</span></div>
                <hr />
                <div><span class="k">items</span> · <span class="v">10,000+</span></div>
                <div><span class="k">heights</span> · <span class="v accent">dynamic</span></div>
                <div><span class="k">scroll</span> · <span class="v">index + align</span></div>
                <hr />
                <div class="k">// scroll for live list</div>
            </aside>
            <div class="hero-body">
                <h1>
                    <span>svelte</span><span class="slash">/</span><span>virtual list</span><span
                        class="end">.</span
                    >
                </h1>
                <p class="sub">
                    A dependency-free <b>virtual list component</b> for Svelte 5. Render large datasets
                    with measured dynamic heights, infinite loading, typed snippets, imperative scrolling,
                    and SSR-friendly behavior.
                </p>
                <div class="cta-row">
                    <a class="pri" href="/docs">get started ↗</a>
                    <a href="/docs/api/props">api reference</a>
                    <a href="/examples">examples</a>
                    <a href="/compare">compare</a>
                    <a href="/blog">blog</a>
                    <MotionButton
                        class="inst"
                        type="button"
                        onTap={copyInstall}
                        aria-label="Copy install command"
                        whileTap={{ scale: 0.97 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                    >
                        <span class="inst-prompt">$</span>
                        <span class="inst-cmd">npm i <span class="pkg">{PKG_NAME}</span></span>
                        <span class="inst-copy {copied ? 'is-copied' : ''}">
                            <AnimatePresence initial={false}>
                                <MotionSpan
                                    key={copied ? 'copied' : 'idle'}
                                    class="inst-copy-label"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                >
                                    {copied ? '✓ copied' : 'copy'}
                                </MotionSpan>
                            </AnimatePresence>
                        </span>
                    </MotionButton>
                </div>
            </div>
            <div class="corner bl">FIG-001</div>
            <div class="corner br">SHEET 01 / 07</div>
        </section>

        <section class="brut-stats">
            {#each stats as s, i (s.k)}
                <div class="s {s.ac ? 'ac' : ''}" data-idx="/0{i + 1}">
                    <div class="k">{s.k}</div>
                    <div class="v">
                        <span class="v-num">{s.v}</span>{#if s.sup}<span class="v-unit"
                                >{s.sup}</span
                            >{/if}
                    </div>
                    <div class="note">{s.n}</div>
                </div>
            {/each}
        </section>

        <section class="brut-stream">
            <div class="lede">
                <div class="k">FIG-002 / LIVE LIST</div>
                <h2>render <span>10,000 rows</span> in real-time.</h2>
                <p>
                    Keep the DOM small while the scroll range still represents the full dataset. The
                    right pane is the live component; the left pane is the source shape.
                </p>
            </div>
            <div class="panel">
                <div class="bar">
                    <span
                        ><span class="lbl">file</span> ·
                        <span class="v">basic-list.svelte</span></span
                    >
                    <span><span class="lbl">rows</span> <span class="v">10,000</span></span>
                    <span><span class="lbl">deps</span> <span class="v">0</span></span>
                    <span class="live">● LIVE</span>
                </div>
                <div class="grid">
                    <div class="pane">
                        <div class="label">SRC / VIRTUAL LIST</div>
                        <pre>{demoSource}</pre>
                    </div>
                    <div class="pane out">
                        <div class="label">OUT / RENDERED</div>
                        <div class="list-frame" bind:this={demoFrame}>
                            <VirtualList {items}>
                                {#snippet renderItem(item)}
                                    <div class="demo-row">
                                        <strong>{item.title}</strong>
                                        <span>{item.meta}</span>
                                    </div>
                                {/snippet}
                            </VirtualList>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <div>
                        range · <span class="v">{demoFirstIndex}-{demoLastIndex}</span>
                    </div>
                    <div>dom rows · <span class="v">{demoDomRows}</span></div>
                    <div>dom nodes · <span class="v">{demoDomNodes}</span></div>
                    <div>total rows · <span class="v">10,000</span></div>
                    <div>status · <span class="v accent">ready</span></div>
                </div>
            </div>
        </section>

        <section class="brut-feat">
            <div class="lede">
                <div class="k">FIG-003 / CAPABILITIES</div>
                <h2>why <span>svelte-virtual-list</span>.</h2>
                <p>The Svelte-first list component for large, changing, production datasets.</p>
            </div>
            <div class="grid">
                {#each features as f, i (f.title)}
                    <div class="cell">
                        <div class="id">
                            № {String(i + 1).padStart(2, '0')} / {String(features.length).padStart(
                                2,
                                '0'
                            )}
                        </div>
                        <div class="corner">▢</div>
                        <h3>{f.title}</h3>
                        <p>{f.body}</p>
                        <div class="marker"></div>
                    </div>
                {/each}
            </div>
        </section>

        <section class="brut-play" id="scroll-lab">
            <div class="lede">
                <div class="k">FIG-004 / SCROLL LAB</div>
                <h2>jump to <span>any index</span>.</h2>
                <p>
                    Drive the list by ref, choose alignment, and let dynamic row heights stay
                    measured while the viewport moves.
                </p>
            </div>
            <div class="panel">
                <div class="bar">
                    <span
                        ><span class="lbl">file</span> ·
                        <span class="v">scroll-methods.svelte</span></span
                    >
                    <label>
                        <span class="lbl">index</span>
                        <input
                            type="number"
                            bind:value={targetIndex}
                            min="0"
                            max="9999"
                            aria-label="Target item index"
                        />
                    </label>
                    <label>
                        <span class="lbl">align</span>
                        <select bind:value={align} aria-label="Scroll alignment">
                            <option value="auto">auto</option>
                            <option value="top">top</option>
                            <option value="bottom">bottom</option>
                            <option value="nearest">nearest</option>
                        </select>
                    </label>
                    <button class="ctrl run" type="button" onclick={() => scrollToIndex()}>
                        run
                    </button>
                    <button class="ctrl" type="button" onclick={() => scrollToIndex(0, 'top')}
                        >first</button
                    >
                    <button class="ctrl" type="button" onclick={() => scrollToIndex(5000, 'auto')}
                        >middle</button
                    >
                    <button class="ctrl" type="button" onclick={() => scrollToIndex(9999, 'bottom')}
                        >last</button
                    >
                    <span class="live">● READY</span>
                </div>
                <div class="grid">
                    <div class="pane">
                        <div class="label">SRC / SCROLL METHOD</div>
                        <pre>{labSource}</pre>
                    </div>
                    <div class="pane out">
                        <div class="label">OUT / RENDERED</div>
                        <div class="lab-list">
                            <VirtualList items={labItems} bind:this={listRef}>
                                {#snippet renderItem(item)}
                                    <div class:highlighted={item.highlighted} class="lab-row">
                                        <strong>{item.title}</strong>
                                        <span>{item.detail}</span>
                                    </div>
                                {/snippet}
                            </VirtualList>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <div>target · <span class="v">{targetIndex}</span></div>
                    <div>align · <span class="v">{align}</span></div>
                    <div>smooth · <span class="v">true</span></div>
                    <div>rows · <span class="v">10,000</span></div>
                    <div>method · <span class="v accent">scroll</span></div>
                </div>
            </div>
        </section>

        <section class="brut-comp">
            <div class="k">FIG-005 / COMPARISON MATRIX</div>
            <h2>how we <span>compare</span>.</h2>
            <p class="lede-p">
                Honest, side-by-side comparisons against Svelte-first, headless, multi-framework,
                and legacy virtual-list packages.
            </p>
            <div class="comp-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>library</th>
                            <th>category</th>
                            <th>dynamic heights</th>
                            <th>infinite loading</th>
                            <th>scroll to index</th>
                            <th>runtime deps</th>
                            <th class="comp-read-th">read more</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="us-row">
                            <td class="us">{PKG_NAME} ●</td>
                            <td class="us">Svelte 5 component</td>
                            <td class="y">yes</td>
                            <td class="y">yes</td>
                            <td class="y">yes</td>
                            <td class="y">0</td>
                            <td class="comp-read"><span class="comp-read-self">this row</span></td>
                        </tr>
                        {#each compareRows as row (row.slug)}
                            {@const dynamic = formatCell(row.dynamic)}
                            {@const loading = formatCell(row.loading)}
                            {@const scroll = formatCell(row.scroll)}
                            {@const deps = formatCell(row.deps)}
                            <tr>
                                <td>{row.name}</td>
                                <td>{row.type}</td>
                                <td class={dynamic.cls}>{dynamic.text}</td>
                                <td class={loading.cls}>{loading.text}</td>
                                <td class={scroll.cls}>{scroll.text}</td>
                                <td class={deps.cls}>{deps.text}</td>
                                <td class="comp-read">
                                    <a
                                        href="/compare/{row.slug}"
                                        class="comp-read-link"
                                        aria-label="Read full comparison with {row.name}"
                                    >
                                        read more <span aria-hidden="true">→</span>
                                    </a>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <a class="comp-all" href="/compare">view all comparisons →</a>
        </section>

        <section class="brut-ai" id="ai-ready">
            <div class="lede">
                <div class="k">FIG-006 / AI-READY</div>
                <h2>built for <span>ai-assisted</span> code.</h2>
                <p>
                    Point Cursor, Claude Code, or any LLM at the generated manifests and mirrors so
                    they can find the component API, scroll methods, examples, and comparisons.
                </p>
            </div>
            <div class="ai-panel">
                <div class="ai-head">
                    <span class="ai-tab on">llms.txt</span>
                    <span class="ai-tab">llms-full.txt</span>
                    <span class="grow"></span>
                    <span class="ai-meta">/llmstxt.org</span>
                </div>
                <div class="ai-grid">
                    {#each aiDocs as doc (doc.href)}
                        <a class="ai-cell" href={doc.href} target="_blank" rel="noopener">
                            <div class="ai-cell-k">{doc.key}</div>
                            <h3><code>{doc.title}</code></h3>
                            <p>{doc.body}</p>
                            <div class="ai-cell-foot">{doc.foot}</div>
                        </a>
                    {/each}
                </div>
                <div class="ai-prompt">
                    <span class="ai-prompt-k">// example prompt</span>
                    <code>
                        Use https://virtuallist.svelte.page/llms.txt as the source for
                        <em>@humanspeak/svelte-virtual-list</em>. Build a Svelte 5 feed with dynamic
                        row heights, infinite loading, and a search result jump that calls
                        <em>scroll</em> with an index and alignment.
                    </code>
                </div>
            </div>
        </section>

        <section class="brut-ex">
            <div class="lede">
                <div class="k">FIG-007 / EXAMPLES</div>
                <h2>explore <span>interactive examples</span>.</h2>
                <p>
                    See basic rendering, infinite loading, imperative scrolling, variable heights,
                    and the docs pages that explain the same APIs in detail.
                </p>
            </div>
            <div>
                <div class="grid">
                    {#each featuredExamples as ex, i (ex.href)}
                        <a class="cell" href={ex.href}>
                            <div class="id">
                                № {String(i + 1).padStart(2, '0')} / {String(
                                    featuredExamples.length
                                ).padStart(2, '0')}
                            </div>
                            <div class="corner">↗</div>
                            <h3>{ex.title}</h3>
                            <p>{ex.body}</p>
                            <div class="marker"></div>
                        </a>
                    {/each}
                </div>
                <a class="ex-all" href="/examples">view all examples →</a>
            </div>
        </section>

        <section class="brut-foot">
            <div class="info">
                <div>SET / JETBRAINS MONO + INTER</div>
                <div>HUMANSPEAK · 2026</div>
                <div>MIT LICENCE</div>
                <div class="v">● {PKG_VERSION}</div>
            </div>
            <MotionButton
                class="big"
                type="button"
                onTap={copyInstall}
                aria-label="Copy install command"
                whileTap={{ scale: 0.985 }}
                whileHover={{ scale: 1.005 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
                npm&nbsp;i&nbsp;<span>@humanspeak/</span><br />svelte-virtual-list
                <span class="copy-hint">
                    <AnimatePresence initial={false}>
                        <MotionSpan
                            key={copied ? 'copied' : 'idle'}
                            class="copy-hint-label"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            {copied ? 'copied to clipboard' : 'click to copy'}
                        </MotionSpan>
                    </AnimatePresence>
                </span>
            </MotionButton>
            <div class="info right">
                <div>SHEET 07 / 07</div>
                <div>END OF DOCUMENT</div>
                <a class="v" href="#top">↩ TO TOP</a>
            </div>
        </section>
    </main>

    <FooterV2 version={PKG_VERSION} />
</div>

<style>
    .brut .sans {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: 0;
    }

    .brut-coord {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-bottom: 1px solid var(--brut-rule);
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-coord div {
        padding: 6px 8px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-coord div:last-child {
        border-right: 0;
    }

    .brut-hero {
        padding: 80px 24px 32px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        position: relative;
    }
    .brut-hero .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
        color: var(--brut-ink-3);
        margin: 0;
    }
    .brut-hero .meta .k {
        color: var(--brut-ink-3);
    }
    .brut-hero .meta .v {
        color: var(--brut-ink);
    }
    .brut-hero .meta .v.accent {
        color: var(--brut-accent);
    }
    .brut-hero .meta hr {
        border: 0;
        border-top: 1px dashed var(--brut-rule);
        margin: 8px 0;
    }
    .brut-hero h1 {
        margin: 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(52px, 10.2vw, 144px);
        line-height: 0.88;
        font-weight: 500;
        letter-spacing: 0;
        text-transform: lowercase;
    }
    .brut-hero h1 .slash {
        color: var(--brut-accent);
    }
    .brut-hero h1 .end {
        color: var(--brut-ink-3);
    }
    .brut-hero .sub {
        margin: 28px 0 0;
        max-width: 720px;
        font-size: 17px;
        line-height: 1.5;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: 0;
    }
    .brut-hero .sub b {
        color: var(--brut-ink);
        font-weight: 600;
    }
    .brut-hero .cta-row {
        margin-top: 28px;
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        align-items: stretch;
        width: fit-content;
        max-width: 100%;
    }
    .brut-hero .cta-row > * {
        padding: 10px 14px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--brut-ink);
        cursor: pointer;
        font-family: inherit;
        text-decoration: none;
        position: relative;
        z-index: 1;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .brut-hero .cta-row > * + * {
        margin-left: -1px;
    }
    .brut-hero .cta-row > *:hover {
        z-index: 2;
    }
    .brut-hero .cta-row .pri {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        font-weight: 600;
        border-color: var(--brut-accent);
    }
    .brut-hero .cta-row .pri:hover {
        background: var(--brut-accent-hover);
        border-color: var(--brut-accent-hover);
    }
    .brut-hero .cta-row a:not(.pri):hover,
    .brut-hero .cta-row :global(.inst:hover) {
        background: var(--brut-bg-2);
        border-color: var(--brut-rule-2);
    }
    .brut-hero .cta-row :global(.inst) {
        padding: 10px 18px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink-2);
        font-family: inherit;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        position: relative;
        z-index: 1;
        margin-left: -1px;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .brut-hero .cta-row :global(.inst:hover) {
        z-index: 2;
    }
    .brut-hero .cta-row :global(.inst .inst-prompt) {
        color: var(--brut-ink-3);
    }
    .brut-hero .cta-row :global(.inst .inst-cmd) {
        color: var(--brut-ink-2);
    }
    .brut-hero .cta-row :global(.inst .inst-cmd .pkg) {
        color: var(--brut-ink);
    }
    .brut-hero .cta-row :global(.inst .inst-copy) {
        margin-left: 4px;
        padding: 2px 8px;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-accent);
        border: 1px solid var(--brut-rule);
        display: inline-grid;
        align-items: center;
        justify-items: center;
        min-width: 84px;
        height: 20px;
        overflow: hidden;
        transition:
            border-color 0.2s,
            background 0.2s;
    }
    .brut-hero .cta-row :global(.inst .inst-copy.is-copied) {
        border-color: var(--brut-accent);
        background: var(--brut-accent-soft);
    }
    .brut-hero .cta-row :global(.inst .inst-copy-label) {
        grid-area: 1 / 1;
        display: inline-block;
        white-space: nowrap;
        will-change: transform, opacity;
    }
    .brut-hero .corner {
        position: absolute;
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-hero .corner.tr {
        top: 12px;
        right: 24px;
    }
    .brut-hero .corner.bl {
        bottom: 12px;
        left: 24px;
    }
    .brut-hero .corner.br {
        bottom: 12px;
        right: 24px;
    }

    .brut-stats {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-stats .s {
        padding: 28px 24px;
        border-right: 1px solid var(--brut-rule);
        position: relative;
        min-height: 160px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .brut-stats .s:last-child {
        border-right: 0;
    }
    .brut-stats .s .k {
        font-size: 10.5px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
    }
    .brut-stats .s .v {
        font-size: 64px;
        line-height: 1;
        font-weight: 500;
        letter-spacing: 0;
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        white-space: nowrap;
    }
    .brut-stats .s .v-unit {
        font-size: 22px;
        letter-spacing: 0;
        font-weight: 500;
        color: inherit;
        line-height: 1;
    }
    .brut-stats .s .note {
        font-size: 11px;
        color: var(--brut-ink-2);
    }
    .brut-stats .s.ac .v {
        color: var(--brut-accent);
    }
    .brut-stats .s::after {
        content: attr(data-idx);
        position: absolute;
        top: 12px;
        right: 14px;
        font-size: 10px;
        color: var(--brut-ink-3);
    }

    .brut-stream .lede,
    .brut-feat .lede,
    .brut-play .lede,
    .brut-ai .lede {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-stream .lede h2,
    .brut-feat .lede h2,
    .brut-play .lede h2,
    .brut-ai .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: 0;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-stream .lede h2 span,
    .brut-feat .lede h2 span,
    .brut-play .lede h2 span,
    .brut-ai .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-stream .lede p,
    .brut-play .lede p,
    .brut-ai .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        letter-spacing: 0;
    }

    .brut-stream,
    .brut-feat,
    .brut-play,
    .brut-ai,
    .brut-ex {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-stream .panel,
    .brut-play .panel {
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    .brut-stream .panel .bar,
    .brut-play .panel .bar {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-2);
        background: var(--brut-bg-2);
        flex-wrap: wrap;
    }
    .brut-stream .panel .bar .lbl,
    .brut-play .panel .bar .lbl {
        color: var(--brut-ink-3);
    }
    .brut-stream .panel .bar .v,
    .brut-play .panel .bar .v {
        color: var(--brut-ink);
    }
    .brut-stream .panel .bar .live,
    .brut-play .panel .bar .live {
        margin-left: auto;
        color: var(--brut-accent);
    }
    .brut-stream .panel .grid,
    .brut-play .panel .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        height: 520px;
    }
    .brut-stream .panel .pane,
    .brut-play .panel .pane {
        padding: 16px 18px;
        overflow: auto;
        min-height: 0;
    }
    .brut-stream .panel .pane + .pane,
    .brut-play .panel .pane + .pane {
        border-left: 1px solid var(--brut-rule);
    }
    .brut-stream .panel .pane .label,
    .brut-play .panel .pane .label {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        margin-bottom: 12px;
    }
    .brut-stream .panel .pane pre,
    .brut-play .panel .pane pre {
        margin: 0;
        font-size: 12.5px;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .brut-stream .list-frame {
        height: calc(100% - 28px);
        min-height: 440px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    .demo-row {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid var(--brut-rule);
        padding: 13px 14px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
    }
    .demo-row span {
        color: var(--brut-ink-3);
        text-transform: uppercase;
        font-size: 10.5px;
    }
    .brut-stream .panel .footer,
    .brut-play .panel .footer {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        border-top: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-2);
    }
    .brut-stream .panel .footer > div,
    .brut-play .panel .footer > div {
        padding: 8px 14px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-stream .panel .footer > div:last-child,
    .brut-play .panel .footer > div:last-child {
        border-right: 0;
    }
    .brut-stream .panel .footer .v,
    .brut-play .panel .footer .v {
        color: var(--brut-ink);
    }
    .brut-stream .panel .footer .v.accent,
    .brut-play .panel .footer .v.accent {
        color: var(--brut-accent);
    }

    .brut-feat .grid,
    .brut-ex .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0;
        border-left: 1px solid var(--brut-rule);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-feat .cell,
    .brut-ex .cell {
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        padding: 20px 22px;
        min-height: 200px;
        position: relative;
        color: var(--brut-ink);
        text-decoration: none;
    }
    .brut-feat .cell::after,
    .brut-ex .cell::after {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .brut-feat .cell:hover::after,
    .brut-ex .cell:hover::after {
        border-color: var(--brut-accent);
    }
    .brut-feat .cell .id,
    .brut-ex .cell .id {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-feat .cell h3,
    .brut-ex .cell h3 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: 0;
        margin: 30px 0 8px;
        color: var(--brut-ink);
    }
    .brut-feat .cell p,
    .brut-ex .cell p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        line-height: 1.55;
        margin: 0;
        max-width: 320px;
    }
    .brut-feat .cell .corner,
    .brut-ex .cell .corner {
        position: absolute;
        top: 14px;
        right: 16px;
        font-size: 10.5px;
        color: var(--brut-ink-3);
    }
    .brut-feat .cell .marker,
    .brut-ex .cell .marker {
        width: 14px;
        height: 14px;
        border: 1px solid var(--brut-ink-3);
        position: absolute;
        bottom: 16px;
        right: 16px;
    }
    .brut-feat .cell:nth-child(3n + 1) .marker,
    .brut-ex .cell:nth-child(3n + 1) .marker {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
    }

    .brut-play {
        scroll-margin-top: 80px;
    }
    .brut-play .panel .bar label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .brut-play .panel .bar input,
    .brut-play .panel .bar select {
        width: auto;
        min-width: 74px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        padding: 3px 8px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
    }
    .brut-play .panel .bar .ctrl {
        background: transparent;
        border: 0;
        padding: 0 8px;
        font-family: inherit;
        font-size: 11px;
        color: var(--brut-accent);
        cursor: pointer;
    }
    .brut-play .panel .bar .ctrl.run {
        border: 1px solid var(--brut-accent);
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        padding: 4px 10px;
    }
    .brut-play .lab-list {
        height: calc(100% - 28px);
        min-height: 440px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    .lab-row {
        border-bottom: 1px solid var(--brut-rule);
        padding: 12px 14px;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
    }
    .lab-row strong {
        display: block;
        color: var(--brut-ink);
        font-size: 13px;
    }
    .lab-row span {
        display: block;
        margin-top: 4px;
        color: var(--brut-ink-2);
        font-size: 12px;
        line-height: 1.45;
    }
    .lab-row.highlighted {
        background: var(--brut-accent-soft);
    }

    .brut-comp {
        padding: 28px 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-comp .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-comp h2 {
        font-size: 28px;
        margin: 12px 0 24px;
        letter-spacing: 0;
        text-transform: lowercase;
        font-weight: 500;
        color: var(--brut-ink);
    }
    .brut-comp h2 span {
        color: var(--brut-accent);
    }
    .brut-comp .lede-p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        margin: 0 0 24px;
        line-height: 1.55;
        max-width: 720px;
    }
    .brut-comp .comp-scroll {
        overflow-x: auto;
    }
    .brut-comp table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
    }
    .brut-comp table th,
    .brut-comp table td {
        text-align: left;
        padding: 12px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 13px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        color: var(--brut-ink);
    }
    .brut-comp table th {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        font-weight: 400;
        text-transform: lowercase;
    }
    .brut-comp table td.us,
    .brut-comp table .y {
        color: var(--brut-accent);
    }
    .brut-comp table .n {
        color: var(--brut-ink-3);
    }
    .brut-comp table tbody tr:hover {
        background: var(--brut-bg-2);
    }
    .brut-comp table tr.us-row {
        background: var(--brut-accent-soft);
    }
    .brut-comp .comp-read-th,
    .brut-comp .comp-read {
        text-align: right;
        white-space: nowrap;
    }
    .brut-comp .comp-read-link,
    .brut-comp .comp-all {
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 11.5px;
        letter-spacing: 0.04em;
    }
    .brut-comp .comp-read-link:hover,
    .brut-comp .comp-all:hover {
        text-decoration: underline;
    }
    .brut-comp .comp-read-self {
        color: var(--brut-ink-3);
        font-size: 11.5px;
        letter-spacing: 0.04em;
    }
    .brut-comp .comp-all {
        display: inline-block;
        margin-top: 18px;
        font-size: 12px;
        letter-spacing: 0.08em;
    }

    .brut-ai .ai-panel {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    .brut-ai .ai-head {
        display: flex;
        align-items: center;
        gap: 0;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
    }
    .brut-ai .ai-tab {
        padding: 9px 14px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-ai .ai-tab.on {
        background: var(--brut-bg);
        color: var(--brut-ink);
    }
    .brut-ai .grow {
        flex: 1;
    }
    .brut-ai .ai-meta {
        padding: 9px 14px;
        border-left: 1px solid var(--brut-rule);
    }
    .brut-ai .ai-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
    }
    .brut-ai .ai-cell {
        position: relative;
        padding: 20px 22px 56px;
        min-height: 200px;
        border-right: 1px solid var(--brut-rule);
        color: var(--brut-ink);
        text-decoration: none;
        transition: background-color 0.15s;
    }
    .brut-ai .ai-cell:last-child {
        border-right: 0;
    }
    .brut-ai .ai-cell:hover {
        background: color-mix(in oklab, var(--brut-accent) 6%, transparent);
    }
    .brut-ai .ai-cell-k {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }
    .brut-ai .ai-cell h3 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: 0;
        margin: 22px 0 10px;
        color: var(--brut-ink);
    }
    .brut-ai .ai-cell h3 code {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        background: transparent;
        padding: 0;
        font-size: 0.85em;
        color: var(--brut-accent);
    }
    .brut-ai .ai-cell p {
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        margin: 0;
    }
    .brut-ai .ai-cell-foot {
        position: absolute;
        left: 22px;
        bottom: 18px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    .brut-ai .ai-prompt {
        padding: 16px 22px;
        border-top: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        line-height: 1.6;
        color: var(--brut-ink-2);
    }
    .brut-ai .ai-prompt-k {
        display: block;
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin-bottom: 6px;
    }
    .brut-ai .ai-prompt code {
        background: transparent;
        padding: 0;
        color: var(--brut-ink);
    }
    .brut-ai .ai-prompt em {
        color: var(--brut-accent);
        font-style: normal;
    }

    .brut-ex .lede .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-ex .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: 0;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-ex .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-ex .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        max-width: 640px;
    }
    .brut-ex .cell .corner {
        font-size: 14px;
        transition: color 0.2s;
    }
    .brut-ex .cell:hover .corner {
        color: var(--brut-accent);
    }
    .brut-ex .ex-all {
        display: inline-block;
        margin-top: 18px;
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 12px;
        letter-spacing: 0.08em;
    }
    .brut-ex .ex-all:hover {
        text-decoration: underline;
    }

    .brut-foot {
        padding: 60px 24px 36px;
        display: grid;
        grid-template-columns: 200px 1fr 200px;
        gap: 24px;
        border-top: 1px solid var(--brut-rule);
        align-items: end;
    }
    .brut-foot :global(.big) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(40px, 7vw, 96px);
        line-height: 0.9;
        letter-spacing: 0;
        text-transform: lowercase;
        background: transparent;
        border: 0;
        color: var(--brut-ink);
        text-align: left;
        cursor: pointer;
        padding: 0;
        position: relative;
    }
    .brut-foot :global(.big span) {
        color: var(--brut-accent);
    }
    .brut-foot :global(.big .copy-hint) {
        display: inline-grid;
        align-items: center;
        justify-items: start;
        margin-top: 16px;
        height: 16px;
        font-size: 11px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
        overflow: hidden;
        min-width: 200px;
    }
    .brut-foot :global(.big .copy-hint-label) {
        grid-area: 1 / 1;
        display: inline-block;
        white-space: nowrap;
        will-change: transform, opacity;
    }
    .brut-foot :global(.big:hover .copy-hint) {
        color: var(--brut-accent);
    }
    .brut-foot .info {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.12em;
        line-height: 1.8;
    }
    .brut-foot .info.right {
        text-align: right;
    }
    .brut-foot .info .v,
    .brut-foot .info a.v {
        color: var(--brut-ink);
        text-decoration: none;
        display: block;
        margin-top: 12px;
    }
    .brut-foot .info a.v:hover {
        color: var(--brut-accent);
    }

    @media (max-width: 1024px) {
        .brut-stats {
            grid-template-columns: repeat(3, 1fr);
        }
        .brut-stats .s:nth-child(3n) {
            border-right: 0;
        }
        .brut-stats .s:nth-child(-n + 3) {
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-feat .grid,
        .brut-ex .grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .brut-stream .panel .grid,
        .brut-play .panel .grid {
            grid-template-columns: 1fr;
        }
        .brut-stream .panel .grid,
        .brut-play .panel .grid {
            height: auto;
        }
        .brut-stream .panel .pane,
        .brut-play .panel .pane {
            height: 320px;
        }
        .brut-stream .panel .pane + .pane,
        .brut-play .panel .pane + .pane {
            border-left: 0;
            border-top: 1px solid var(--brut-rule);
        }
        .brut-ai .ai-grid {
            grid-template-columns: 1fr;
        }
        .brut-ai .ai-cell {
            border-right: 0;
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-ai .ai-cell:last-child {
            border-bottom: 0;
        }
        .brut-ex,
        .brut-ai {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 720px) {
        .brut-coord {
            display: none;
        }
        .brut-hero,
        .brut-stream,
        .brut-feat,
        .brut-play,
        .brut-ai,
        .brut-ex {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
        }
        .brut-hero {
            padding-top: 56px;
        }
        .brut-stats {
            grid-template-columns: repeat(2, 1fr);
        }
        .brut-stats .s {
            min-height: 130px;
            padding: 20px 16px;
        }
        .brut-stats .s .v {
            font-size: 44px;
        }
        .brut-stats .s:nth-child(2n) {
            border-right: 0;
        }
        .brut-stats .s:not(:nth-last-child(-n + 2)) {
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-foot {
            grid-template-columns: 1fr;
            padding: 40px 16px 28px;
        }
        .brut-foot .info.right {
            text-align: left;
        }
    }
</style>
