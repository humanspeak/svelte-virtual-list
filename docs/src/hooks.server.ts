import { env } from '$env/dynamic/public'
import { initCloudflareSentryHandle, sentryHandle } from '@sentry/sveltekit'
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
    const response = await resolve(event)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=()'
    )
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    )
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    return response
}

export const fullSentryHandle = sequence(
    initCloudflareSentryHandle({
        environment: env.PUBLIC_ENVIRONMENT ?? 'local',
        dsn: env.PUBLIC_SENTRY_DSN,
        // Adds request headers and IP for users, for more info visit:
        // https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
        sendDefaultPii: true,
        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for tracing.
        // We recommend adjusting this value in production
        // Learn more at
        // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
        tracesSampleRate: 1.0,
        // Enable logs to be sent to Sentry
        enableLogs: true
    }),
    sentryHandle()
)

export const handle: Handle = sequence(fullSentryHandle, handleSecurityHeaders)
