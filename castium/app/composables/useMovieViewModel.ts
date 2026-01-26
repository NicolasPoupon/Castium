export const useMovieViewModel = (movie: Ref<any>, credits: Ref<any>, videos: Ref<any[]>) => {
    const { getImageUrl, pickBestTrailer, youtubeEmbedUrl } = useTMDB()

    const title = computed(() => movie.value?.title || movie.value?.name || 'Sans titre')

    const releaseYear = computed(() => {
        const d = movie.value?.release_date || movie.value?.first_air_date
        return d ? new Date(d).getFullYear() : ''
    })

    const runtime = computed(() => {
        const r = movie.value?.runtime
        if (!r) return null
        const h = Math.floor(r / 60)
        const m = r % 60
        return `${h}h ${m}m`
    })

    const backdropUrl = computed(() => getImageUrl(movie.value?.backdrop_path, 'original'))
    const posterUrl = computed(() => getImageUrl(movie.value?.poster_path, 'w500'))
    const genres = computed(() => movie.value?.genres || [])
    const actorImageUrl = (path: string | null) => getImageUrl(path, 'w185')

    const director = computed(
        () => credits.value?.crew?.find((c: any) => c.job === 'Director') ?? null
    )
    const cast = computed(() => credits.value?.cast?.slice(0, 6) || [])

    const trailerUrl = computed(() => {
        const t = pickBestTrailer(videos.value || [])
        return t ? youtubeEmbedUrl(t.key) : null
    })

    return {
        title,
        releaseYear,
        runtime,
        backdropUrl,
        posterUrl,
        genres,
        director,
        cast,
        trailerUrl,
        actorImageUrl,
    }
}
