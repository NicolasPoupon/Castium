// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    css: ["~/assets/css/main.css"],
    modules: ["@nuxtjs/tailwindcss"],

    vite: {
        server: {
            host: "0.0.0.0",
            port: 3000,
            watch: {
                usePolling: true,
                interval: 100,
            },
        },
    },
})
