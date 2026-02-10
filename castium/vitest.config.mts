import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
        setupFiles: ['tests/test-setup.ts'],
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary', 'json'],
            reportsDirectory: './coverage',
            include: ['app/**/*.{ts,vue}'],
            exclude: [
                'app/**/*.d.ts',
                'app/**/*.test.ts',
                'app/**/*.spec.ts',
            ],
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './app'),
            '~': resolve(__dirname, './app'),
            '#build': resolve(__dirname, './.nuxt'),
            '#imports': resolve(__dirname, './.nuxt'),
        },
    },
})
