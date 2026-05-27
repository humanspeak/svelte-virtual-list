import {
    demoManifestPlugin,
    docMirrorsPlugin,
    llmsFullPlugin,
    llmsPlugin,
    sitemapManifestPlugin
} from '@humanspeak/docs-kit/vite'
import { svelteMotionOptimize } from '@humanspeak/svelte-motion/vite'
import { sentrySvelteKit } from '@sentry/sveltekit'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { docsConfig } from './src/lib/docs-config'

export default defineConfig({
    plugins: [
        sitemapManifestPlugin(),
        demoManifestPlugin(),
        docMirrorsPlugin({ siteUrl: docsConfig.url }),
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
