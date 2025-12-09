import type { User, Session } from '@supabase/supabase-js'

export const useAuth = () => {
    const supabase = useSupabase()
    const router = useRouter()
    const toast = useToast()
    const { t } = useI18n()

    const user = useState<User | null>('auth_user', () => null)
    const session = useState<Session | null>('auth_session', () => null)
    const loading = useState<boolean>('auth_loading', () => false)

    // Initialize auth state
    const initAuth = async () => {
        try {
            loading.value = true
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            session.value = currentSession
            user.value = currentSession?.user ?? null

            // Listen for auth changes
            supabase.auth.onAuthStateChange((_event, newSession) => {
                session.value = newSession
                user.value = newSession?.user ?? null
            })
        } catch (error) {
            console.error('Error initializing auth:', error)
        } finally {
            loading.value = false
        }
    }

    // Sign in with email and password
    const signIn = async (email: string, password: string) => {
        try {
            loading.value = true
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            session.value = data.session
            user.value = data.user
            return { data, error: null }
        } catch (error: any) {
            console.error('Sign in error:', error)
            return { data: null, error }
        } finally {
            loading.value = false
        }
    }

    // Sign up with email and password
    const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
        try {
            loading.value = true
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata,
                },
            })

            if (error) throw error

            return { data, error: null }
        } catch (error: any) {
            console.error('Sign up error:', error)
            return { data: null, error }
        } finally {
            loading.value = false
        }
    }

    // Sign in with Google
    const signInWithGoogle = async () => {
        try {
            loading.value = true
            let origin = ''
            if (process.client) {
                origin = window.location.origin
            } else {
                const requestURL = useRequestURL()
                origin = `${requestURL.protocol}//${requestURL.host}`
            }
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${origin}/auth/callback`,
                },
            })

            if (error) throw error

            return { data, error: null }
        } catch (error: any) {
            console.error('Google sign in error:', error)
            return { data: null, error }
        } finally {
            loading.value = false
        }
    }

    // Sign out
    const signOut = async () => {
        try {
            loading.value = true
            const { error } = await supabase.auth.signOut()

            if (error) throw error

            session.value = null
            user.value = null
            await router.push('/auth/login')
        } catch (error: any) {
            console.error('Sign out error:', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    // Reset password
    const resetPassword = async (email: string) => {
        try {
            loading.value = true
            let origin = ''
            if (process.client) {
                origin = window.location.origin
            } else {
                const requestURL = useRequestURL()
                origin = `${requestURL.protocol}//${requestURL.host}`
            }
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${origin}/auth/reset-password`,
            })

            if (error) throw error

            return { data, error: null }
        } catch (error: any) {
            console.error('Reset password error:', error)
            return { data: null, error }
        } finally {
            loading.value = false
        }
    }

    // Update password
    const updatePassword = async (newPassword: string) => {
        try {
            loading.value = true
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword,
            })

            if (error) throw error

            return { data, error: null }
        } catch (error: any) {
            console.error('Update password error:', error)
            return { data: null, error }
        } finally {
            loading.value = false
        }
    }

    // Check if user is authenticated
    const isAuthenticated = computed(() => !!user.value)

    return {
        user: readonly(user),
        session: readonly(session),
        loading: readonly(loading),
        isAuthenticated,
        initAuth,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
    }
}

