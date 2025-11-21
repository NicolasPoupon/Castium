import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    css: ['~/assets/css/main.css'],
    modules: ['@nuxtjs/i18n', '@nuxt/ui', '@nuxt/fonts'],
    postcss: {
        plugins: {
            '@tailwindcss/postcss': {},
            autoprefixer: {},
        },
    },
    fonts: {
        families: [
            {
                name: 'DM Sans',
                provider: 'google',
                weights: [300, 400, 500, 600, 700],
            },
        ],
    },
    i18n: {
        strategy: 'prefix',
        defaultLocale: 'en',
        lazy: true,
        langDir: 'locales',
        locales: [
            { code: 'en', name: 'English', file: 'en.json' },
            { code: 'fr', name: 'Français', file: 'fr.json' },
            { code: 'pl', name: 'Polski', file: 'pl.json' },
        ],
    },
    vite: {
        server: {
            host: '0.0.0.0',
            port: 3000,
            watch: {
                usePolling: true,
                interval: 100,
            },
        },
    },
    typescript: {
        strict: false,
    },
    components: {
        dirs: [
            {
                path: '~/components',
            },
        ],
    },
})
