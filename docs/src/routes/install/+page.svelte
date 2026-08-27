<script lang="ts">
    import { getSeoContext } from '@humanspeak/docs-kit'

    const title = 'Svelte Virtual List npm Package — Install for Svelte 5'
    const description =
        'Install @humanspeak/svelte-virtual-list for Svelte 5. Copy the npm command, see requirements, and render your first virtual list in minutes.'
    const installCommand = 'npm install @humanspeak/svelte-virtual-list'
    const minimalUsage = [
        '<script lang="ts">',
        "    import VirtualList from '@humanspeak/svelte-virtual-list'",
        '',
        '    const items = Array.from({ length: 10_000 }, (_, id) => ({ id }))',
        '</' + 'script>',
        '',
        '<VirtualList {items}>',
        '    {#snippet renderItem(item)}',
        '        <div>Item {item.id}</div>',
        '    {/snippet}',
        '</VirtualList>'
    ].join('\n')

    const seo = getSeoContext()
    if (seo) {
        seo.title = title
        seo.description = description
        seo.ogTitle = 'Install Svelte Virtual List'
        seo.ogTagline = 'Add a dependency-free virtual list to a Svelte 5 project.'
        seo.ogFeatures = ['Svelte 5', 'Zero Runtime Dependencies', 'TypeScript', 'SSR Ready']
        seo.ogSlug = 'install'
    }

    let copied = $state(false)
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    const copyInstall = async () => {
        try {
            await navigator.clipboard.writeText(installCommand)
        } catch {
            const textarea = document.createElement('textarea')
            textarea.value = installCommand
            textarea.setAttribute('readonly', '')
            textarea.style.position = 'fixed'
            textarea.style.left = '-9999px'
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            textarea.remove()
        }

        copied = true
        if (resetTimer) clearTimeout(resetTimer)
        resetTimer = setTimeout(() => (copied = false), 1500)
    }
</script>

<main class="install-page">
    <section class="hero">
        <p class="kicker">// npm package / svelte 5</p>
        <h1>Install Svelte Virtual List</h1>
        <p class="lede">
            Add <strong>@humanspeak/svelte-virtual-list</strong>, a dependency-free virtual list for
            rendering large datasets with dynamic item sizes in Svelte 5.
        </p>

        <div class="command-row">
            <code>{installCommand}</code>
            <button type="button" onclick={copyInstall} aria-live="polite">
                {copied ? '✓ Copied' : 'Copy command'}
            </button>
        </div>

        <a class="primary" href="/examples/basic-list">See the minimal example ↗</a>
    </section>

    <section class="requirements" aria-labelledby="requirements-heading">
        <div>
            <p class="kicker">01 / requirements</p>
            <h2 id="requirements-heading">Ready for Svelte 5.</h2>
            <p>
                The package uses Svelte 5 snippets, ships TypeScript definitions, supports SvelteKit
                SSR, and has zero runtime dependencies.
            </p>
        </div>
        <dl>
            <div>
                <dt>framework</dt>
                <dd>Svelte 5</dd>
            </div>
            <div>
                <dt>runtime deps</dt>
                <dd>0</dd>
            </div>
            <div>
                <dt>license</dt>
                <dd>MIT</dd>
            </div>
        </dl>
    </section>

    <section aria-labelledby="package-managers-heading">
        <p class="kicker">02 / package managers</p>
        <h2 id="package-managers-heading">Choose your package manager.</h2>
        <div class="commands">
            <pre><code>npm install @humanspeak/svelte-virtual-list</code></pre>
            <pre><code>pnpm add @humanspeak/svelte-virtual-list</code></pre>
            <pre><code>yarn add @humanspeak/svelte-virtual-list</code></pre>
        </div>
    </section>

    <section aria-labelledby="usage-heading">
        <p class="kicker">03 / minimal usage</p>
        <h2 id="usage-heading">Render your first virtual list.</h2>
        <pre class="usage"><code>{minimalUsage}</code></pre>
    </section>

    <nav class="next-links" aria-label="Installation resources">
        <a href="/docs">Read the docs <span>↗</span></a>
        <a href="/examples">Browse examples <span>↗</span></a>
        <a href="https://www.npmjs.com/package/@humanspeak/svelte-virtual-list"
            >View on npm <span>↗</span></a
        >
        <a href="https://github.com/humanspeak/svelte-virtual-list">View on GitHub <span>↗</span></a
        >
    </nav>
