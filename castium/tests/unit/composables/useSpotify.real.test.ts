import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'

describe('useSpotify (real composable)', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
        localStorage.clear()
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const state = new Map<string, ReturnType<typeof ref<any>>>()
        vi.stubGlobal('useState', <T>(key: string, init?: () => T) => {
            if (!state.has(key)) {
                state.set(key, ref(init ? init() : null))
            }
            return state.get(key)!
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const stubRuntime = (overrides: Record<string, any> = {}) => {
        vi.stubGlobal('useRuntimeConfig', () => ({
            public: {
                spotifyClientId: 'spotify-client-id',
                spotifyRedirectUri: 'https://castium.app/auth/spotify/callback',
                ...overrides,
            },
        }))
    }

    it('builds a valid Spotify auth URL', async () => {
        stubRuntime()
        vi.stubGlobal('$fetch', vi.fn())

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()
        const url = spotify.getAuthUrl()

        expect(url).toContain('https://accounts.spotify.com/authorize?')
        expect(url).toContain('client_id=spotify-client-id')
        expect(url).toContain('response_type=code')
        expect(url).toContain(
            encodeURIComponent('https://castium.app/auth/spotify/callback')
        )
    })

    it('throws when OAuth config is incomplete', async () => {
        stubRuntime({ spotifyClientId: '', spotifyRedirectUri: '' })
        vi.stubGlobal('$fetch', vi.fn())

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()

        expect(() => spotify.getAuthUrl()).toThrow(/not configured correctly/)
    })

    it('exchanges code for token and marks authenticated', async () => {
        stubRuntime()
        const fetchMock = vi.fn().mockResolvedValue({
            access_token: 'token-123',
            refresh_token: 'refresh-456',
            expires_in: 3600,
        })
        vi.stubGlobal('$fetch', fetchMock)

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()
        const response = await spotify.exchangeCodeForToken('auth-code')

        expect(response.access_token).toBe('token-123')
        expect(spotify.accessToken.value).toBe('token-123')
        expect(spotify.isAuthenticated.value).toBe(true)
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/spotify/token',
            expect.objectContaining({
                method: 'POST',
                body: expect.objectContaining({
                    code: 'auth-code',
                    redirectUri: 'https://castium.app/auth/spotify/callback',
                }),
            })
        )
    })

    it('throws when authorization code is missing', async () => {
        stubRuntime()
        vi.stubGlobal('$fetch', vi.fn())

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()

        await expect(spotify.exchangeCodeForToken('')).rejects.toThrow(/code is missing/)
    })

    it('clears auth state on token exchange failure', async () => {
        stubRuntime()
        const fetchMock = vi.fn().mockRejectedValue(new Error('exchange failed'))
        vi.stubGlobal('$fetch', fetchMock)

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()

        await expect(spotify.exchangeCodeForToken('auth-code')).rejects.toThrow('exchange failed')
        expect(spotify.accessToken.value).toBeNull()
        expect(spotify.isAuthenticated.value).toBe(false)
    })

    it('rejects API calls when no token is available', async () => {
        stubRuntime()
        vi.stubGlobal('$fetch', vi.fn())

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()

        await expect(spotify.getCurrentUser()).rejects.toThrow(/No valid Spotify access token/)
    })

    it('covers Spotify API wrappers including pagination and clamped volume', async () => {
        stubRuntime()
        const fetchMock = vi.fn()
        fetchMock
            .mockResolvedValueOnce({
                access_token: 'api-token',
                refresh_token: 'api-refresh',
                expires_in: 3600,
            }) // exchangeCodeForToken
            .mockResolvedValueOnce({ id: 'me' }) // getCurrentUser
            .mockResolvedValueOnce({ items: [{ id: 'p1' }] }) // getUserPlaylists
            .mockResolvedValueOnce({ id: 'playlist' }) // getPlaylist
            .mockResolvedValueOnce({
                items: [{ track: { id: 't1' } }, { track: { id: 't2' } }],
                next: 'next-page',
            }) // getPlaylistTracks page 1
            .mockResolvedValueOnce({
                items: [{ track: { id: 't3' } }],
                next: null,
            }) // getPlaylistTracks page 2
            .mockResolvedValueOnce({ playlists: { items: [] } }) // featured
            .mockResolvedValueOnce({ tracks: { items: [] } }) // search
            .mockResolvedValueOnce({}) // play
            .mockResolvedValueOnce({}) // pause
            .mockResolvedValueOnce({}) // next
            .mockResolvedValueOnce({}) // previous
            .mockResolvedValueOnce({}) // currently playing
            .mockResolvedValueOnce({}) // playback state
            .mockResolvedValueOnce({}) // volume high -> 100
            .mockResolvedValueOnce({}) // volume low -> 0
            .mockResolvedValueOnce({}) // seek
            .mockResolvedValueOnce({ devices: [] }) // devices
            .mockResolvedValueOnce({}) // playTrack
            .mockResolvedValueOnce({ id: 'track-1' }) // track info

        vi.stubGlobal('$fetch', fetchMock)

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()

        await spotify.exchangeCodeForToken('auth-code')
        await spotify.getCurrentUser()
        await spotify.getUserPlaylists(10)
        await spotify.getPlaylist('playlist-id')
        const tracks = await spotify.getPlaylistTracks('playlist-id', 2)
        await spotify.getFeaturedPlaylists(5)
        await spotify.search('daft punk')
        await spotify.play('spotify:album:1', ['spotify:track:1'])
        await spotify.pause()
        await spotify.next()
        await spotify.previous()
        await spotify.getCurrentlyPlaying()
        await spotify.getPlaybackState()
        await spotify.setVolume(120)
        await spotify.setVolume(-10)
        await spotify.seek(3210)
        await spotify.getAvailableDevices()
        await spotify.playTrack('spotify:track:1', 'device-1')
        await spotify.getTrackInfo('track-1')

        expect(tracks).toHaveLength(3)
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/playlists/playlist-id/tracks'),
            expect.objectContaining({ query: expect.objectContaining({ offset: 0, limit: 2 }) })
        )
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/playlists/playlist-id/tracks'),
            expect.objectContaining({ query: expect.objectContaining({ offset: 2, limit: 2 }) })
        )
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/me/player/volume?volume_percent=100'),
            expect.any(Object)
        )
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/me/player/volume?volume_percent=0'),
            expect.any(Object)
        )
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/me/player/play?device_id=device-1'),
            expect.objectContaining({
                method: 'PUT',
                body: { uris: ['spotify:track:1'] },
            })
        )
    })

    it('clears auth on Spotify 401 responses', async () => {
        stubRuntime()
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                access_token: 'api-token',
                refresh_token: 'api-refresh',
                expires_in: 3600,
            })
            .mockRejectedValueOnce({ status: 401 })

        vi.stubGlobal('$fetch', fetchMock)

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()
        await spotify.exchangeCodeForToken('auth-code')
        expect(spotify.accessToken.value).toBe('api-token')

        await expect(spotify.getCurrentUser()).rejects.toEqual({ status: 401 })
        expect(spotify.accessToken.value).toBeNull()
    })

    it('clearAuth resets auth state', async () => {
        stubRuntime()
        const fetchMock = vi.fn().mockResolvedValue({
            access_token: 'token-before-clear',
            refresh_token: 'refresh',
            expires_in: 3600,
        })
        vi.stubGlobal('$fetch', fetchMock)

        const { useSpotify } = await import('~/composables/useSpotify')
        const spotify = useSpotify()
        await spotify.exchangeCodeForToken('auth-code')
        expect(spotify.accessToken.value).toBe('token-before-clear')

        spotify.clearAuth()
        expect(spotify.accessToken.value).toBeNull()
        expect(spotify.isAuthenticated.value).toBe(false)
    })
})
