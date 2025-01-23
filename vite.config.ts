import { sveltekit } from '@sveltejs/kit/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [sveltekit(), svelteTesting()],
    resolve: process.env.VITEST
        ? {
              conditions: ['browser']
          }
        : undefined,
    test: {
        include: ['src/**/*.test.ts'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['vitest.setup.ts'],
        coverage: {
            reporter: 'lcov',
            exclude: ['docs/**', '.trunk/**', '.svelte-kit/**', 'tests/**', 'src/routes/**']
        },
        exclude: [...configDefaults.exclude, '**/docs/**/*'],
        reporters: ['verbose', ['junit', { outputFile: './junit-vitest.xml' }]]
    },
    build: {
        sourcemap: true
    }
})
