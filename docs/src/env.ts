import { defineEnvVars } from '@sveltejs/kit/env'

// Dynamic (read at runtime from wrangler.jsonc `vars` / Worker secrets). A missing
// value becomes '' — every consumer treats empty as "not configured".
export const variables = defineEnvVars({
    PUBLIC_POSTHOG_PROJECT_TOKEN: { public: true, schema: (input) => input ?? '' },
    PUBLIC_POSTHOG_HOST: { public: true, schema: (input) => input ?? '' },
    PUBLIC_SENTRY_DSN: { public: true, schema: (input) => input ?? '' }
})
