/**
 * YouTube API Composable
 * Manages YouTube OAuth authentication, playlists, and video playback
 */

interface YouTubeTokens {
    accessToken: string
    refreshToken: string
    expiresAt: number
}

interface YouTubeChannel {
    id: string
    title: string
    thumbnail: string
    subscriberCount: string
}

interface YouTubePlaylist {
    id: string
    title: string
    description: string
    thumbnail: string
    itemCount: number
    privacyStatus: string
}

interface YouTubeVideo {
    id: string
    title: string
    description: string
    thumbnail: string
    duration: string
    channelTitle: string
    publishedAt: string
    viewCount?: string
    likeCount?: string
}

interface YouTubeWatchProgress {
    videoId: string
    progress: number
    duration: number
    watchedAt: number
}

const YOUTUBE_STORAGE_KEY = 'castium-youtube-tokens'
const YOUTUBE_PROGRESS_KEY = 'castium-youtube-progress'
const YOUTUBE_FAVORITES_KEY = 'castium-youtube-favorites'

// Global state (persisted across navigation)
const globalIsAuthenticated = ref(false)
const globalLoading = ref(false)
const globalChannel = ref<YouTubeChannel | null>(null)
const globalPlaylists = ref<YouTubePlaylist[]>([])
const globalCurrentPlaylistVideos = ref<YouTubeVideo[]>([])
const globalLikedVideos = ref<YouTubeVideo[]>([])
const globalWatchLater = ref<YouTubeVideo[]>([])
const globalCurrentVideo = ref<YouTubeVideo | null>(null)
const globalError = ref<string | null>(null)
const globalInitialized = ref(false)

