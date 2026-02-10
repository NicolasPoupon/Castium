import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'

type AuthChangeHandler = (event: string, session: any) => Promise<void> | void

const defaultProfile = {
    id: 'u1',
    username: 'user1',
    email: 'u1@example.com',
    language: 'fr',
    video_folder_path: null,
    video_files: null,
    video_watching: null,
    video_watched: null,
    video_favorites: null,
    video_ratings: null,
    cloud_video_ratings: null,
    cloud_video_playlists: null,
    cloud_video_watching: null,
    cloud_video_favorites: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

const buildSupabaseMock = () => {
    let authChangeHandler: AuthChangeHandler | null = null

    const profileSingle = vi.fn().mockResolvedValue({ data: defaultProfile, error: null })
    const profileEq = vi.fn(() => ({ single: profileSingle }))
    const profileSelect = vi.fn(() => ({ eq: profileEq }))

    const updateSingle = vi.fn().mockImplementation(async () => ({
        data: { ...defaultProfile, language: 'en' },
        error: null,
    }))
    const updateSelect = vi.fn(() => ({ single: updateSingle }))
    const updateEq = vi.fn(() => ({ select: updateSelect }))
    const profileUpdate = vi.fn(() => ({ eq: updateEq }))

    const from = vi.fn((table: string) => {
        if (table !== 'profiles') {
            throw new Error(`Unexpected table ${table}`)
        }
        return {
            select: profileSelect,
            update: profileUpdate,
        }
    })

    const getSession = vi.fn().mockResolvedValue({
        data: {
            session: {
                access_token: 'token',
                user: { id: 'u1', email: 'u1@example.com' },
            },
        },
    })
    const onAuthStateChange = vi.fn((handler: AuthChangeHandler) => {
        authChangeHandler = handler
        return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    const signInWithPassword = vi.fn().mockResolvedValue({
        data: {
            session: { access_token: 'token-2', user: { id: 'u2', email: 'u2@example.com' } },
            user: { id: 'u2', email: 'u2@example.com' },
        },
        error: null,
    })
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: 'u3' } }, error: null })
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: { provider: 'google' }, error: null })
    const signOut = vi.fn().mockResolvedValue({ error: null })
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ data: { ok: true }, error: null })
    const updateUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'u2', email: 'u2@example.com', user_metadata: { name: 'Neo' } } },
        error: null,
    })

    const supabase = {
        from,
        auth: {
            getSession,
            onAuthStateChange,
            signInWithPassword,
            signUp,
            signInWithOAuth,
            signOut,
            resetPasswordForEmail,
            updateUser,
        },
    }

    return {
        supabase,
        spies: {
            from,
            profileSingle,
            profileEq,
            profileSelect,
            profileUpdate,
            updateEq,
            updateSelect,
            updateSingle,
            getSession,
            onAuthStateChange,
            signInWithPassword,
            signUp,
            signInWithOAuth,
            signOut,
            resetPasswordForEmail,
            updateUser,
            getAuthChangeHandler: () => authChangeHandler,
        },
    }
}

