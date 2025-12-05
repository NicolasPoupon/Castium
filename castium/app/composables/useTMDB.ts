// composables/useTMDB.ts
export const useTMDB = () => {
    const config = useRuntimeConfig()
    const apiKey = config.public.tmdbApiKey
    const baseUrl = 'https://api.themoviedb.org/3'
    const imageBaseUrl = 'https://image.tmdb.org/t/p'

    const fetchFromTMDB = async <T>(endpoint: string, language: string = 'fr-FR'): Promise<T> => {
        const response = await $fetch<T>(`${baseUrl}${endpoint}`, {
            params: {
                api_key: apiKey,
                language,
            },
        })
        return response
    }

    const getTrending = async (
        mediaType: 'movie' | 'tv' = 'movie',
        timeWindow: 'day' | 'week' = 'week',
        language: string = 'fr-FR'
    ) => {
        return fetchFromTMDB(`/trending/${mediaType}/${timeWindow}`, language)
    }

    const getPopular = async (mediaType: 'movie' | 'tv' = 'movie', language: string = 'fr-FR') => {
        return fetchFromTMDB(`/${mediaType}/popular`, language)
    }

    const getTopRated = async (mediaType: 'movie' | 'tv' = 'movie', language: string = 'fr-FR') => {
        return fetchFromTMDB(`/${mediaType}/top_rated`, language)
    }

    const search = async (
        query: string,
        mediaType: 'movie' | 'tv' | 'multi' = 'multi',
        language: string = 'fr-FR'
    ) => {
        const response = await $fetch(`${baseUrl}/search/${mediaType}`, {
            params: {
                api_key: apiKey,
                language,
                query,
            },
        })
        return response
    }

    const getDetails = async (
        id: number,
        mediaType: 'movie' | 'tv' = 'movie',
        language: string = 'fr-FR'
    ) => {
        return fetchFromTMDB(`/${mediaType}/${id}`, language)
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
