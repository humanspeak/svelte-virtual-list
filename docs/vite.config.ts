import { rehypeKeepCase } from '@humanspeak/docs-kit/mdsvex'
import {
    demoManifestPlugin,
    docMirrorsPlugin,
    exampleMirrorsPlugin,
    indexNowPlugin,
    llmsFullPlugin,
    llmsPlugin,
    sitemapManifestPlugin,
    socialCardsPlugin
} from '@humanspeak/docs-kit/vite'
import { svelteMotionOptimize } from '@humanspeak/svelte-motion/vite'
import { sentrySvelteKit } from '@sentry/sveltekit/vite'
import adapter from '@sveltejs/adapter-cloudflare'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { mdsvex } from 'mdsvex'
import { createHighlighter } from 'shiki'
import { defineConfig } from 'vitest/config'

import { competitors, ours } from './src/lib/compare-data'
import { docsConfig } from './src/lib/docs-config'

// IndexNow verification key — not a secret: the protocol requires the
// matching static/<key>.txt to be publicly reachable on the site.
const indexNowKey = '909c75f3-0a59-4484-9bbc-64e0f9ca97aa'

// Create highlighter instance
const highlighter = await createHighlighter({
    themes: ['github-light', 'one-dark-pro'],
    langs: ['javascript', 'typescript', 'svelte', 'html', 'css', 'json', 'bash', 'shell', 'ini']
})

// Supported languages for syntax highlighting
const supportedLangs = new Set([
    'javascript',
    'typescript',
    'svelte',
    'html',
    'css',
    'json',
    'bash',
    'shell',
    'ini',
    'text'
])

export default defineConfig({
    plugins: [
        sitemapManifestPlugin({
            extraPages: competitors.map((competitor) => ({
                route: `/compare/${competitor.slug}`,
                source: 'src/lib/compare-data.ts'
            }))
        }),
        demoManifestPlugin({ split: true }),
        docMirrorsPlugin({ siteUrl: docsConfig.url }),
        // Before llmsPlugin: the llms.txt index links the example mirrors
        // this plugin writes (static/examples.md + static/examples/<slug>.md).
        exampleMirrorsPlugin({
            siteUrl: docsConfig.url,
            sourceBaseUrl: `https://github.com/${docsConfig.repo}/blob/main/docs`
        }),
        llmsPlugin({
            siteUrl: docsConfig.url,
            pkgName: docsConfig.name,
            description: docsConfig.description,
            prepend: 'llms-positioning.md',
            comparisons: {
                ours,
                competitors,
                priority: ['virtua', 'tanstack-virtual', 'sveltejs-svelte-virtual-list']
            }
        }),
        llmsFullPlugin({
            siteUrl: docsConfig.url,
            pkgName: docsConfig.name,
            prepend: 'llms-positioning.md'
        }),
        socialCardsPlugin({
            npmPackage: docsConfig.npmPackage,
            defaultTitle: docsConfig.name,
            defaultDescription: docsConfig.description,
            defaultFeatures: docsConfig.defaultFeatures,
            extraPages: competitors.map((competitor) => ({
                ogSlug: `compare-${competitor.slug}`,
                ogTitle: `vs ${competitor.name}`,
                ogTagline: competitor.tagline,
                ogFeatures: ['Feature Comparison', 'Pros & Cons', 'Source Linked', 'Honest Verdict']
            }))
        }),
        // Pings IndexNow with the sitemap manifest's URLs after a build run
        // with `--mode indexnow` (the deploy script) — plain `vite build`
        // never submits.
        indexNowPlugin({
            siteUrl: docsConfig.url,
            key: indexNowKey,
            productionMode: 'indexnow'
        }),
        svelteMotionOptimize(),
        tailwindcss(),
        // Must stay before sveltekit(): on Kit 3 it swaps Sentry's browser tracing
        // to the `$app/state` variant (`$app/stores` throws on Kit 3).
        sentrySvelteKit({
            org: 'humanspeak',
            project: 'virtuallist-svelte-page'
        }),
        sveltekit({
            // Consult https://svelte.dev/docs/kit/integrations
            // for more information about preprocessors
            preprocess: [
                vitePreprocess(),
                mdsvex({
                    rehypePlugins: [rehypeKeepCase],
                    highlight: {
                        highlighter: async (code, lang) => {
                            lang ??= 'text'
                            // Use text for unsupported languages (like 'env')
                            const safeLang = supportedLangs.has(lang) ? lang : 'text'

                            // Generate separate HTML for light and dark themes
                            const lightHtml = highlighter.codeToHtml(code, {
                                lang: safeLang,
                                theme: 'github-light'
                            })

                            const darkHtml = highlighter.codeToHtml(code, {
                                lang: safeLang,
                                theme: 'one-dark-pro'
                            })

                            // Wrap each theme in a container with theme-specific classes
                            const combinedHtml = `
                        <div class="shiki-container">
                            <div class="shiki-light">${lightHtml}</div>
                            <div class="shiki-dark">${darkHtml}</div>
                        </div>
                    `

                            return `{@html ${JSON.stringify(combinedHtml)}}`
                        }
                    }
                })
            ],
            extensions: ['.svelte', '.svx'],
            // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
            // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
            // See https://svelte.dev/docs/kit/adapters for more information about adapters.
            adapter: adapter(),
            csp: {
                mode: 'hash',
                directives: {
                    'default-src': ['self'],
                    'script-src': [
                        'self',
                        'https://*.ahrefs.com',
                        'https://q.svelte.page',
                        'unsafe-inline',
                        'wasm-unsafe-eval'
                    ],
                    'style-src': ['self', 'unsafe-inline'],
                    'img-src': ['self', 'data:', 'https:'],
                    'font-src': ['self', 'data:'],
                    'worker-src': ['self', 'blob:'],
                    'connect-src': ['self', 'https:'],
                    'frame-ancestors': ['none'],
                    'form-action': ['self'],
                    'base-uri': ['self'],
                    'upgrade-insecure-requests': true
                }
            }
        })
    ],

    server: {
        port: 8067,
        watch: {
            ignored: ['**/coverage/**']
        }
    },

    optimizeDeps: {
        exclude: [
            '@humanspeak/docs-kit',
            '@humanspeak/svelte-satori-fix',
            '@resvg/resvg-js',
            'satori',
            'satori-html'
        ]
    },

    test: {
        include: ['src/**/*.{test,spec}.{js,ts}']
    }
})
