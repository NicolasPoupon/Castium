export default defineNuxtPlugin({
    name: 'auth',
    enforce: 'pre',
    async setup() {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4ad510bf-c1d6-40db-ba0b-8358497276ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.client.ts:plugin',message:'plugin calling initAuth',data:{},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        const { initAuth } = useAuth()
        await initAuth()
    },
})