</main>

<style>
    .install-page {
        max-width: 72rem;
        margin: 0 auto;
        padding: 4rem 1.5rem 6rem;
    }
    section {
        padding: 4rem 0;
        border-bottom: 1px solid var(--border, #d8d8d8);
    }
    .hero {
        padding-top: 2rem;
    }
    .kicker {
        margin: 0 0 1rem;
        font: 700 0.75rem/1.4 monospace;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--primary, #d14f2f);
    }
    h1 {
        max-width: 16ch;
        margin: 0;
        font-size: clamp(2.75rem, 8vw, 6rem);
        line-height: 0.95;
        letter-spacing: -0.055em;
    }
    h2 {
        margin: 0 0 1rem;
        font-size: clamp(1.75rem, 4vw, 3rem);
        line-height: 1;
        letter-spacing: -0.035em;
    }
    .lede {
        max-width: 48rem;
        margin: 1.75rem 0;
        font-size: clamp(1.1rem, 2vw, 1.35rem);
        line-height: 1.65;
    }
    .command-row {
        display: flex;
        align-items: stretch;
        max-width: 54rem;
        margin: 2rem 0 1rem;
        border: 2px solid currentColor;
        background: var(--background, #fff);
    }
    .command-row code {
        flex: 1;
        min-width: 0;
        padding: 1rem;
        overflow-x: auto;
        font-size: clamp(0.8rem, 2vw, 1rem);
        white-space: nowrap;
    }
    button,
    .primary {
        border: 0;
        background: var(--foreground, #111);
        color: var(--background, #fff);
        font: 700 0.85rem/1 monospace;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    button {
        min-width: 9.5rem;
        padding: 1rem;
        cursor: pointer;
    }
    button:focus-visible,
    a:focus-visible {
        outline: 3px solid var(--primary, #d14f2f);
        outline-offset: 3px;
    }
    .primary {
        display: inline-block;
        padding: 1rem 1.25rem;
        text-decoration: none;
    }
    .requirements {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 4rem;
    }
    .requirements p:last-child {
        max-width: 42rem;
        line-height: 1.7;
    }
    dl {
        margin: 0;
        border-top: 2px solid currentColor;
    }
    dl div {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.8rem 0;
        border-bottom: 1px solid currentColor;
    }
    dt {
        font-family: monospace;
        text-transform: uppercase;
    }
    dd {
        margin: 0;
        font-weight: 700;
    }
    .commands {
        display: grid;
        gap: 0.75rem;
    }
    pre {
        margin: 0;
        padding: 1rem;
        overflow-x: auto;
        border: 1px solid var(--border, #d8d8d8);
        background: var(--muted, #f4f4f4);
    }
    .usage {
        padding: 1.5rem;
        line-height: 1.65;
    }
    .next-links {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        border-left: 1px solid var(--border, #d8d8d8);
    }
    .next-links a {
        display: flex;
        justify-content: space-between;
        padding: 1.5rem;
        border-right: 1px solid var(--border, #d8d8d8);
        border-bottom: 1px solid var(--border, #d8d8d8);
        color: inherit;
        font-weight: 700;
        text-decoration: none;
    }
    .next-links a:hover {
        background: var(--muted, #f4f4f4);
    }
    @media (max-width: 640px) {
        .install-page {
            padding-top: 2rem;
        }
        section {
            padding: 3rem 0;
        }
        .command-row {
            flex-direction: column;
        }
        .command-row button {
            width: 100%;
        }
        .requirements,
        .next-links {
            grid-template-columns: 1fr;
            gap: 2rem;
        }
    }
</style>
