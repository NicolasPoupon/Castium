type MediaType = 'movie' | 'tv'
type TimeWindow = 'day' | 'week'

export type TmdbVideo = {
    id: string
    key: string
    name: string
    site: string
    type: string
    official?: boolean
    published_at?: string
}

export type TmdbVideosResponse = {
    id: number
    results: TmdbVideo[]
}

export const useTMDB = () => {
    const config = useRuntimeConfig()
    const apiKey = config.public.tmdbApiKey
    const baseUrl = "https://api.themoviedb.org/3"
    const imageBaseUrl = "https://image.tmdb.org/t/p"

    const fetchFromTMDB = async <T>(
        endpoint: string,
        language: string = 'fr-FR',
        extraParams: Record<string, any> = {}
    ): Promise<T> => {
        return await $fetch<T>(`${baseUrl}${endpoint}`, {
            params: { api_key: apiKey, language, ...extraParams },
        })
    }

    const getTrending = (
        mediaType: MediaType = 'movie',
        timeWindow: TimeWindow = 'week',
        language = 'fr-FR'
    ) => fetchFromTMDB<any>(`/trending/${mediaType}/${timeWindow}`, language)

    const getPopular = (mediaType: MediaType = 'movie', language = 'fr-FR') =>
        fetchFromTMDB<any>(`/${mediaType}/popular`, language)

    const getTopRated = (mediaType: MediaType = 'movie', language = 'fr-FR') =>
        fetchFromTMDB<any>(`/${mediaType}/top_rated`, language)

    const search = (
        query: string,
        mediaType: 'movie' | 'tv' | 'multi' = 'multi',
        language = 'fr-FR'
    ) => fetchFromTMDB<any>(`/search/${mediaType}`, language, { query })

    const getDetails = (id: number, mediaType: MediaType = 'movie', language = 'fr-FR') =>
        fetchFromTMDB<any>(`/${mediaType}/${id}`, language)

    const getCredits = (id: number, mediaType: MediaType = 'movie', language = 'fr-FR') =>
        fetchFromTMDB<any>(`/${mediaType}/${id}/credits`, language)

    const getSimilar = (id: number, mediaType: MediaType = 'movie', language = 'fr-FR') =>
        fetchFromTMDB<any>(`/${mediaType}/${id}/similar`, language)

    const getVideos = (id: number, mediaType: MediaType = 'movie', language = 'fr-FR') =>
        fetchFromTMDB<TmdbVideosResponse>(`/${mediaType}/${id}/videos`, language)

    const pickBestTrailer = (videos: TmdbVideo[]) => {
        const yt = videos.filter((v) => v.site === 'YouTube')
        const score = (v: TmdbVideo) => (v.type === 'Trailer' ? 100 : 0) + (v.official ? 30 : 0)
        return yt.sort((a, b) => score(b) - score(a))[0] ?? null
    }

    const youtubeEmbedUrl = (key: string) => `https://www.youtube.com/embed/${key}`

    const getImageUrl = (path: string | null, size: string = 'w500') =>
        path ? `${imageBaseUrl}/${size}${path}` : '/placeholder-movie.png'

    return {
        getTrending,
        getPopular,
        getTopRated,
        search,
        getDetails,
        getCredits,
        getSimilar,
        getVideos,
        pickBestTrailer,
        youtubeEmbedUrl,
        getImageUrl,
    }
}
