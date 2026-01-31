import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

type OtherProject = {
    url: string
    slug: string
    shortDescription: string
}

export const GET: RequestHandler = async () => {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch('https://svelte.page/api/v1/others', {
            signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const projects = await response.json()

        // Validate response structure
        if (!Array.isArray(projects)) {
            throw new Error('Invalid response: expected array')
        }

        // Validate each element has required fields
        const validProjects = projects.filter(
            (p): p is OtherProject =>
                p != null &&
                typeof p.slug === 'string' &&
                typeof p.url === 'string' &&
                typeof p.shortDescription === 'string'
        )

        // Filter out this project (svelte-virtual-list)
        const otherProjects = validProjects.filter((project) => project.slug !== 'virtuallist')

        return json(otherProjects)
    } catch (error) {
        console.error('Failed to fetch other projects:', error)
        // Return empty array on error
        return json([])
    }
}
