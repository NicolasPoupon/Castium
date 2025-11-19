import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },

    css: ['~/assets/css/main.css'],

    modules: ['@nuxtjs/i18n', '@nuxt/ui'],

    postcss: {
        plugins: {
            '@tailwindcss/postcss': {},
            autoprefixer: {},
        },
    },

    i18n: {
        strategy: 'prefix',
        defaultLocale: 'en',
        lazy: true,
        langDir: 'locales',
        locales: [
            { code: 'en', name: 'English', file: 'en.json' },
            { code: 'fr', name: 'Français', file: 'fr.json' },
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
})
