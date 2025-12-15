export default defineNuxtRouteMiddleware(async (to) => {
    // List of public routes that don't require authentication
    const publicRoutes = [
        '/',
        '/auth/login',
        '/auth/signup',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/callback',
        '/auth/spotify/callback'
    ]

    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => {
        if (to.path === route) return true
        return false
    })

    // Check if route starts with /app (protected area)
    const isAppRoute = to.path.startsWith('/app')

    try {
        const supabase = useSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        const isLoggedIn = !!session

        // If user is logged in and tries to access auth pages (except callback), redirect to app
        if (isLoggedIn && to.path.startsWith('/auth/') && to.path !== '/auth/callback' && !to.path.includes('/auth/spotify')) {
            return navigateTo('/app/movies')
        }

        // If user is not logged in and tries to access /app routes, redirect to login
        if (!isLoggedIn && isAppRoute) {
            return navigateTo('/auth/login')
        }

        // Allow access to public routes for everyone
        if (isPublicRoute) {
            return
        }

        // For any other non-public route, require authentication
        if (!isLoggedIn && !isPublicRoute) {
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

