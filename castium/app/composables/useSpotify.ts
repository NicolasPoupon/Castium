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

interface SpotifyWebPlaybackError {
    message: string
}

interface SpotifyWebPlaybackDevice {
    device_id: string
}

interface SpotifyWebPlaybackPlayerInit {
    name: string
    getOAuthToken: (callback: (token: string) => void) => void
    volume?: number
}

interface SpotifyWebPlaybackPlayer {
    connect(): Promise<boolean>
    disconnect(): void
    addListener(
        event:
            | 'ready'
            | 'not_ready'
            | 'initialization_error'
            | 'authentication_error'
            | 'account_error'
            | 'playback_error',
        callback: (payload: any) => void
    ): boolean
    activateElement?: () => Promise<void> | void
}

interface SpotifyStartPlaybackOptions {
    contextUri?: string
    trackUris?: string[]
    startIndex?: number
    positionMs?: number
}

declare global {
    interface Window {
        Spotify?: {
            Player: new (options: SpotifyWebPlaybackPlayerInit) => SpotifyWebPlaybackPlayer
        }
        onSpotifyWebPlaybackSDKReady?: () => void
    }
}

const SPOTIFY_STORAGE_KEY = 'castium-spotify-tokens'
const TOKEN_EXPIRY_BUFFER_MS = 60_000
const SPOTIFY_WEB_PLAYER_NAME = 'Castium Web Player'

let webPlaybackSdkPromise: Promise<void> | null = null
let webPlaybackPlayer: SpotifyWebPlaybackPlayer | null = null
let webPlaybackListenersBound = false

