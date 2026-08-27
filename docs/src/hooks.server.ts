import { permanentRedirectHandle } from '$lib/server/redirects'
import { createDocsKitHandle } from '@humanspeak/docs-kit/hooks'
import { sequence } from '@sveltejs/kit/hooks'

/* Redirects first, so they never reach the render pipeline. */
export const handle = sequence(permanentRedirectHandle, createDocsKitHandle())
