interface SpotifyTokenResponse {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
}

interface SpotifyStoredTokens {
    accessToken: string
    refreshToken: string | null
    expiresAt: number | null
}

const SPOTIFY_STORAGE_KEY = 'castium-spotify-tokens'
const TOKEN_EXPIRY_BUFFER_MS = 60_000

export const useSpotify = () => {
    const config = useRuntimeConfig()
    const accessToken = useState<string | null>('spotify_access_token', () => null)
    const refreshToken = useState<string | null>('spotify_refresh_token', () => null)
    const expiresAt = useState<number | null>('spotify_expires_at', () => null)

    const getRedirectUri = () => {
        if (config.public.spotifyRedirectUri) return config.public.spotifyRedirectUri
        if (import.meta.client) return `${window.location.origin}/auth/spotify/callback`
        return ''
    }

    const isTokenExpired = () => {
        if (!expiresAt.value) return false
        return Date.now() >= expiresAt.value - TOKEN_EXPIRY_BUFFER_MS
    }

    const clearAuth = () => {
        accessToken.value = null
        refreshToken.value = null
        expiresAt.value = null
        if (import.meta.client) {
            localStorage.removeItem(SPOTIFY_STORAGE_KEY)
        }
    }

    const persistTokens = () => {
        if (import.meta.server) return
        if (!accessToken.value) {
            localStorage.removeItem(SPOTIFY_STORAGE_KEY)
            return
        }

        const payload: SpotifyStoredTokens = {
            accessToken: accessToken.value,
            refreshToken: refreshToken.value,
            expiresAt: expiresAt.value,
        }
        localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify(payload))
    }

    const restoreStoredTokens = () => {
        if (import.meta.server || accessToken.value) return
        const stored = localStorage.getItem(SPOTIFY_STORAGE_KEY)
        if (!stored) return

        try {
            const parsed = JSON.parse(stored) as Partial<SpotifyStoredTokens>
            if (!parsed.accessToken) {
                clearAuth()
                return
            }
            accessToken.value = parsed.accessToken
            refreshToken.value = parsed.refreshToken || null
            expiresAt.value = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null

            if (isTokenExpired()) {
                clearAuth()
            }
        } catch {
            clearAuth()
        }
    }

    if (import.meta.client) {
        restoreStoredTokens()
    }

    const getAuthUrl = () => {
        const clientId = config.public.spotifyClientId
        const redirectUri = getRedirectUri()
        if (!clientId || !redirectUri) {
            throw new Error('Spotify OAuth is not configured correctly')
        }

        const scopes = [
            'user-read-private',
            'user-read-email',
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            'playlist-read-private',
            'playlist-read-collaborative',
            'user-library-read',
            'streaming',
        ].join(' ')

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: scopes,
            show_dialog: 'true',
        })

        return `https://accounts.spotify.com/authorize?${params.toString()}`
    }

    const exchangeCodeForToken = async (code: string) => {
        if (!code) {
            throw new Error('Authorization code is missing')
        }

        const redirectUri = getRedirectUri()
        try {
            const response = await $fetch<SpotifyTokenResponse>('/api/spotify/token', {
                method: 'POST',
                body: { code, redirectUri },
            })

            if (!response?.access_token) {
                throw new Error('Spotify token exchange did not return an access token')
            }

            accessToken.value = response.access_token
            refreshToken.value = response.refresh_token || null
            expiresAt.value = response.expires_in ? Date.now() + response.expires_in * 1000 : null
            persistTokens()
            return response
        } catch (error) {
            console.error('Error exchanging code for token:', error)
            clearAuth()
            throw error
        }
    }

    const fetchFromSpotify = async <T = any>(endpoint: string, options: any = {}): Promise<T> => {
        restoreStoredTokens()
        if (!accessToken.value || isTokenExpired()) {
            clearAuth()
            throw new Error('No valid Spotify access token available')
        }

        const url = `https://api.spotify.com/v1${endpoint}`

        try {
            return await $fetch<T>(url, {
                method: options.method || (options.body ? 'POST' : 'GET'),
                body: options.body,
                query: options.query,
                headers: {
                    Authorization: `Bearer ${accessToken.value}`,
                    ...options.headers,
                },
            })
        } catch (error: any) {
            if (error?.status === 401) {
                clearAuth()
            }
            throw error
        }
    }

    const getCurrentUser = async () => {
        return fetchFromSpotify('/me')
    }

    const getUserPlaylists = async (limit: number = 20) => {
        return fetchFromSpotify(`/me/playlists?limit=${limit}`)
    }

    const getPlaylist = async (playlistId: string) => {
        return fetchFromSpotify(`/playlists/${playlistId}`)
    }

    const getPlaylistTracks = async (playlistId: string, limit: number = 100) => {
        const tracks: any[] = []
        let offset = 0
        const pageSize = Math.min(100, Math.max(1, limit))

        while (true) {
            const page = await fetchFromSpotify<any>(`/playlists/${playlistId}/tracks`, {
                query: {
                    limit: pageSize,
                    offset,
                    market: 'from_token',
                },
            })

            const items = page?.items || []
            tracks.push(...items)

            if (!page?.next || items.length === 0) {
                break
            }
            offset += items.length
        }

        return tracks
    }

    const getFeaturedPlaylists = async (limit: number = 20) => {
        return fetchFromSpotify('/browse/featured-playlists', {
            query: { limit },
        })
    }

    const search = async (query: string, type: string = 'track,album,artist,playlist') => {
        return fetchFromSpotify(`/search?q=${encodeURIComponent(query)}&type=${type}&limit=20`)
    }

    const play = async (contextUri?: string, uris?: string[]) => {
        const body: any = {}
        if (contextUri) body.context_uri = contextUri
        if (uris) body.uris = uris

        return fetchFromSpotify('/me/player/play', {
            method: 'PUT',
            body,
        })
    }

    const pause = async () => {
        return fetchFromSpotify('/me/player/pause', {
            method: 'PUT',
        })
    }

    const next = async () => {
        return fetchFromSpotify('/me/player/next', {
            method: 'POST',
        })
    }

    const previous = async () => {
        return fetchFromSpotify('/me/player/previous', {
            method: 'POST',
        })
    }

    const getCurrentlyPlaying = async () => {
        return fetchFromSpotify('/me/player/currently-playing')
    }

    const getPlaybackState = async () => {
        return fetchFromSpotify('/me/player')
    }

    const setVolume = async (volumePercent: number) => {
        return fetchFromSpotify(
            `/me/player/volume?volume_percent=${Math.min(100, Math.max(0, volumePercent))}`,
            {
                method: 'PUT',
            }
        )
    }

    const seek = async (positionMs: number) => {
        return fetchFromSpotify(`/me/player/seek?position_ms=${positionMs}`, {
            method: 'PUT',
        })
    }

    const getAvailableDevices = async () => {
        return fetchFromSpotify('/me/player/devices')
    }

    const playTrack = async (trackUri: string, deviceId?: string) => {
        const body: any = { uris: [trackUri] }
        const url = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play'
        return fetchFromSpotify(url, {
            method: 'PUT',
            body,
        })
    }

    const getTrackInfo = async (trackId: string) => {
        return fetchFromSpotify(`/tracks/${trackId}`)
    }

    const isAuthenticated = computed(() => !!accessToken.value && !isTokenExpired())

    return {
        getAuthUrl,
        exchangeCodeForToken,
        getCurrentUser,
        getUserPlaylists,
        getPlaylist,
        getPlaylistTracks,
        getFeaturedPlaylists,
        search,
        play,
        pause,
        next,
        previous,
        getCurrentlyPlaying,
        getPlaybackState,
        setVolume,
        seek,
        getAvailableDevices,
        playTrack,
        getTrackInfo,
        clearAuth,
        isAuthenticated,
        accessToken,
    }
}
