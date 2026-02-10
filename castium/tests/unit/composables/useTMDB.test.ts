import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.stubGlobal('useRuntimeConfig', () => ({
    public: { tmdbApiKey: 'test-key' },
}))
vi.stubGlobal('$fetch', vi.fn((url: string) => Promise.resolve({ results: [] })))

describe('useTMDB', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns all TMDB methods', async () => {
        const { useTMDB } = await import('~/composables/useTMDB')
        const tmdb = useTMDB()
        expect(tmdb.getTrending).toBeDefined()
        expect(tmdb.getPopular).toBeDefined()
        expect(tmdb.getTopRated).toBeDefined()
        expect(tmdb.search).toBeDefined()
        expect(tmdb.getDetails).toBeDefined()
        expect(tmdb.getCredits).toBeDefined()
        expect(tmdb.getSimilar).toBeDefined()
        expect(tmdb.getVideos).toBeDefined()
        expect(tmdb.pickBestTrailer).toBeDefined()
        expect(tmdb.youtubeEmbedUrl).toBeDefined()
        expect(tmdb.getImageUrl).toBeDefined()
    })

    it('getImageUrl returns placeholder when path is null', async () => {
        const { useTMDB } = await import('~/composables/useTMDB')
        const { getImageUrl } = useTMDB()
        expect(getImageUrl(null)).toBe('/placeholder-movie.png')
    })

    it('getImageUrl returns URL when path is set', async () => {
        const { useTMDB } = await import('~/composables/useTMDB')
        const { getImageUrl } = useTMDB()
        expect(getImageUrl('/path.jpg')).toContain('image.tmdb.org')
        expect(getImageUrl('/path.jpg')).toContain('path.jpg')
    })

    it('youtubeEmbedUrl returns embed URL', async () => {
        const { useTMDB } = await import('~/composables/useTMDB')
        const { youtubeEmbedUrl } = useTMDB()
        expect(youtubeEmbedUrl('abc')).toBe('https://www.youtube.com/embed/abc')
    })

    it('pickBestTrailer prefers YouTube Trailers and official', async () => {
        const { useTMDB } = await import('~/composables/useTMDB')
        const { pickBestTrailer } = useTMDB()
        const videos = [
            { id: '1', key: 'a', name: 'Teaser', site: 'YouTube', type: 'Teaser', official: false },
            { id: '2', key: 'b', name: 'Trailer', site: 'YouTube', type: 'Trailer', official: true },
        ]
        expect(pickBestTrailer(videos)?.key).toBe('b')
    })

    it('pickBestTrailer returns null for empty array', async () => {
        const { useTMDB } = await import('~/composables/useTMDB')
        const { pickBestTrailer } = useTMDB()
        expect(pickBestTrailer([])).toBeNull()
    })

    it('getTrending and getPopular call $fetch', async () => {
        const $fetch = vi.mocked(globalThis.$fetch as any)
        const { useTMDB } = await import('~/composables/useTMDB')
        const tmdb = useTMDB()
        await tmdb.getTrending()
        expect($fetch).toHaveBeenCalledWith(expect.stringContaining('/trending/'), expect.any(Object))
        await tmdb.getPopular('tv')
        expect($fetch).toHaveBeenCalledWith(expect.stringContaining('/tv/popular'), expect.any(Object))
    })

    it('getTopRated and search call $fetch', async () => {
        const $fetch = vi.mocked(globalThis.$fetch as any)
        const { useTMDB } = await import('~/composables/useTMDB')
        const tmdb = useTMDB()
        await tmdb.getTopRated('movie')
        expect($fetch).toHaveBeenCalledWith(expect.stringContaining('/movie/top_rated'), expect.any(Object))
        await tmdb.search('query', 'movie')
        expect($fetch).toHaveBeenCalledWith(expect.stringContaining('/search/movie'), expect.any(Object))
    })

    it('getDetails getCredits getSimilar getVideos call $fetch', async () => {
        const $fetch = vi.mocked(globalThis.$fetch as any)
        const { useTMDB } = await import('~/composables/useTMDB')
        const tmdb = useTMDB()
        await tmdb.getDetails(1)
        await tmdb.getCredits(1, 'tv')
        await tmdb.getSimilar(1)
        await tmdb.getVideos(1)
        expect($fetch).toHaveBeenCalledWith(expect.stringContaining('/movie/1'), expect.any(Object))
        expect($fetch).toHaveBeenCalledWith(expect.stringContaining('/tv/1/credits'), expect.any(Object))
    })
})
