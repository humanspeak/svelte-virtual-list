import { highlightBlogPosts, loadBlogPosts } from '@humanspeak/docs-kit/blog'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
    const globResult = import.meta.glob('/src/content/blog/*.md', {
        eager: true,
        query: '?raw',
        import: 'default'
    }) as Record<string, string>

    const posts = await highlightBlogPosts(loadBlogPosts(globResult))
    const post = posts.find((p) => p.slug === params.slug)

    if (!post) {
        error(404, 'Post not found')
    }

    return { post }
}
