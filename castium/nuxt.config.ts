import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    css: ['~/assets/css/main.css'],
    modules: ['@nuxtjs/i18n', '@nuxt/ui', '@nuxt/fonts'],
    runtimeConfig: {
        spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        public: {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
            tmdbApiKey: process.env.NUXT_PUBLIC_TMDB_API_KEY,
            spotifyClientId: process.env.NUXT_PUBLIC_SPOTIFY_CLIENT_ID,
            spotifyRedirectUri: process.env.NUXT_PUBLIC_SPOTIFY_REDIRECT_URI,
        },
    },
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
        legacy: false,
        strategy: 'no_prefix',
        defaultLocale: 'fr',
        lazy: false,
        langDir: '../locales',
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
