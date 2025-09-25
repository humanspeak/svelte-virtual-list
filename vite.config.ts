import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { configDefaults, defineConfig } from 'vitest/config'
export default defineConfig({
    plugins: [tailwindcss(), sveltekit(), svelteTesting()],
    server: {
        watch: {
            ignored: ['**/coverage/**']
        }
    },
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
        poolOptions: {
            threads: {
                singleThread: false,
                maxThreads: 4,
                minThreads: 1
            }
        },
        testTimeout: 10000,
        hookTimeout: 10000,
        reporters: ['verbose', ['junit', { outputFile: './junit-vitest.xml' }]]
    },
    build: {
        sourcemap: true
    }
})
