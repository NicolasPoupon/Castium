export default defineNuxtRouteMiddleware(async (to) => {
    // List of public routes that don't require authentication
    const publicRoutes = [
        '/',
        '/auth/login',
        '/auth/signup',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/callback',
        '/auth/spotify/callback',
    ]

    // Check if the route is public
    const isPublicRoute = publicRoutes.some((route) => to.path === route)

    // Check if route starts with /app (protected area)
    const isAppRoute = to.path.startsWith('/app')

    // Only run on client side to avoid hydration issues
    if (import.meta.server) {
        return
    }

    // Handle OAuth callback tokens in hash (redirect to callback page)
    // This happens when Supabase redirects to root with tokens in hash
    if (to.path === '/' && to.hash && to.hash.includes('access_token=')) {
        // Redirect to callback page with the hash preserved
        return navigateTo('/auth/callback' + to.hash)
    }

    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4ad510bf-c1d6-40db-ba0b-8358497276ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.global.ts:middleware',message:'middleware run',data:{toPath:to.path},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        const { isAuthenticated, initialized, initAuth } = useAuth()

        // Ensure auth is initialized
        if (!initialized.value) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4ad510bf-c1d6-40db-ba0b-8358497276ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.global.ts:callInitAuth',message:'calling initAuth from middleware',data:{},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            await initAuth()
        }

        // Wait for auth to be fully initialized
        let attempts = 0
        while (!initialized.value && attempts < 100) {
            await new Promise((resolve) => setTimeout(resolve, 50))
            attempts++
        }

        const loggedIn = isAuthenticated.value

        // If user is logged in and tries to access auth pages (except callback & reset-password), redirect to app
        if (
            loggedIn &&
            to.path.startsWith('/auth/') &&
            to.path !== '/auth/callback' &&
            to.path !== '/auth/reset-password' &&
            !to.path.includes('/auth/spotify')
        ) {
            return navigateTo('/app/movies')
        }

        // If user is not logged in and tries to access /app routes, redirect to login
        if (!loggedIn && isAppRoute) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4ad510bf-c1d6-40db-ba0b-8358497276ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.global.ts:navigateTo',message:'navigateTo /auth/login',data:{reason:'isAppRoute'},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            return navigateTo('/auth/login')
        }

        // Allow access to public routes for everyone
        if (isPublicRoute) {
            return
        }

        // For any other non-public route, require authentication
        if (!loggedIn && !isPublicRoute) {
            return navigateTo('/auth/login')
        }
    } catch (error) {
        console.error('Auth middleware error:', error)

        // If it's a public route, allow access even if auth check failed
        if (isPublicRoute) {
            return
        }

        // If it's a protected route and auth failed, redirect to login
        return navigateTo('/auth/login')
    }
})
