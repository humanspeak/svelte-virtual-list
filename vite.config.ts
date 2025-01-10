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
        coverage: { reporter: 'lcov' },
        exclude: [...configDefaults.exclude, '**/docs/**/*'],
        reporters: ['verbose', ['junit', { outputFile: './junit-vitest.xml' }]],
        // Add these configurations to handle the ESM/CommonJS interop
        deps: {
            interopDefault: true,
            inline: [/@asamuzakjp\/css-color/]
        }
    },
    build: {
        sourcemap: true
    }
})
