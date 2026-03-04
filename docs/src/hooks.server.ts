import { env } from '$env/dynamic/public'
import { createSecurityHeadersHandle, createSentryHandle } from '@humanspeak/docs-kit/hooks'
import { initCloudflareSentryHandle, sentryHandle } from '@sentry/sveltekit'
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

const sentryHandles = createSentryHandle(initCloudflareSentryHandle, sentryHandle, {
    dsn: env.PUBLIC_SENTRY_DSN,
    environment: env.PUBLIC_ENVIRONMENT ?? 'local'
})

export const handle: Handle = sequence(...sentryHandles, createSecurityHeadersHandle())
