import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const mockGetDetails = vi.fn(() => Promise.resolve({ title: 'Movie' }))
const mockGetCredits = vi.fn(() => Promise.resolve({ cast: [], crew: [] }))
const mockGetSimilar = vi.fn(() => Promise.resolve({ results: [] }))
const mockGetVideos = vi.fn(() => Promise.resolve({ results: [] }))

const mockUseTMDB = () => ({
    getDetails: mockGetDetails,
    getCredits: mockGetCredits,
    getSimilar: mockGetSimilar,
    getVideos: mockGetVideos,
})

describe('useMovieDetails', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('useTMDB', mockUseTMDB)
        vi.stubGlobal('useTmdbLanguage', () => ({ tmdbLanguage: ref('fr-FR') }))
    })

    it('returns refs and refresh function', async () => {
        const { useMovieDetails } = await import('~/composables/useMovieDetails')
        const id = ref(123)
        const details = useMovieDetails({ id })
        expect(details.movie).toBeDefined()
        expect(details.credits).toBeDefined()
        expect(details.similar).toBeDefined()
        expect(details.videos).toBeDefined()
        expect(details.isLoading).toBeDefined()
        expect(details.error).toBeDefined()
        expect(details.refresh).toBeDefined()
    })

    it('refresh fetches details when id is set', async () => {
        const { useMovieDetails } = await import('~/composables/useMovieDetails')
        const id = ref(456)
        const details = useMovieDetails({ id })
        await details.refresh()
        expect(mockGetDetails).toHaveBeenCalledWith(456, 'movie', 'fr-FR')
        expect(details.movie.value?.title).toBe('Movie')
    })

    it('refresh does nothing when id is falsy', async () => {
        const { useMovieDetails } = await import('~/composables/useMovieDetails')
        const id = ref(0)
        const details = useMovieDetails({ id })
        await details.refresh()
        expect(mockGetDetails).not.toHaveBeenCalled()
    })

    it('uses mediaType tv when passed', async () => {
        const { useMovieDetails } = await import('~/composables/useMovieDetails')
        const id = ref(789)
        const details = useMovieDetails({ id, mediaType: 'tv' })
        await details.refresh()
        expect(mockGetDetails).toHaveBeenCalledWith(789, 'tv', 'fr-FR')
    })
})
