import { env } from '$env/dynamic/public'
import manifest from '$lib/sitemap-manifest.json'
import type { RequestHandler } from '@sveltejs/kit'

// Eager=false keeps build light; we only need the keys for paths
const pageFiles = Object.keys(
    import.meta.glob('/src/routes/**/+page.{svelte,svx,md}', { eager: false })
)

function toPath(file: string): string {
    // Strip /src/routes and "+page.*" suffix; default root to '/'
    const p = file.replace('/src/routes', '').replace(/\/\+page\.(svelte|svx|md)$/i, '')
    return p === '' ? '/' : p
}

export const GET: RequestHandler = async ({ url }) => {
    const base = (env.PUBLIC_SITE_URL || `${url.origin}`).replace(/\/$/, '')

    // Unique, sorted, and exclude private/underscore folders
    const routes = [...new Set(pageFiles.map(toPath))]
        .filter((p) => !/\/_(?:.*)|\/(?:\+|__)/.test(p))
        .sort()

    const today = new Date().toISOString().slice(0, 10)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
        .map(
            (p) =>
                `  <url>\n    <loc>${base}${p}</loc>\n    <lastmod>${manifest[p] || today}</lastmod>\n  </url>`
        )
        .join('\n')}\n</urlset>`

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            // CDN caches for 1 hour; browsers get latest on next request
            'Cache-Control': 'max-age=0, s-maxage=3600'
        }
    })
}
