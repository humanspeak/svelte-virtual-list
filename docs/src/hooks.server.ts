import { env } from '$env/dynamic/public'
import { createSecurityHeadersHandle } from '@humanspeak/docs-kit/hooks'
import * as Sentry from '@sentry/cloudflare'
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

const sentryHandle: Handle = ({ event, resolve }) => {
    return Sentry.wrapRequestHandler(
        {
            options: {
                dsn: env.PUBLIC_SENTRY_DSN,
                environment: env.PUBLIC_ENVIRONMENT ?? 'local',
                tracesSampleRate: 1.0
            },
            request: event.request,
            context: event.platform?.ctx
        },
        () => resolve(event)
    )
}

export const handle: Handle = sequence(sentryHandle, createSecurityHeadersHandle())
