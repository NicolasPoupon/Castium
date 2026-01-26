import { useTmdbLanguage } from "./useTmdbLanguage";

type MediaType = 'movie' | 'tv'

export const useMovieDetails = (opts: { id: Ref<number>; mediaType?: MediaType }) => {
    const mediaType = opts.mediaType ?? 'movie'
    const { id } = opts

    const { getDetails, getCredits, getSimilar, getVideos } = useTMDB()
    const { tmdbLanguage } = useTmdbLanguage()

    const movie = ref<any>(null)
    const credits = ref<any>(null)
    const similar = ref<any[]>([])
    const videos = ref<any[]>([])
    const isLoading = ref(false)
    const error = ref<unknown>(null)

    const refresh = async () => {
        if (!id.value) return
        isLoading.value = true
        error.value = null

        try {
            const lang = tmdbLanguage.value
            const [movieData, creditsData, similarData, videosData] = await Promise.all([
                getDetails(id.value, mediaType, lang),
                getCredits(id.value, mediaType, lang),
                getSimilar(id.value, mediaType, lang),
                getVideos(id.value, mediaType, lang),
            ])

            movie.value = movieData
            credits.value = creditsData
            similar.value = similarData?.results || []
            videos.value = videosData?.results || []
        } catch (e) {
            error.value = e
        } finally {
            isLoading.value = false
        }
    }

    watch([id, tmdbLanguage], refresh, { immediate: true })

    return { movie, credits, similar, videos, isLoading, error, refresh }
}
