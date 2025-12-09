export default defineNuxtPlugin(async () => {
    if (process.client) {
        const { initAuth } = useAuth()
        await initAuth()
    }
})

