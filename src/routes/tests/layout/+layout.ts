import { browser } from '$app/environment'
import type { LayoutLoad } from './$types.js'

export const load: LayoutLoad = ({ params, url }) => {
    const filter = url.searchParams.get('filter') || 'latest'
    const id = params.id
    console.log('load', filter, id)
    if (browser) {
        return {
            filter,
            id
        }
    } else {
        return {
            filter,
            id
        }
    }
}
