<script setup lang="ts">
const props = defineProps<{
    movie: {
        id: number
        title?: string
        name?: string
        backdrop_path: string | null
        overview: string
        vote_average: number
        release_date?: string
        first_air_date?: string
    }
}>()

const { getImageUrl } = useTMDB()
const backdropUrl = computed(() => getImageUrl(props.movie.backdrop_path, 'original'))
const title = computed(() => props.movie.title || props.movie.name || 'Sans titre')
const releaseYear = computed(() => {
    const date = props.movie.release_date || props.movie.first_air_date
    return date ? new Date(date).getFullYear() : ''
})
</script>

<template>
    <div class="relative w-full h-[70vh] overflow-hidden">
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

        <div
            class="relative z-10 h-full flex flex-col justify-end p-8 md:p-12 lg:p-16 max-w-7xl mx-auto"
        >
            <h1 class="text-4xl md:text-6xl font-bold text-white mb-4">
                {{ title }}
            </h1>

            <div class="flex items-center gap-4 text-white mb-6">
                <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-star-solid" class="w-5 h-5 text-yellow-400" />
                    <span class="text-lg font-semibold">
                        {{ movie.vote_average.toFixed(1) }}
                    </span>
                </div>
                <span v-if="releaseYear" class="text-gray-300">
                    {{ releaseYear }}
                </span>
            </div>

            <p class="text-gray-200 text-lg max-w-2xl mb-8 line-clamp-3">
                {{ movie.overview }}
            </p>

            <div class="flex gap-4">
                <UButton
                    icon="i-heroicons-play-solid"
                    size="lg"
                    color="neutral"
                    label="Lire"
                    class="bg-white text-black hover:bg-gray-200"
                />
                <UButton
                    icon="i-heroicons-information-circle"
                    size="lg"
                    color="neutral"
                    variant="outline"
                    label="Plus d'infos"
                    class="border-white text-white hover:bg-white/10"
                />
            </div>
        </div>
    </div>
</template>
