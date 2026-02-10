import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const TOKENS_KEY = 'castium-youtube-tokens'

const jsonResponse = (body: unknown, ok: boolean = true, status: number = 200) =>
    Promise.resolve({
        ok,
        status,
        json: async () => body,
    } as Response)

describe('useYouTube (real composable)', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
        localStorage.clear()
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(console, 'log').mockImplementation(() => {})

        vi.stubGlobal('useRuntimeConfig', () => ({
            public: {
                youtubeClientId: 'youtube-client-id',
                youtubeRedirectUri: 'https://castium.app/auth/youtube/callback',
            },
        }))
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('covers helpers: durations, counts, dates, favorites, progress, embed/watch URLs', async () => {
        vi.stubGlobal('$fetch', vi.fn())
        vi.stubGlobal('fetch', vi.fn())
        const { useYouTube } = await import('~/composables/useYouTube')
        const yt = useYouTube()

        expect(yt.parseDuration('PT1H2M3S')).toBe('1:02:03')
        expect(yt.parseDuration('PT4M5S')).toBe('4:05')
        expect(yt.parseDuration('invalid')).toBe('0:00')

        expect(yt.formatViewCount(undefined)).toBe('')
        expect(yt.formatViewCount('999')).toBe('999')
        expect(yt.formatViewCount('1500')).toBe('1.5K')
        expect(yt.formatViewCount('2500000')).toBe('2.5M')

        expect(yt.formatPublishedAt(new Date().toISOString())).toBe('Today')
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        expect(yt.formatPublishedAt(yesterday)).toBe('Yesterday')

        yt.toggleFavorite('video-1')
        expect(yt.isFavorite('video-1')).toBe(true)
        yt.toggleFavorite('video-1')
        expect(yt.isFavorite('video-1')).toBe(false)

        yt.saveWatchProgress('video-1', 120, 300)
        expect(yt.getVideoProgress('video-1')).toBe(120)
        expect(yt.getContinueWatching()).toHaveLength(1)

        const embed = yt.getEmbedUrl('abc123', 12.9)
        expect(embed).toContain('https://www.youtube.com/embed/abc123?')
        expect(embed).toContain('autoplay=1')
        expect(embed).toContain('start=12')
        expect(embed).toContain(encodeURIComponent(window.location.origin))
        expect(yt.getWatchUrl('abc123')).toBe('https://www.youtube.com/watch?v=abc123')
    })

    it('initializes from stored tokens, fetches channel info, then logout clears state', async () => {
        localStorage.setItem(
            TOKENS_KEY,
            JSON.stringify({
                accessToken: 'token-a',
                refreshToken: 'refresh-a',
                expiresAt: Date.now() + 60 * 60 * 1000,
            })
        )
        vi.stubGlobal('$fetch', vi.fn())
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url.includes('/channels?part=snippet,statistics&mine=true')) {
                return jsonResponse({
                    items: [
                        {
                            id: 'channel-1',
                            snippet: { title: 'Castium Channel', thumbnails: { default: { url: 'thumb.png' } } },
                            statistics: { subscriberCount: '42' },
                        },
                    ],
                })
            }
            return jsonResponse({})
        }))

        const { useYouTube } = await import('~/composables/useYouTube')
        const yt = useYouTube()

        await yt.initialize()
        expect(yt.isAuthenticated.value).toBe(true)
        expect(yt.channel.value?.id).toBe('channel-1')
        expect(yt.channel.value?.subscriberCount).toBe('42')

        yt.logout()
        expect(yt.isAuthenticated.value).toBe(false)
        expect(yt.channel.value).toBeNull()
        expect(localStorage.getItem(TOKENS_KEY)).toBeNull()
    })

    it('handles OAuth callback success and failure', async () => {
        const fetchMock = vi.fn((url: string) => {
            if (url.includes('/channels?part=snippet,statistics&mine=true')) {
                return jsonResponse({
                    items: [
                        {
                            id: 'channel-2',
                            snippet: { title: 'MyTube', thumbnails: { default: { url: 't2.png' } } },
                            statistics: { subscriberCount: '99' },
                        },
                    ],
                })
            }
            return jsonResponse({})
        })
        vi.stubGlobal('fetch', fetchMock)
        vi.stubGlobal(
            '$fetch',
            vi.fn().mockResolvedValue({
                access_token: 'token-oauth',
                refresh_token: 'refresh-oauth',
                expires_in: 3600,
            })
        )

        const { useYouTube } = await import('~/composables/useYouTube')
        const yt = useYouTube()

        const ok = await yt.handleCallback('oauth-code')
        expect(ok).toBe(true)
        expect(yt.isAuthenticated.value).toBe(true)
        expect(yt.channel.value?.title).toBe('MyTube')

        vi.resetModules()
        localStorage.clear()
        vi.stubGlobal('useRuntimeConfig', () => ({
            public: {
                youtubeClientId: 'youtube-client-id',
                youtubeRedirectUri: 'https://castium.app/auth/youtube/callback',
            },
        }))
        vi.stubGlobal('fetch', vi.fn())
        vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('oauth failed')))
        const { useYouTube: useYouTubeFail } = await import('~/composables/useYouTube')
        const ytFail = useYouTubeFail()
        const failed = await ytFail.handleCallback('oauth-code')
        expect(failed).toBe(false)
        expect(ytFail.error.value).toContain('oauth failed')
    })

    it('fetches playlists, playlist videos, liked videos, and watch later', async () => {
        localStorage.setItem(
            TOKENS_KEY,
            JSON.stringify({
                accessToken: 'token-data',
                refreshToken: 'refresh-data',
                expiresAt: Date.now() + 60 * 60 * 1000,
            })
        )
        vi.stubGlobal('$fetch', vi.fn())
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url.includes('/playlists?part=snippet,contentDetails,status&mine=true')) {
                return jsonResponse({
                    items: [
                        {
                            id: 'pl-1',
                            snippet: {
                                title: 'Playlist 1',
                                description: 'Desc',
                                thumbnails: { medium: { url: 'pl1.png' } },
                            },
                            contentDetails: { itemCount: 1 },
                            status: { privacyStatus: 'private' },
                        },
                    ],
                })
            }

            if (url.includes('/playlistItems?part=snippet,contentDetails&playlistId=')) {
                return jsonResponse({
                    items: [{ contentDetails: { videoId: 'vid-1' } }],
                })
            }

            if (url.includes('/videos?part=snippet,contentDetails,statistics&id=')) {
                return jsonResponse({
                    items: [
                        {
                            id: 'vid-1',
                            snippet: {
                                title: 'Video 1',
                                description: 'Desc',
                                channelTitle: 'Channel',
                                publishedAt: new Date().toISOString(),
                                thumbnails: { medium: { url: 'v1.png' } },
                            },
                            contentDetails: { duration: 'PT2M5S' },
                            statistics: { viewCount: '1500', likeCount: '30' },
                        },
                    ],
                })
            }

            if (url.includes('/videos?part=snippet,contentDetails,statistics&myRating=like')) {
                return jsonResponse({
                    items: [
                        {
                            id: 'liked-1',
                            snippet: {
                                title: 'Liked',
                                description: '',
                                channelTitle: 'Channel',
                                publishedAt: new Date().toISOString(),
                                thumbnails: { default: { url: 'liked.png' } },
                            },
                            contentDetails: { duration: 'PT1M2S' },
                            statistics: { viewCount: '200', likeCount: '10' },
                        },
                    ],
                })
            }

            if (url.includes('/channels?part=contentDetails&mine=true')) {
                return jsonResponse({
                    items: [{ contentDetails: { relatedPlaylists: { watchLater: 'WL' } } }],
                })
            }

            return jsonResponse({})
        }))

        const { useYouTube } = await import('~/composables/useYouTube')
        const yt = useYouTube()

        await yt.fetchPlaylists()
        expect(yt.playlists.value).toHaveLength(1)
        expect(yt.playlists.value[0].id).toBe('pl-1')

        await yt.fetchPlaylistVideos('pl-1')
        expect(yt.currentPlaylistVideos.value).toHaveLength(1)
        expect(yt.currentPlaylistVideos.value[0].duration).toBe('2:05')

        await yt.fetchLikedVideos()
        expect(yt.likedVideos.value).toHaveLength(1)
        expect(yt.likedVideos.value[0].id).toBe('liked-1')

        await yt.fetchWatchLater()
        expect(yt.watchLater.value).toHaveLength(1)
        expect(yt.currentPlaylistVideos.value).toHaveLength(0)
    })

    it('refreshes expired token and handles refresh failure gracefully', async () => {
        localStorage.setItem(
            TOKENS_KEY,
            JSON.stringify({
                accessToken: 'expired-token',
                refreshToken: 'refresh-token',
                expiresAt: Date.now() - 5 * 60 * 1000,
            })
        )

        const refreshMock = vi.fn().mockResolvedValue({
            access_token: 'fresh-token',
            expires_in: 3600,
        })
        vi.stubGlobal('$fetch', refreshMock)
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url.includes('/playlists?part=snippet,contentDetails,status&mine=true')) {
                return jsonResponse({ items: [] })
            }
            return jsonResponse({})
        }))

        const { useYouTube } = await import('~/composables/useYouTube')
        const yt = useYouTube()
        await yt.fetchPlaylists()

        expect(refreshMock).toHaveBeenCalledWith(
            '/api/youtube/refresh',
            expect.objectContaining({
                method: 'POST',
                body: { refreshToken: 'refresh-token' },
            })
        )
        expect(JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}').accessToken).toBe('fresh-token')

        vi.resetModules()
        localStorage.setItem(
            TOKENS_KEY,
            JSON.stringify({
                accessToken: 'expired-again',
                refreshToken: 'refresh-fail',
                expiresAt: Date.now() - 5 * 60 * 1000,
            })
        )
        vi.stubGlobal('useRuntimeConfig', () => ({
            public: {
                youtubeClientId: 'youtube-client-id',
                youtubeRedirectUri: 'https://castium.app/auth/youtube/callback',
            },
        }))
        vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('refresh failed')))
        vi.stubGlobal('fetch', vi.fn())

        const { useYouTube: useYouTubeFail } = await import('~/composables/useYouTube')
        const ytFail = useYouTubeFail()
        await ytFail.fetchPlaylists()
        expect(ytFail.isAuthenticated.value).toBe(false)
        expect(ytFail.error.value).toBe('Not authenticated')
        expect(localStorage.getItem(TOKENS_KEY)).toBeNull()
    })
})
