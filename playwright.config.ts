import { defineConfig, devices } from '@playwright/test'

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
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    // Lower the default per-test timeout to speed up failures in CI
    timeout: 30000,
    // Make CI a bit more forgiving for transient issues
    retries: process.env.CI ? 1 : 0,
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
            use: { ...devices['Pixel 5'] }
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 12'] }
        }
    ]
})
