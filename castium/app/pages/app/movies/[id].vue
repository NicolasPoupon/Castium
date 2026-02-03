<script setup lang="ts">
import { useI18n } from '#imports'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const { getDetails, getCredits, getSimilar, getImageUrl } = useTMDB()
const movieId = computed(() => parseInt(route.params.id as string))
const movie = ref<any>(null)
const credits = ref<any>(null)
const similar = ref<any[]>([])
const isLoading = ref(true)

const tmdbLanguage = computed(() => {
    switch (locale.value) {
        case 'fr':
            return 'fr-FR'
        case 'pl':
            return 'pl-PL'
        default:
            return 'en-US'
    }
})

const backdropUrl = computed(() => getImageUrl(movie.value?.backdrop_path, 'original'))
const posterUrl = computed(() => getImageUrl(movie.value?.poster_path, 'w500'))
const title = computed(() => movie.value?.title || movie.value?.name || 'Sans titre')
const releaseYear = computed(() => {
    const date = movie.value?.release_date || movie.value?.first_air_date
    return date ? new Date(date).getFullYear() : ''
})
const runtime = computed(() => {
    if (!movie.value?.runtime) return 'N/A'
    const hours = Math.floor(movie.value.runtime / 60)
    const minutes = movie.value.runtime % 60
    return `${hours}h ${minutes}m`
})
const director = computed(() => {
    if (!credits.value?.crew) return null
    return credits.value.crew.find((c: any) => c.job === 'Director')
})
const cast = computed(() => credits.value?.cast?.slice(0, 6) || [])
const genreNames = computed(() => (movie.value?.genres || []).map((g: any) => g.name).join(', '))

const loadMovieDetails = async () => {
    isLoading.value = true
    try {
        const lang = tmdbLanguage.value
        const [movieData, creditsData, similarData] = await Promise.all([
            getDetails(movieId.value, 'movie', lang),
            getCredits(movieId.value, 'movie', lang),
            getSimilar(movieId.value, 'movie', lang),
        ])

        movie.value = movieData
        credits.value = creditsData
        similar.value = similarData.results || []
    } catch (error) {
        console.error('Error loading movie details:', error)
    } finally {
        isLoading.value = false
    }
}

const items = computed(() => [
    { label: t('movies.selector.overview'), value: 'overview' },
    { label: t('movies.selector.video'), value: 'video' },
    { label: t('movies.selector.trailer'), value: 'trailer' },
])

const activeTab = ref('overview')

const goBack = () => router.back()

onMounted(() => {
    loadMovieDetails()
})

watch(tmdbLanguage, () => {
    loadMovieDetails()
})
</script>

