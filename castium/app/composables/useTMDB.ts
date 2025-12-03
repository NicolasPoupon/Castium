export const useTMDB = () => {
    const config = useRuntimeConfig()
    const apiKey = config.public.tmdbApiKey
    const baseUrl = 'https://api.themoviedb.org/3'
    const imageBaseUrl = 'https://image.tmdb.org/t/p'

    const fetchFromTMDB = async <T>(endpoint: string): Promise<T> => {
        const response = await $fetch<T>(`${baseUrl}${endpoint}`, {
            params: {
                api_key: apiKey,
                language: 'fr-FR',
            },
        })
        return response
    }

    const getTrending = async (
        mediaType: 'movie' | 'tv' = 'movie',
        timeWindow: 'day' | 'week' = 'week'
    ) => {
        return fetchFromTMDB(`/trending/${mediaType}/${timeWindow}`)
    }

    const getPopular = async (mediaType: 'movie' | 'tv' = 'movie') => {
        return fetchFromTMDB(`/${mediaType}/popular`)
    }

    const getTopRated = async (mediaType: 'movie' | 'tv' = 'movie') => {
        return fetchFromTMDB(`/${mediaType}/top_rated`)
    }

    const search = async (query: string, mediaType: 'movie' | 'tv' | 'multi' = 'multi') => {
        const response = await $fetch(`${baseUrl}/search/${mediaType}`, {
            params: {
                api_key: apiKey,
                language: 'fr-FR',
                query,
            },
        })
        return response
    }

    const getDetails = async (id: number, mediaType: 'movie' | 'tv' = 'movie') => {
        return fetchFromTMDB(`/${mediaType}/${id}`)
    }

    const getImageUrl = (path: string | null, size: string = 'w500') => {
        if (!path) return '/placeholder-movie.jpg'
        return `${imageBaseUrl}/${size}${path}`
    }

    return {
        getTrending,
        getPopular,
        getTopRated,
        search,
        getDetails,
        getImageUrl,
    }
}
