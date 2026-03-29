import type { HandleClientError } from '@sveltejs/kit'

export const handleError: HandleClientError = ({ error }) => {
    console.error(error)
}

if (typeof window !== 'undefined') {
    const schedule =
        'requestIdleCallback' in window
            ? requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 3000)

    schedule(async () => {
        const [Sentry, { env }] = await Promise.all([
            import('@sentry/sveltekit'),
            import('$env/dynamic/public')
        ])

        Sentry.init({
            dsn: env.PUBLIC_SENTRY_DSN,
            environment: env.PUBLIC_ENVIRONMENT ?? 'local',
            tracesSampleRate: 1.0,
            replaysSessionSampleRate: 0.01,
            replaysOnErrorSampleRate: 1.0,
            integrations: [Sentry.replayIntegration()]
        })
    })
}
