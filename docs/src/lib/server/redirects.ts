import { redirect, type Handle } from '@sveltejs/kit'

/**
 * Exact-match permanent redirects for URLs seen in the wild that don't
 * resolve to a route.
 *
 * `/Compare` was tracked at position 20 for "modern svelte virtual list"
 * while returning a 404, so the ranking signal landed on a dead URL instead
 * of consolidating on `/compare`. Nothing in this repo links to it — the
 * traffic is inbound only.
 *
 * Deliberately narrow: one entry per URL actually observed 404ing. The
 * general fix (normalising case for every route) would change behaviour on
 * every request for URLs nobody has asked for, so entries get added here as
 * real 404s turn up instead.
 */
export const permanentRedirects = new Map<string, string>([['/Compare', '/compare']])

export const permanentRedirectHandle: Handle = ({ event, resolve }) => {
    const target = permanentRedirects.get(event.url.pathname)

    if (target) {
        redirect(301, `${target}${event.url.search}`)
    }

    return resolve(event)
}
