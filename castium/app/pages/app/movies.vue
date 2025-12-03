<script setup lang="ts">
import { useI18n } from '#imports'

const { t } = useI18n()
const { getTrending, getPopular, getTopRated } = useTMDB()

const heroMovie = ref<any>(null)
const trendingMovies = ref<any[]>([])
const popularMovies = ref<any[]>([])
const topRatedMovies = ref<any[]>([])
const isLoading = ref(true)

const searchQuery = ref('')

onMounted(async () => {
    try {
        const [trending, popular, topRated] = await Promise.all([
            getTrending('movie', 'week'),
            getPopular('movie'),
            getTopRated('movie'),
        ])

        trendingMovies.value = trending.results || []
        popularMovies.value = popular.results || []
        topRatedMovies.value = topRated.results || []

        if (trendingMovies.value.length > 0) {
            heroMovie.value = trendingMovies.value[0]
        }
    } catch (error) {
        console.error('Error loading movies:', error)
    } finally {
        isLoading.value = false
    }
})
</script>

<template>
    <div class="min-h-screen bg-gray-900">
        <Navbar mode="app" />
        <!-- <AppNav /> -->

        <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
            <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-red-800 animate-spin" />
        </div>

        <div v-else>
            <MoviesHeroSection v-if="heroMovie" :movie="heroMovie" />

            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-12">
                <div class="mb-8">
                    <UInput
                        v-model="searchQuery"
                        icon="i-heroicons-magnifying-glass"
                        size="lg"
                        color="neutral"
                        placeholder="Rechercher un film ou une série..."
                        class="w-full max-w-md bg-gray-800 text-white placeholder-gray-400"
                    />
                </div>

                <section v-if="trendingMovies.length > 0">
                    <h2 class="text-2xl font-bold text-white mb-6">Tendances de la semaine</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <MoviesMovieCard
                            v-for="movie in trendingMovies.slice(1, 13)"
                            :key="movie.id"
                            :movie="movie"
                        />
                    </div>
                </section>

                <section v-if="popularMovies.length > 0">
                    <h2 class="text-2xl font-bold text-white mb-6">Films populaires</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <MoviesMovieCard
                            v-for="movie in popularMovies.slice(0, 12)"
                            :key="movie.id"
                            :movie="movie"
                        />
                    </div>
                </section>

                <section v-if="topRatedMovies.length > 0">
                    <h2 class="text-2xl font-bold text-white mb-6">Les mieux notés</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <MoviesMovieCard
                            v-for="movie in topRatedMovies.slice(0, 12)"
                            :key="movie.id"
                            :movie="movie"
                        />
                    </div>
                </section>
            </div>
        </div>

        <Footer mode="app" />
    </div>
</template>
