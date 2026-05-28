type ClientSentryConfig = {
    environment?: string
    tracesSampleRate?: number
    replaysSessionSampleRate?: number
    replaysOnErrorSampleRate?: number
}

export const createClientSentryInit = (
    importEnv: () => Promise<{ env: Record<string, string | undefined> }>,
    config: ClientSentryConfig = {}
) => {
    const schedule =
        'requestIdleCallback' in window
            ? window.requestIdleCallback
            : (callback: IdleRequestCallback) => window.setTimeout(callback, 3000)

    schedule(async () => {
        try {
            const [Sentry, { env }] = await Promise.all([import('@sentry/sveltekit'), importEnv()])

            Sentry.init({
                dsn: env.PUBLIC_SENTRY_DSN,
                environment: config.environment ?? 'local',
                tracesSampleRate: config.tracesSampleRate ?? 1.0,
                replaysSessionSampleRate: config.replaysSessionSampleRate ?? 0.01,
                replaysOnErrorSampleRate: config.replaysOnErrorSampleRate ?? 1.0,
                integrations: [Sentry.replayIntegration()]
            })
        } catch (error) {
            console.warn('Sentry initialization failed:', error)
        }
    })
}