<template>
    <div class="min-h-screen bg-gray-900">
        <Navbar mode="app" />

        <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
            <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-red-800 animate-spin" />
        </div>

        <div v-else-if="movie" class="">
            <div class="relative w-full h-[60vh] overflow-hidden">
                <div
                    class="absolute inset-0 bg-cover bg-center"
                    :style="{ backgroundImage: `url(${backdropUrl})` }"
                >
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"
                    />
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-transparent to-transparent"
                    />
                </div>

                <div class="absolute inset-0 flex items-end">
                    <div class="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 pb-12">
                        <div class="flex gap-8 items-end">
                            <div class="flex-shrink-0 hidden md:block">
                                <img
                                    :src="posterUrl"
                                    :alt="title"
                                    class="w-48 h-72 rounded-lg shadow-2xl object-cover"
                                />
                            </div>

                            <div class="flex-1 min-w-0">
                                <UButton
                                    icon="i-heroicons-arrow-left"
                                    color="gray"
                                    variant="ghost"
                                    class="mb-4"
                                    @click="goBack"
                                />

                                <h1 class="text-5xl font-bold text-white mb-2">
                                    {{ title }}
                                </h1>

                                <div class="flex flex-wrap items-center gap-4 text-white mb-4">
                                    <span v-if="releaseYear">
                                        {{ releaseYear }}
                                    </span>
                                    <span v-if="runtime" class="text-gray-400">
                                        {{ runtime }}
                                    </span>
                                    <div class="flex items-center gap-2">
                                        <UIcon
                                            name="i-heroicons-star-solid"
                                            class="w-5 h-5 text-yellow-400"
                                        />
                                        <span class="font-semibold">
                                            {{ movie.vote_average?.toFixed(1) }}/10
                                        </span>
                                    </div>
                                </div>

                                <div v-if="genreNames" class="flex flex-wrap gap-2 mb-6">
                                    <span
                                        v-for="genre in movie.genres"
                                        :key="genre.id"
                                        class="px-3 py-1 bg-red-800/50 text-white rounded-full text-sm"
                                    >
                                        {{ genre.name }}
                                    </span>
                                </div>

                                <p class="text-gray-200 text-lg max-w-2xl leading-relaxed">
                                    {{ movie.overview }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-12">
                <UTabs
                    v-model="activeTab"
                    :items="items"
                    :content="false"
                    size="md"
                    color="neutral"
                    variant="pill"
                    class="bg-gray-800/50 rounded-full"
                />
            </div>
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 space-y-12">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div class="bg-gray-800/50 rounded-lg p-4">
                        <p class="text-gray-400 text-sm mb-2">
                            {{ t('movies.detail.status') }}
                        </p>
                        <p class="text-white font-semibold">
                            {{ movie.status }}
                        </p>
                    </div>

                    <div class="bg-gray-800/50 rounded-lg p-4">
                        <p class="text-gray-400 text-sm mb-2">
                            {{ t('movies.detail.budget') }}
                        </p>
                        <p class="text-white font-semibold">
                            {{ movie.budget ? `$${(movie.budget / 1000000).toFixed(1)}M` : 'N/A' }}
                        </p>
                    </div>

                    <div class="bg-gray-800/50 rounded-lg p-4">
                        <p class="text-gray-400 text-sm mb-2">
                            {{ t('movies.detail.revenue') }}
                        </p>
                        <p class="text-white font-semibold">
                            {{
                                movie.revenue ? `$${(movie.revenue / 1000000).toFixed(1)}M` : 'N/A'
                            }}
                        </p>
                    </div>

                    <div class="bg-gray-800/50 rounded-lg p-4">
                        <p class="text-gray-400 text-sm mb-2">
                            {{ t('movies.detail.language') }}
                        </p>
                        <p class="text-white font-semibold uppercase">
                            {{ movie.original_language }}
                        </p>
                    </div>
                </div>

                <section v-if="director || cast.length > 0">
                    <h2 class="text-2xl font-bold text-white mb-6">
                        {{ t('movies.detail.cast') }}
                    </h2>

                    <div v-if="director" class="mb-8">
                        <h3 class="text-lg font-semibold text-white mb-4">
                            {{ t('movies.detail.director') }}
                        </h3>
                        <div class="bg-gray-800/50 rounded-lg p-4">
                            <p class="text-white font-medium">
                                {{ director.name }}
                            </p>
                        </div>
                    </div>

                    <div v-if="cast.length > 0">
                        <h3 class="text-lg font-semibold text-white mb-4">
                            {{ t('movies.detail.mainActors') }}
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div
                                v-for="actor in cast"
                                :key="actor.id"
                                class="bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors"
                            >
                                <div class="aspect-square bg-gray-700 overflow-hidden">
                                    <img
                                        v-if="actor.profile_path"
                                        :src="getImageUrl(actor.profile_path, 'w185')"
                                        :alt="actor.name"
                                        class="w-full h-full object-cover"
                                    />
                                    <div
                                        v-else
                                        class="w-full h-full flex items-center justify-center"
                                    >
                                        <UIcon
                                            name="i-heroicons-user"
                                            class="w-8 h-8 text-gray-500"
                                        />
                                    </div>
                                </div>
                                <div class="p-3">
                                    <p class="text-white font-medium text-sm truncate">
                                        {{ actor.name }}
                                    </p>
                                    <p class="text-gray-400 text-xs truncate">
                                        {{ actor.character }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="similar.length > 0">
                    <h2 class="text-2xl font-bold text-white mb-6">
                        {{ t('movies.detail.similar') }}
                    </h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <MoviesMovieCard
                            v-for="film in similar.slice(0, 12)"
                            :key="film.id"
                            :movie="film"
                        />
                    </div>
                </section>
            </div>
        </div>

        <div v-else class="flex items-center justify-center min-h-screen">
            <p class="text-white text-xl">Film non trouvé</p>
        </div>

        <Footer mode="app" />
    </div>
</template>
