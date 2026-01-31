import adapter from '@sveltejs/adapter-cloudflare'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'
import { createHighlighter } from 'shiki'

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

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs/kit/integrations
    // for more information about preprocessors
    preprocess: [
        vitePreprocess(),
        mdsvex({
            highlight: {
                highlighter: async (code, lang = 'text') => {
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

    kit: {
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
                    'https://kit.fontawesome.com',
                    'https://*.ingest.us.sentry.io',
                    'unsafe-inline'
                ],
                'style-src': ['self', 'unsafe-inline', 'https://kit.fontawesome.com'],
                'img-src': ['self', 'data:', 'https:'],
                'font-src': [
                    'self',
                    'data:',
                    'https://kit.fontawesome.com',
                    'https://ka-p.fontawesome.com'
                ],
                'worker-src': ['self', 'blob:'],
                'connect-src': ['self', 'https:'],
                'frame-ancestors': ['none'],
                'form-action': ['self'],
                'base-uri': ['self'],
                'upgrade-insecure-requests': true
            }
        }
    },
    extensions: ['.svelte', '.svx']
}

export default config
