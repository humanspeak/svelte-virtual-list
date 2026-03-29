import { loadBlogPosts } from '@humanspeak/docs-kit/blog'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const globResult = import.meta.glob('/src/content/blog/*.md', {
        eager: true,
        query: '?raw',
        import: 'default'
    }) as Record<string, string>

    const posts = loadBlogPosts(globResult)

    return { posts }
}
