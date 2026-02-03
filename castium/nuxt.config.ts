import { defineNuxtConfig } from "nuxt/config"
import fs from "node:fs"
import path from "node:path"

const isDev = process.env.NODE_ENV === "development"
const devServerConfig: any = {
    host: "localhost",
    port: 3000,
}

if (isDev) {
    try {
        const certDir = path.dirname(new URL(import.meta.url).pathname)
        const keyFile = path.join(certDir, "localhost+2-key.pem")
        const certFile = path.join(certDir, "localhost+2.pem")

        devServerConfig.https = {
            key: fs.readFileSync(keyFile, "utf-8"),
            cert: fs.readFileSync(certFile, "utf-8"),
        }
        console.log("✓ HTTPS certificates loaded")
    } catch (e) {
        console.log("⚠ HTTPS certificates not found, using plain HTTP")
        // Remove https config if certificates not found
        delete devServerConfig.https
    }
}

export default defineNuxtConfig({
    ssr: false,
    devServer: devServerConfig,
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    css: ["~/assets/css/main.css"],
    modules: ["@nuxtjs/i18n", "@nuxt/ui", "@nuxt/fonts"],
    runtimeConfig: {
        spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,
        public: {
            supabaseUrl:
                process.env.NUXT_PUBLIC_SUPABASE_URL ||
                process.env.SUPABASE_URL,
            supabaseAnonKey:
                process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
                process.env.SUPABASE_ANON_KEY,
            tmdbApiKey: process.env.NUXT_PUBLIC_TMDB_API_KEY,
            spotifyClientId: process.env.NUXT_PUBLIC_SPOTIFY_CLIENT_ID,
            spotifyRedirectUri: process.env.NUXT_PUBLIC_SPOTIFY_REDIRECT_URI,
            youtubeClientId: process.env.NUXT_PUBLIC_YOUTUBE_CLIENT_ID,
            youtubeRedirectUri: process.env.NUXT_PUBLIC_YOUTUBE_REDIRECT_URI,
        },
    },
    postcss: {
        plugins: {
            "@tailwindcss/postcss": {},
            autoprefixer: {},
        },
    },
    fonts: {
        families: [
            {
                name: "DM Sans",
                provider: "google",
                weights: [300, 400, 500, 600, 700],
            },
        ],
    },
    i18n: {
        legacy: false,
        strategy: "no_prefix",
        defaultLocale: "fr",
        lazy: false,
        langDir: "../locales",
        locales: [
            { code: "en", name: "English", file: "en.json" },
            { code: "fr", name: "Français", file: "fr.json" },
            { code: "pl", name: "Polski", file: "pl.json" },
        ],
    },
    vite: {
        ssr: {
            noExternal: ["@supabase/supabase-js"],
        },
        server: {
            host: "localhost",
            port: 3000,
            watch: {
                usePolling: true,
                interval: 100,
            },
        },
    },
    nitro: {
        externals: {
            inline: ["@supabase/supabase-js"],
        },
    },
    typescript: {
        strict: false,
    },
    components: {
        dirs: [
            {
                path: "~/components",
            },
        ],
    },
})