export const useYouTube = () => {
    const config = useRuntimeConfig()

    // Use global state
    const isAuthenticated = globalIsAuthenticated
    const loading = globalLoading
    const channel = globalChannel
    const playlists = globalPlaylists
    const currentPlaylistVideos = globalCurrentPlaylistVideos
    const likedVideos = globalLikedVideos
    const watchLater = globalWatchLater
    const currentVideo = globalCurrentVideo
    const error = globalError

    // Get stored tokens
    const getStoredTokens = (): YouTubeTokens | null => {
        if (import.meta.server) return null
        const stored = localStorage.getItem(YOUTUBE_STORAGE_KEY)
        if (!stored) return null
        try {
            return JSON.parse(stored)
        } catch {
            return null
        }
    }

    // Save tokens
    const saveTokens = (tokens: YouTubeTokens) => {
        if (import.meta.server) return
        localStorage.setItem(YOUTUBE_STORAGE_KEY, JSON.stringify(tokens))
    }

    // Clear tokens
    const clearTokens = () => {
        if (import.meta.server) return
        localStorage.removeItem(YOUTUBE_STORAGE_KEY)
    }

    // Get watch progress
    const getWatchProgress = (): Record<string, YouTubeWatchProgress> => {
        if (import.meta.server) return {}
        const stored = localStorage.getItem(YOUTUBE_PROGRESS_KEY)
        if (!stored) return {}
        try {
            return JSON.parse(stored)
        } catch {
            return {}
        }
    }

    // Save watch progress
    const saveWatchProgress = (videoId: string, progress: number, duration: number) => {
        if (import.meta.server) return
        const allProgress = getWatchProgress()
        allProgress[videoId] = {
            videoId,
            progress,
            duration,
            watchedAt: Date.now(),
        }
        localStorage.setItem(YOUTUBE_PROGRESS_KEY, JSON.stringify(allProgress))
    }

    // Get progress for a video
    const getVideoProgress = (videoId: string): number => {
        const allProgress = getWatchProgress()
        return allProgress[videoId]?.progress || 0
    }

    // Get continue watching videos
    const getContinueWatching = (): YouTubeWatchProgress[] => {
        const allProgress = getWatchProgress()
        return Object.values(allProgress)
            .filter((p) => p.progress > 10 && p.progress < p.duration - 30) // Started but not finished
            .sort((a, b) => b.watchedAt - a.watchedAt)
            .slice(0, 10)
    }

    // Get favorites
    const getFavorites = (): string[] => {
        if (import.meta.server) return []
        const stored = localStorage.getItem(YOUTUBE_FAVORITES_KEY)
        if (!stored) return []
        try {
            return JSON.parse(stored)
        } catch {
            return []
        }
    }

    // Toggle favorite
    const toggleFavorite = (videoId: string) => {
        if (import.meta.server) return
        const favorites = getFavorites()
        const index = favorites.indexOf(videoId)
        if (index === -1) {
            favorites.push(videoId)
        } else {
            favorites.splice(index, 1)
        }
        localStorage.setItem(YOUTUBE_FAVORITES_KEY, JSON.stringify(favorites))
    }

    // Check if video is favorite
    const isFavorite = (videoId: string): boolean => {
        return getFavorites().includes(videoId)
    }

    // Check if token is expired
    const isTokenExpired = (tokens: YouTubeTokens): boolean => {
        return Date.now() >= tokens.expiresAt - 60000 // 1 minute buffer
    }

    // Get valid access token (refresh if needed)
    const getValidAccessToken = async (): Promise<string | null> => {
        const tokens = getStoredTokens()
        if (!tokens) return null

        if (!isTokenExpired(tokens)) {
            return tokens.accessToken
        }

        // Refresh token
        try {
            const response = await $fetch<{
                access_token: string
                expires_in: number
            }>('/api/youtube/refresh', {
                method: 'POST',
                body: { refreshToken: tokens.refreshToken },
            })

            const newTokens: YouTubeTokens = {
                accessToken: response.access_token,
                refreshToken: tokens.refreshToken,
                expiresAt: Date.now() + response.expires_in * 1000,
            }
            saveTokens(newTokens)
            return response.access_token
        } catch (e) {
            console.error('[YouTube] Failed to refresh token:', e)
            clearTokens()
            isAuthenticated.value = false
            return null
        }
    }

    // Make authenticated API request
    const youtubeApiFetch = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
        const accessToken = await getValidAccessToken()
        if (!accessToken) {
            throw new Error('Not authenticated')
        }

        const response = await fetch(`https://www.googleapis.com/youtube/v3${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error?.message || `YouTube API error: ${response.status}`)
        }

        return response.json()
    }

    // Initialize - check authentication status
    const initialize = async () => {
        // Skip if already initialized
        if (globalInitialized.value) {
            return
        }

        const tokens = getStoredTokens()
        if (tokens) {
            console.log('[YouTube] Found stored tokens, authenticating...')
            isAuthenticated.value = true
            globalInitialized.value = true
            await fetchChannelInfo()
        } else {
            console.log('[YouTube] No stored tokens found')
            globalInitialized.value = true
        }
    }

    // Get OAuth URL for login
    const getOAuthUrl = (): string => {
        const clientId = config.public.youtubeClientId
        const redirectUri =
            config.public.youtubeRedirectUri || `${window.location.origin}/auth/youtube/callback`

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: [
                'https://www.googleapis.com/auth/youtube.readonly',
                'https://www.googleapis.com/auth/youtube',
            ].join(' '),
            access_type: 'offline',
            prompt: 'consent',
        })

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    }

    // Login - redirect to OAuth
    const login = () => {
        window.location.href = getOAuthUrl()
    }

    // Handle OAuth callback
    const handleCallback = async (code: string): Promise<boolean> => {
        loading.value = true
        error.value = null

        try {
            const response = await $fetch<{
                access_token: string
                refresh_token: string
                expires_in: number
            }>('/api/youtube/token', {
                method: 'POST',
                body: { code },
            })

            const tokens: YouTubeTokens = {
                accessToken: response.access_token,
                refreshToken: response.refresh_token,
                expiresAt: Date.now() + response.expires_in * 1000,
            }

            console.log('[YouTube] Tokens received and saved')
            saveTokens(tokens)
            isAuthenticated.value = true
            globalInitialized.value = true
            await fetchChannelInfo()

            return true
        } catch (e: any) {
            console.error('[YouTube] OAuth callback error:', e)
            error.value = e.message || 'Failed to authenticate with YouTube'
            return false
        } finally {
            loading.value = false
        }
    }

    // Logout
    const logout = () => {
        clearTokens()
        isAuthenticated.value = false
        channel.value = null
        playlists.value = []
        currentPlaylistVideos.value = []
        likedVideos.value = []
        watchLater.value = []
        globalInitialized.value = false
    }

    // Fetch channel info
    const fetchChannelInfo = async () => {
        try {
            const data = await youtubeApiFetch<any>('/channels?part=snippet,statistics&mine=true')

            if (data.items && data.items.length > 0) {
                const ch = data.items[0]
                channel.value = {
                    id: ch.id,
                    title: ch.snippet.title,
                    thumbnail: ch.snippet.thumbnails.default?.url || '',
                    subscriberCount: ch.statistics.subscriberCount,
                }
            }
        } catch (e) {
            console.error('[YouTube] Failed to fetch channel info:', e)
        }
    }

    // Fetch user's playlists
    const fetchPlaylists = async () => {
        loading.value = true
        error.value = null

        try {
            const data = await youtubeApiFetch<any>(
                '/playlists?part=snippet,contentDetails,status&mine=true&maxResults=50'
            )

            playlists.value = (data.items || []).map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail:
                    item.snippet.thumbnails.medium?.url ||
                    item.snippet.thumbnails.default?.url ||
                    '',
                itemCount: item.contentDetails.itemCount,
                privacyStatus: item.status.privacyStatus,
            }))
        } catch (e: any) {
            console.error('[YouTube] Failed to fetch playlists:', e)
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Fetch videos from a playlist
    const fetchPlaylistVideos = async (playlistId: string) => {
        loading.value = true
        error.value = null

        try {
            const data = await youtubeApiFetch<any>(
                `/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`
            )

            const videoIds = (data.items || [])
                .map((item: any) => item.contentDetails.videoId)
                .filter(Boolean)
                .join(',')

            if (videoIds) {
                const videoData = await youtubeApiFetch<any>(
                    `/videos?part=snippet,contentDetails,statistics&id=${videoIds}`
                )

                currentPlaylistVideos.value = (videoData.items || []).map((item: any) => ({
                    id: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail:
                        item.snippet.thumbnails.medium?.url ||
                        item.snippet.thumbnails.default?.url ||
                        '',
                    duration: parseDuration(item.contentDetails.duration),
                    channelTitle: item.snippet.channelTitle,
                    publishedAt: item.snippet.publishedAt,
                    viewCount: item.statistics?.viewCount,
                    likeCount: item.statistics?.likeCount,
                }))
            } else {
                currentPlaylistVideos.value = []
            }
        } catch (e: any) {
            console.error('[YouTube] Failed to fetch playlist videos:', e)
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Fetch liked videos
    const fetchLikedVideos = async () => {
        loading.value = true
        error.value = null

        try {
            const data = await youtubeApiFetch<any>(
                '/videos?part=snippet,contentDetails,statistics&myRating=like&maxResults=50'
            )

            likedVideos.value = (data.items || []).map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail:
                    item.snippet.thumbnails.medium?.url ||
                    item.snippet.thumbnails.default?.url ||
                    '',
                duration: parseDuration(item.contentDetails.duration),
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                viewCount: item.statistics?.viewCount,
                likeCount: item.statistics?.likeCount,
            }))
        } catch (e: any) {
            console.error('[YouTube] Failed to fetch liked videos:', e)
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Fetch watch later playlist
    const fetchWatchLater = async () => {
        loading.value = true
        error.value = null

        try {
            // Get the "Watch Later" playlist ID from channel
            const channelData = await youtubeApiFetch<any>(
                '/channels?part=contentDetails&mine=true'
            )

            const watchLaterId =
                channelData.items?.[0]?.contentDetails?.relatedPlaylists?.watchLater

            if (watchLaterId) {
                await fetchPlaylistVideos(watchLaterId)
                watchLater.value = [...currentPlaylistVideos.value]
                currentPlaylistVideos.value = []
            }
        } catch (e: any) {
            console.error('[YouTube] Failed to fetch watch later:', e)
            // Watch Later might not be accessible via API
            error.value = null
        } finally {
            loading.value = false
        }
    }

    // Parse ISO 8601 duration to readable format
    const parseDuration = (isoDuration: string): string => {
        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        if (!match) return '0:00'

        const hours = parseInt(match[1] || '0')
        const minutes = parseInt(match[2] || '0')
        const seconds = parseInt(match[3] || '0')

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    // Format view count
    const formatViewCount = (count: string | undefined): string => {
        if (!count) return ''
        const num = parseInt(count)
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`
        }
        return count
    }

    // Format date
    const formatPublishedAt = (date: string): string => {
        const d = new Date(date)
        const now = new Date()
        const diff = now.getTime() - d.getTime()

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (days < 1) return 'Today'
        if (days === 1) return 'Yesterday'
        if (days < 7) return `${days} days ago`
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`
        if (days < 365) return `${Math.floor(days / 30)} months ago`
        return `${Math.floor(days / 365)} years ago`
    }

    // Get YouTube embed URL
    const getEmbedUrl = (videoId: string, startTime: number = 0): string => {
        const params = new URLSearchParams({
            autoplay: '1',
            start: Math.floor(startTime).toString(),
            enablejsapi: '1',
            origin: window.location.origin,
        })
        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
    }

    // Get YouTube watch URL
    const getWatchUrl = (videoId: string): string => {
        return `https://www.youtube.com/watch?v=${videoId}`
    }

    return {
        // State
        isAuthenticated,
        loading,
        channel,
        playlists,
        currentPlaylistVideos,
        likedVideos,
        watchLater,
        currentVideo,
        error,

        // Methods
        initialize,
        login,
        handleCallback,
        logout,
        fetchChannelInfo,
        fetchPlaylists,
        fetchPlaylistVideos,
        fetchLikedVideos,
        fetchWatchLater,

        // Progress
        saveWatchProgress,
        getVideoProgress,
        getContinueWatching,

        // Favorites
        toggleFavorite,
        isFavorite,

        // Helpers
        parseDuration,
        formatViewCount,
        formatPublishedAt,
        getEmbedUrl,
        getWatchUrl,
    }
}
