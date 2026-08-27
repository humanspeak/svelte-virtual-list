import { isRedirect, type RequestEvent } from '@sveltejs/kit'
import { describe, expect, it, vi } from 'vitest'
import { permanentRedirectHandle, permanentRedirects } from './redirects'

const ok = new Response('ok')

/** Run the handle against `url`, returning either the redirect it threw or
 *  the resolve() spy that proves it passed the request through untouched. */
const run = (url: string) => {
    const resolve = vi.fn(() => ok)
    const event = { url: new URL(url, 'https://virtuallist.svelte.page') } as RequestEvent

    try {
        permanentRedirectHandle({ event, resolve })
        return { resolve }
    } catch (error) {
        if (!isRedirect(error)) throw error
        return { resolve, redirect: error }
    }
}

describe('permanentRedirectHandle', () => {
    it('301s /Compare to /compare', () => {
        const { redirect, resolve } = run('/Compare')

        expect(redirect?.status).toBe(301)
        expect(redirect?.location).toBe('/compare')
        expect(resolve).not.toHaveBeenCalled()
    })

    it('preserves the query string', () => {
        expect(run('/Compare?ref=ahrefs').redirect?.location).toBe('/compare?ref=ahrefs')
    })

    it('passes the canonical path through', () => {
        const { redirect, resolve } = run('/compare')

        expect(redirect).toBeUndefined()
        expect(resolve).toHaveBeenCalledOnce()
    })

    /* Matching is exact by design — these still 404 until one is observed
       in the wild and added to the map. */
    it.each(['/COMPARE', '/Compare/', '/Compare/Virtua', '/Examples'])(
        'leaves %s alone',
        (path) => {
            const { redirect, resolve } = run(path)

            expect(redirect).toBeUndefined()
            expect(resolve).toHaveBeenCalledOnce()
        }
    )

    it('only carries entries for observed 404s', () => {
        expect([...permanentRedirects]).toEqual([['/Compare', '/compare']])
    })
})
