import type { User, Session } from '@supabase/supabase-js'

export interface UserProfile {
    id: string
    username: string
    email: string
    language: string
    video_folder_path: string | null
    video_files: any[] | null
    video_watching: Record<string, number> | null
    video_watched: string[] | null
    video_favorites: string[] | null
    video_ratings: Record<string, { rating: number; comment: string; createdAt: string }> | null
    cloud_video_ratings: Record<string, { rating: number; comment: string }> | null
    cloud_video_playlists: string[] | null
    cloud_video_watching: Record<string, number> | null
    cloud_video_favorites: string[] | null
    created_at: string
    updated_at: string
}

export const useAuth = () => {
    const supabase = useSupabase()
    const router = useRouter()

    const user = useState<User | null>('auth_user', () => null)
    const session = useState<Session | null>('auth_session', () => null)
    const profile = useState<UserProfile | null>('auth_profile', () => null)
    const loading = useState<boolean>('auth_loading', () => false)
    const initialized = useState<boolean>('auth_initialized', () => false)

    // Fetch user profile from database
    const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
                return null
            }
            return data as UserProfile
        } catch (error) {
            console.error('Error fetching profile:', error)
            return null
        }
    }

    // Update user profile
    const updateProfile = async (
        updates: Partial<UserProfile>
    ): Promise<{ data: UserProfile | null; error: any }> => {
        if (!user.value) return { data: null, error: new Error('Not authenticated') }

        try {
            const { data, error } = await (supabase as any)
                .from('profiles')
                .update(updates)
                .eq('id', user.value.id)
                .select()
                .single()

            if (error) throw error

            profile.value = data as UserProfile
            return { data: data as UserProfile, error: null }
        } catch (error: any) {
            console.error('Update profile error:', error)
            return { data: null, error }
        }
    }

    // Initialize auth state
    const initAuth = async () => {
        if (initialized.value) return

        try {
            loading.value = true
            const {
                data: { session: currentSession },
            } = await supabase.auth.getSession()
            session.value = currentSession
            user.value = currentSession?.user ?? null

            if (currentSession?.user) {
                profile.value = await fetchProfile(currentSession.user.id)
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (event, newSession) => {
                session.value = newSession
                user.value = newSession?.user ?? null

                if (event === 'SIGNED_IN' && newSession?.user) {
                    // Small delay to let the trigger create the profile
                    await new Promise((resolve) => setTimeout(resolve, 500))
                    profile.value = await fetchProfile(newSession.user.id)
                } else if (event === 'SIGNED_OUT') {
                    profile.value = null
                }
            })

            initialized.value = true
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
                profile.value = await fetchProfile(data.user.id)
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

            // Profile will be created automatically by trigger
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

            // Clear local composables state before resetting user
            // This ensures folder handles and tracks are cleared per user
            try {
                const { clearLocalState: clearMusicState } = useLocalMusic()
                clearMusicState()
            } catch (e) {
                console.warn('Could not clear music state:', e)
            }

            try {
                const { clearLocalState: clearVideosState } = useLocalVideos()
                clearVideosState()
            } catch (e) {
                console.warn('Could not clear videos state:', e)
            }

            session.value = null
            user.value = null
            profile.value = null

            // Use navigateTo for Nuxt compatibility
            await navigateTo('/auth/login')
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

    // Verify current password by attempting re-authentication
    const verifyPassword = async (password: string) => {
        if (!user.value?.email) return { success: false, error: new Error('No user email') }

        try {
            loading.value = true
            const { error } = await supabase.auth.signInWithPassword({
                email: user.value.email,
                password,
            })

            if (error) return { success: false, error }
            return { success: true, error: null }
        } catch (error: any) {
            return { success: false, error }
        } finally {
            loading.value = false
        }
    }

    // Update user metadata (username, etc.)
    const updateUserMetadata = async (metadata: Record<string, any>) => {
        try {
            loading.value = true
            const { data, error } = await supabase.auth.updateUser({
                data: metadata,
            })

            if (error) throw error

            // Update local user state
            if (data.user) {
                user.value = data.user
            }

            return { data, error: null }
        } catch (error: any) {
            console.error('Update user metadata error:', error)
            return { data: null, error }
        } finally {
            loading.value = false
        }
    }

    // Check if user is authenticated
    const isAuthenticated = computed(() => !!user.value && !!session.value)

    return {
        user: readonly(user),
        session: readonly(session),
        profile: readonly(profile),
        loading: readonly(loading),
        initialized: readonly(initialized),
        isAuthenticated,
        initAuth,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        verifyPassword,
        updateUserMetadata,
        updateProfile,
        fetchProfile,
    }
}
