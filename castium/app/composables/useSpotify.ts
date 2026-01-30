export const useSpotify = () => {
    const config = useRuntimeConfig()
    const accessToken = useState<string | null>('spotify_access_token', () => null)
    const refreshToken = useState<string | null>('spotify_refresh_token', () => null)

    const getAuthUrl = () => {
        const clientId = config.public.spotifyClientId
        const redirectUri = config.public.spotifyRedirectUri
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

        return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`
    }

    const exchangeCodeForToken = async (code: string) => {
        try {
            const response = await $fetch('/api/spotify/token', {
                method: 'POST',
                body: { code },
            })
            accessToken.value = response.access_token
            refreshToken.value = response.refresh_token
            return response
        } catch (error) {
            console.error('Error exchanging code for token:', error)
            throw error
        }
    }

    const fetchFromSpotify = async (endpoint: string, options: any = {}) => {
        if (!accessToken.value) throw new Error('No access token available')

        const url = `https://api.spotify.com/v1${endpoint}`

        console.log('[Spotify fetch] URL:', url)
        if (options.query) console.log('[Spotify fetch] query:', options.query)

        return $fetch(url, {
            method: options.method,
            body: options.body,
            query: options.query,
            headers: {
                Authorization: `Bearer ${accessToken.value}`,
                ...options.headers,
            },
        })
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

    const getFeaturedPlaylists = async () => {
        return fetchFromSpotify('/browse/featured-playlists?locale=fr_FR')
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

    const isAuthenticated = computed(() => !!accessToken.value)

    return {
        getAuthUrl,
        exchangeCodeForToken,
        getCurrentUser,
        getUserPlaylists,
        getPlaylist,
        getFeaturedPlaylists,
        search,
        play,
        pause,
        next,
        previous,
        isAuthenticated,
    }
}
