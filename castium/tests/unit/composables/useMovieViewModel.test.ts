import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const mockGetImageUrl = vi.fn((path: string | null) => (path ? `https://img/${path}` : '/placeholder.png'))
const mockPickBestTrailer = vi.fn((videos: any[]) => (videos?.length ? videos[0] : null))
const mockYoutubeEmbedUrl = vi.fn((key: string) => `https://youtube.com/embed/${key}`)

const mockUseTMDB = () => ({
    getImageUrl: mockGetImageUrl,
    pickBestTrailer: mockPickBestTrailer,
    youtubeEmbedUrl: mockYoutubeEmbedUrl,
})

describe('useMovieViewModel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('useTMDB', mockUseTMDB)
    })

    it('computes title from movie', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({ title: 'Test Movie' })
        const credits = ref(null)
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.title.value).toBe('Test Movie')
    })

    it('falls back to name for TV and Sans titre when missing', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({ name: 'TV Show' })
        const credits = ref(null)
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.title.value).toBe('TV Show')
        movie.value = {}
        expect(vm.title.value).toBe('Sans titre')
    })

    it('computes releaseYear from release_date', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({ release_date: '2024-06-15' })
        const credits = ref(null)
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.releaseYear.value).toBe(2024)
    })

    it('computes runtime as Xh Ym', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({ runtime: 125 })
        const credits = ref(null)
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.runtime.value).toBe('2h 5m')
    })

    it('returns null runtime when missing', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({})
        const credits = ref(null)
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.runtime.value).toBeNull()
    })

    it('calls getImageUrl for backdrop and poster', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({ backdrop_path: '/b.jpg', poster_path: '/p.jpg' })
        const credits = ref(null)
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.backdropUrl.value).toBeDefined()
        expect(vm.posterUrl.value).toBeDefined()
        expect(mockGetImageUrl).toHaveBeenCalled()
    })

    it('computes director from credits crew', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({})
        const credits = ref({ crew: [{ job: 'Director', name: 'John' }], cast: [] })
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.director.value?.name).toBe('John')
    })

    it('computes cast slice of 6', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({})
        const credits = ref({ cast: [{ name: 'A' }, { name: 'B' }], crew: [] })
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.cast.value).toHaveLength(2)
    })

    it('actorImageUrl calls getImageUrl', async () => {
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({})
        const credits = ref(null)
        const videos = ref([])
        const vm = useMovieViewModel(movie, credits, videos)
        vm.actorImageUrl('/actor.jpg')
        expect(mockGetImageUrl).toHaveBeenCalledWith('/actor.jpg', 'w185')
    })

    it('trailerUrl uses pickBestTrailer and youtubeEmbedUrl', async () => {
        mockPickBestTrailer.mockReturnValue({ key: 'xyz' })
        const { useMovieViewModel } = await import('~/composables/useMovieViewModel')
        const movie = ref({})
        const credits = ref(null)
        const videos = ref([{ key: 'xyz' }])
        const vm = useMovieViewModel(movie, credits, videos)
        expect(vm.trailerUrl.value).toBe('https://youtube.com/embed/xyz')
    })
})
