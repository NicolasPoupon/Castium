export default defineNuxtRouteMiddleware(async (to) => {
    const publicRoutes = [
        '/',
        '/auth/login',
        '/auth/signup',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/callback',
        '/auth/spotify/callback',
    ]

    const isPublicRoute = publicRoutes.includes(to.path)
    const isAppRoute = to.path.startsWith('/app')

    if (process.server) return

    await new Promise((resolve) => setTimeout(resolve, 0))

    try {
        const supabase = useSupabase()
        const {
            data: { session },
        } = await supabase.auth.getSession()
        const isLoggedIn = !!session

        // Logged in + page auth → redirect app
        if (
            isLoggedIn &&
            to.path.startsWith('/auth/') &&
            to.path !== '/auth/callback' &&
            !to.path.includes('/auth/spotify')
        ) {
            const redirect = (to.query.redirect as string) || '/app/movies'
            return navigateTo(redirect)
        }

        console.log('[auth] path', to.path, 'session', session)

        // Not logged in + /app → login
        if (!isLoggedIn && isAppRoute) {
            return navigateTo('/auth/login')
        }

        // Public routes → ok
        if (isPublicRoute) return

        // Other protected routes
        if (!isLoggedIn) {
            return navigateTo('/auth/login')
        }
    } catch (error) {
        console.error('Auth middleware error:', error)

        if (isPublicRoute) return
        return navigateTo('/auth/login')
    }
})
