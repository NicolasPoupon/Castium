export default defineNuxtPlugin({
    name: 'auth',
    enforce: 'pre',
    async setup() {
        // #region agent log
        // #endregion
        const { initAuth } = useAuth()
        await initAuth()
    },
})
