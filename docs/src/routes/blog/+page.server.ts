import { loadBlogPostsMdsvex } from '@humanspeak/docs-kit/blog'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const modules = import.meta.glob('/src/routes/blog/*/+page.svx', { eager: true })
    const posts = loadBlogPostsMdsvex(
        modules as Record<string, { metadata?: Record<string, unknown> }>
    )

    return { posts }
}
