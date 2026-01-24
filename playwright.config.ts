import { defineConfig, devices } from '@playwright/test'

// Support passing --project via package runner that injects a standalone "--"
// Example: pnpm run test:e2e -- --project=firefox
const argProjects = process.argv
    .filter((arg) => arg.startsWith('--project='))
    .flatMap((arg) => arg.slice('--project='.length).split(','))

export default defineConfig({
    testDir: './tests',
    // Produce artifacts that are easy to collect in CI
    reporter: [
        ['junit', { outputFile: 'test-results/junit-playwright.xml' }],
        ['html', { open: 'never' }]
    ],
    webServer: {
        command: 'npm run build && npm run preview',
        port: 4173,
        timeout: 120000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe'
    },
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on-first-retry'
    },
    // Lower the default per-test timeout to speed up failures in CI
    timeout: 30000,
    // Increase expect timeout for slower CI environments
    expect: {
        timeout: 10000
    },
    // Limit parallelism to reduce flakiness from resource contention
    // Virtual list tests are resource-intensive (DOM, ResizeObserver, scroll)
    // CI uses 1 worker for maximum determinism, local uses 2 for stability
    workers: process.env.CI ? 1 : 2,
    // Don't run tests within the same file in parallel
    fullyParallel: false,
    // Make CI a bit more forgiving for transient issues
    retries: process.env.CI ? 2 : 0,
    forbidOnly: !!process.env.CI,
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 6'] }
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 15'] }
        }
    ].filter((p) => (argProjects.length ? argProjects.includes(p.name) : true))
})