describe('useAuth (real composable)', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(console, 'warn').mockImplementation(() => {})

        const state = new Map<string, ReturnType<typeof ref<any>>>()
        vi.stubGlobal('useState', <T>(key: string, init?: () => T) => {
            if (!state.has(key)) {
                state.set(key, ref(init ? init() : null))
            }
            return state.get(key)!
        })

        vi.stubGlobal('readonly', (value: unknown) => value)
        vi.stubGlobal('useRouter', () => ({ push: vi.fn(), replace: vi.fn() }))
        vi.stubGlobal('navigateTo', vi.fn(() => Promise.resolve()))
        vi.stubGlobal('useRequestURL', () => ({ protocol: 'https:', host: 'castium.test' }))
        vi.stubGlobal('useLocalMusic', () => ({ clearLocalState: vi.fn() }))
        vi.stubGlobal('useLocalVideos', () => ({ clearLocalState: vi.fn() }))
        ;(process as any).client = true
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('initializes auth state from session and handles auth state callbacks', async () => {
        const { supabase, spies } = buildSupabaseMock()
        vi.stubGlobal('useSupabase', () => supabase)

        const { useAuth } = await import('~/composables/useAuth')
        const auth = useAuth()

        await auth.initAuth()

        expect(spies.getSession).toHaveBeenCalledTimes(1)
        expect(auth.initialized.value).toBe(true)
        expect(auth.loading.value).toBe(false)
        expect(auth.user.value?.id).toBe('u1')
        expect(auth.profile.value?.id).toBe('u1')
        expect(auth.isAuthenticated.value).toBe(true)

        const handler = spies.getAuthChangeHandler()
        expect(handler).toBeTypeOf('function')

        await handler?.('PASSWORD_RECOVERY', null)
        expect(globalThis.navigateTo).toHaveBeenCalledWith('/auth/reset-password')

        await handler?.('SIGNED_OUT', null)
        expect(auth.profile.value).toBeNull()

        vi.useFakeTimers()
        const callbackPromise = handler?.('SIGNED_IN', {
            access_token: 'token-3',
            user: { id: 'u2', email: 'u2@example.com' },
        })
        await vi.runAllTimersAsync()
        await callbackPromise
        vi.useRealTimers()

        expect(auth.user.value?.id).toBe('u2')
        expect(auth.profile.value).toBeTruthy()
    })

    it('covers signIn/signUp/updateProfile/updateUserMetadata success flows', async () => {
        const { supabase, spies } = buildSupabaseMock()
        vi.stubGlobal('useSupabase', () => supabase)

        const { useAuth } = await import('~/composables/useAuth')
        const auth = useAuth()

        const signInResult = await auth.signIn('u2@example.com', 'secret')
        expect(signInResult.error).toBeNull()
        expect(auth.user.value?.id).toBe('u2')
        expect(auth.session.value?.access_token).toBe('token-2')

        const signUpResult = await auth.signUp('new@example.com', 'secret', { full_name: 'New' })
        expect(signUpResult.error).toBeNull()
        expect(spies.signUp).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'new@example.com',
                options: { data: { full_name: 'New' } },
            })
        )

        const updateProfileResult = await auth.updateProfile({ language: 'en' })
        expect(updateProfileResult.error).toBeNull()
        expect(updateProfileResult.data?.language).toBe('en')

        const metadataResult = await auth.updateUserMetadata({ name: 'Neo' })
        expect(metadataResult.error).toBeNull()
        expect(auth.user.value?.user_metadata?.name).toBe('Neo')
    })

    it('covers Google OAuth and resetPassword origin handling on client and server', async () => {
        const { supabase, spies } = buildSupabaseMock()
        vi.stubGlobal('useSupabase', () => supabase)

        const { useAuth } = await import('~/composables/useAuth')
        const auth = useAuth()

        ;(process as any).client = true
        const googleResult = await auth.signInWithGoogle()
        expect(googleResult.error).toBeNull()
        expect(spies.signInWithOAuth).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
        )

        ;(process as any).client = false
        const resetResult = await auth.resetPassword('u2@example.com')
        expect(resetResult.error).toBeNull()
        expect(spies.resetPasswordForEmail).toHaveBeenCalledWith('u2@example.com', {
            redirectTo: 'https://castium.test/auth/reset-password',
        })
    })

    it('covers signOut behavior (session missing tolerated, generic error thrown) and password helpers', async () => {
        const { supabase, spies } = buildSupabaseMock()
        const clearMusicState = vi.fn()
        const clearVideosState = vi.fn()
        vi.stubGlobal('useSupabase', () => supabase)
        vi.stubGlobal('useLocalMusic', () => ({ clearLocalState: clearMusicState }))
        vi.stubGlobal('useLocalVideos', () => ({ clearLocalState: clearVideosState }))

        const { useAuth } = await import('~/composables/useAuth')
        const auth = useAuth()
        await auth.signIn('u2@example.com', 'secret')

        spies.signOut.mockResolvedValueOnce({ error: { name: 'AuthSessionMissingError' } })
        await auth.signOut()
        expect(clearMusicState).toHaveBeenCalledTimes(1)
        expect(clearVideosState).toHaveBeenCalledTimes(1)
        expect(auth.user.value).toBeNull()
        expect(auth.session.value).toBeNull()
        expect(globalThis.navigateTo).toHaveBeenCalledWith('/auth/login')

        spies.signOut.mockResolvedValueOnce({ error: { name: 'OtherAuthError' } })
        await expect(auth.signOut()).rejects.toEqual(expect.objectContaining({ name: 'OtherAuthError' }))

        const noUserVerify = await auth.verifyPassword('secret')
        expect(noUserVerify.success).toBe(false)

        await auth.signIn('u2@example.com', 'secret')
        spies.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null })
        const verifyOk = await auth.verifyPassword('secret')
        expect(verifyOk.success).toBe(true)

        spies.updateUser.mockResolvedValueOnce({ data: { user: { id: 'u2' } }, error: null })
        const updatePwdOk = await auth.updatePassword('new-secret')
        expect(updatePwdOk.error).toBeNull()
    })

    it('covers error paths for signIn, signUp, updateProfile when unauthenticated', async () => {
        const { supabase, spies } = buildSupabaseMock()
        vi.stubGlobal('useSupabase', () => supabase)

        const { useAuth } = await import('~/composables/useAuth')
        const auth = useAuth()

        spies.signInWithPassword.mockResolvedValueOnce({ data: null, error: new Error('bad credentials') })
        const signInFail = await auth.signIn('u2@example.com', 'bad')
        expect(signInFail.data).toBeNull()
        expect(signInFail.error).toBeTruthy()

        spies.signUp.mockResolvedValueOnce({ data: null, error: new Error('sign up failed') })
        const signUpFail = await auth.signUp('new@example.com', 'pw')
        expect(signUpFail.data).toBeNull()
        expect(signUpFail.error).toBeTruthy()

        const unauthUpdate = await auth.updateProfile({ language: 'en' })
        expect(unauthUpdate.data).toBeNull()
        expect(String(unauthUpdate.error)).toContain('Not authenticated')
    })
})
