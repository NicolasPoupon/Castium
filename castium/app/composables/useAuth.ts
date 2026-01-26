import type { User, Session } from '@supabase/supabase-js'

export const useAuth = () => {
    const supabase = useSupabase()
    const router = useRouter()


    const user = useState<User | null>('auth_user', () => null)
    const session = useState<Session | null>('auth_session', () => null)
    const loading = useState<boolean>('auth_loading', () => false)
    const profile = useState<any | null>('auth_profile', () => null)

    // Fetch user profile
    const fetchProfile = async () => {
        if (!user.value) return
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.value.id)
                .single()
            if (error) throw error
            profile.value = data
        } catch (error) {
            console.error('Error fetching profile:', error)
            profile.value = null
        }
    }

    // Ensure profile exists, create if not
    const ensureProfile = async () => {
        if (!user.value) return
        try {
            // Try to fetch profile
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.value.id)
                .single()
            if (data) {
                profile.value = data
                return
            }
            // If not found, create profile
            const username = user.value.user_metadata?.username || user.value.email?.split('@')[0] || 'user'
            const language = user.value.user_metadata?.language || 'fr'
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    id: user.value.id,
                    username,
                    language,
                }])
                .select()
                .single()
            if (insertError) throw insertError
            profile.value = newProfile
        } catch (error) {
            console.error('Error ensuring profile:', error)
            profile.value = null
        }
    }

    // Initialize auth state
    const initAuth = async () => {
        try {
            loading.value = true
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            session.value = currentSession
            user.value = currentSession?.user ?? null

            if (user.value) {
                await ensureProfile()
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (_event, newSession) => {
                session.value = newSession
                user.value = newSession?.user ?? null
                if (user.value) {
                    await ensureProfile()
                } else {
                    profile.value = null
                }
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
            if (data.user) {
                await ensureProfile()
            }
            return { data, error: null }
        } catch (error: any) {
            console.error('Sign in error:', error)
            return { data: null, error }
        } finally {
            loading.value = false
        }
    }

    // Sign up with email and password
    const signUp = async (email: string, password: string, username: string, language: string = 'fr', metadata?: Record<string, any>) => {
        try {
            loading.value = true
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { ...metadata, username, language },
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
            profile.value = null
            await router.push('/')
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
        profile: readonly(profile),
        loading: readonly(loading),
        isAuthenticated,
        initAuth,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        fetchProfile,
    }
}
