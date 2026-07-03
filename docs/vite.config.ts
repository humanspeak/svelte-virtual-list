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
import { sentrySvelteKit } from '@sentry/sveltekit'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { competitors } from './src/lib/compare-data'
import { docsConfig } from './src/lib/docs-config'

// IndexNow verification key — not a secret: the protocol requires the
// matching static/<key>.txt to be publicly reachable on the site.
const indexNowKey = '909c75f3-0a59-4484-9bbc-64e0f9ca97aa'

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
            prepend: 'llms-positioning.md'
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
                ogFeatures: [
                    'Feature Comparison',
                    'Pros & Cons',
                    'Migration Guide',
                    'Honest Verdict'
                ]
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
        sentrySvelteKit({
            sourceMapsUploadOptions: {
                org: 'humanspeak',
                project: 'virtuallist-svelte-page'
            }
        }),
        sveltekit()
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