export const useSpotify = () => {
    const config = useRuntimeConfig()
    const accessToken = useState<string | null>('spotify_access_token', () => null)
    const refreshToken = useState<string | null>('spotify_refresh_token', () => null)
    const expiresAt = useState<number | null>('spotify_expires_at', () => null)
    const webPlaybackDeviceId = useState<string | null>(
        'spotify_web_playback_device_id',
        () => null
    )
    const webPlaybackReady = useState<boolean>('spotify_web_playback_ready', () => false)
    const webPlaybackConnected = useState<boolean>('spotify_web_playback_connected', () => false)
    const webPlaybackError = useState<string | null>('spotify_web_playback_error', () => null)

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
        webPlaybackDeviceId.value = null
        webPlaybackReady.value = false
        webPlaybackConnected.value = false
        webPlaybackError.value = null

        if (webPlaybackPlayer) {
            webPlaybackPlayer.disconnect()
            webPlaybackPlayer = null
            webPlaybackListenersBound = false
        }

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

    const loadWebPlaybackSdk = async () => {
        if (import.meta.server) {
            throw new Error('Spotify Web Playback est disponible uniquement dans le navigateur.')
        }

        if (window.Spotify?.Player) return
        if (webPlaybackSdkPromise) {
            await webPlaybackSdkPromise
            return
        }

        webPlaybackSdkPromise = new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById(
                'spotify-web-playback-sdk'
            ) as HTMLScriptElement | null
            const previousReadyCallback = window.onSpotifyWebPlaybackSDKReady
            let settled = false

            const resolveOnce = () => {
                if (settled) return
                settled = true
                resolve()
            }

            const rejectOnce = (reason: Error) => {
                if (settled) return
                settled = true
                reject(reason)
            }

            window.onSpotifyWebPlaybackSDKReady = () => {
                previousReadyCallback?.()
                resolveOnce()
            }

            if (!existingScript) {
                const script = document.createElement('script')
                script.id = 'spotify-web-playback-sdk'
                script.src = 'https://sdk.scdn.co/spotify-player.js'
                script.async = true
                script.onerror = () => {
                    rejectOnce(new Error('Impossible de charger le SDK Spotify Web Playback.'))
                }
                document.head.appendChild(script)
            } else {
                existingScript.addEventListener(
                    'error',
                    () => rejectOnce(new Error('Impossible de charger le SDK Spotify Web Playback.')),
                    { once: true }
                )
            }

            setTimeout(() => {
                if (window.Spotify?.Player) {
                    resolveOnce()
                    return
                }
                rejectOnce(new Error('Le SDK Spotify Web Playback a expiré au chargement.'))
            }, 10_000)
        })

        try {
            await webPlaybackSdkPromise
        } catch (error) {
            webPlaybackSdkPromise = null
            throw error
        }
    }

    const waitForWebPlaybackDevice = async () => {
        if (webPlaybackDeviceId.value) return webPlaybackDeviceId.value

        return await new Promise<string>((resolve, reject) => {
            const maxAttempts = 60
            let attempts = 0
            const timer = setInterval(() => {
                attempts += 1
                if (webPlaybackDeviceId.value) {
                    clearInterval(timer)
                    resolve(webPlaybackDeviceId.value)
                    return
                }
                if (attempts >= maxAttempts) {
                    clearInterval(timer)
                    reject(new Error("Le device Spotify Web n'a pas pu être initialisé."))
                }
            }, 100)
        })
    }

    const transferPlaybackToDevice = async (deviceId: string) => {
        await fetchFromSpotify('/me/player', {
            method: 'PUT',
            body: {
                device_ids: [deviceId],
                play: false,
            },
        })
    }

    const ensureWebPlaybackPlayer = async () => {
        restoreStoredTokens()
        if (!accessToken.value || isTokenExpired()) {
            clearAuth()
            throw new Error('Session Spotify expirée. Reconnecte ton compte.')
        }

        await loadWebPlaybackSdk()
        if (!window.Spotify?.Player) {
            throw new Error('Spotify Web Playback SDK indisponible.')
        }

        if (!webPlaybackPlayer) {
            webPlaybackPlayer = new window.Spotify.Player({
                name: SPOTIFY_WEB_PLAYER_NAME,
                getOAuthToken: (callback) => {
                    restoreStoredTokens()
                    if (!accessToken.value || isTokenExpired()) {
                        webPlaybackError.value = 'Session Spotify expirée. Reconnecte ton compte.'
                        clearAuth()
                        callback('')
                        return
                    }
                    callback(accessToken.value)
                },
                volume: 0.8,
            })
        }

        if (webPlaybackPlayer && !webPlaybackListenersBound) {
            webPlaybackPlayer.addListener('ready', ({ device_id }: SpotifyWebPlaybackDevice) => {
                webPlaybackDeviceId.value = device_id
                webPlaybackReady.value = true
                webPlaybackConnected.value = true
                webPlaybackError.value = null
            })

            webPlaybackPlayer.addListener(
                'not_ready',
                ({ device_id }: SpotifyWebPlaybackDevice) => {
                    if (webPlaybackDeviceId.value === device_id) {
                        webPlaybackReady.value = false
                    }
                }
            )

            const onPlaybackError = (payload: SpotifyWebPlaybackError) => {
                webPlaybackError.value = payload?.message || 'Erreur Spotify Web Playback.'
            }
            webPlaybackPlayer.addListener('initialization_error', onPlaybackError)
            webPlaybackPlayer.addListener('authentication_error', onPlaybackError)
            webPlaybackPlayer.addListener('account_error', onPlaybackError)
            webPlaybackPlayer.addListener('playback_error', onPlaybackError)

            webPlaybackListenersBound = true
        }

        const connected = await webPlaybackPlayer.connect()
        webPlaybackConnected.value = connected
        if (!connected) {
            throw new Error('Impossible de connecter le lecteur Spotify Web.')
        }

        const deviceId = await waitForWebPlaybackDevice()
        await transferPlaybackToDevice(deviceId)
        return deviceId
    }

    const startWebPlayback = async (options: SpotifyStartPlaybackOptions) => {
        const deviceId = await ensureWebPlaybackPlayer()
        if (!options.contextUri && (!options.trackUris || options.trackUris.length === 0)) {
            throw new Error('Aucun titre Spotify à lire.')
        }

        if (webPlaybackPlayer?.activateElement) {
            try {
                await webPlaybackPlayer.activateElement()
            } catch {
                // Some browsers reject activateElement() outside trusted gestures.
            }
        }

        const body: Record<string, any> = {}
        if (options.contextUri) body.context_uri = options.contextUri
        if (options.trackUris && options.trackUris.length > 0) body.uris = options.trackUris
        if (typeof options.startIndex === 'number' && options.startIndex >= 0) {
            body.offset = { position: options.startIndex }
        }
        if (typeof options.positionMs === 'number' && options.positionMs >= 0) {
            body.position_ms = Math.floor(options.positionMs)
        }

        await fetchFromSpotify('/me/player/play', {
            method: 'PUT',
            query: { device_id: deviceId },
            body,
        })

        webPlaybackError.value = null
    }

    const queueTrack = async (trackUri: string) => {
        if (!trackUri) {
            throw new Error('URI Spotify du titre manquante.')
        }

        const deviceId = await ensureWebPlaybackPlayer()
        await fetchFromSpotify('/me/player/queue', {
            method: 'POST',
            query: {
                uri: trackUri,
                device_id: deviceId,
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
        ensureWebPlaybackPlayer,
        startWebPlayback,
        queueTrack,
        clearAuth,
        isAuthenticated,
        accessToken,
        webPlaybackDeviceId,
        webPlaybackReady,
        webPlaybackConnected,
        webPlaybackError,
    }
}
