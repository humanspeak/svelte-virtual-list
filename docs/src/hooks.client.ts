import { createClientSentryInit } from '$lib/client-sentry'
import type { HandleClientError } from '@sveltejs/kit'

export const handleError: HandleClientError = ({ error }) => {
    console.error(error)
}

createClientSentryInit(() => import('$env/dynamic/public'))
