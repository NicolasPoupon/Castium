<script setup lang="ts">
const props = defineProps<{
    movie: {
        id: number
        title?: string
        name?: string
        poster_path: string | null
        backdrop_path: string | null
        vote_average: number
        release_date?: string
        first_air_date?: string
        overview: string
    }
}>()

const { getImageUrl } = useTMDB()
const imageUrl = computed(() => getImageUrl(props.movie.poster_path, 'w500'))
const title = computed(() => props.movie.title || props.movie.name || 'Sans titre')
const releaseYear = computed(() => {
    const date = props.movie.release_date || props.movie.first_air_date
    return date ? new Date(date).getFullYear() : ''
})
</script>

<template>
    <div
        class="group relative overflow-hidden rounded-lg bg-gray-800/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
    >
        <div class="aspect-[2/3] overflow-hidden">
            <img
                :src="imageUrl"
                :alt="title"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
        </div>

        <div
            class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4"
        >
            <h3 class="text-white font-semibold text-lg mb-1">{{ title }}</h3>
            <div class="flex items-center gap-3 text-sm text-gray-300 mb-2">
                <span v-if="releaseYear">{{ releaseYear }}</span>
                <div class="flex items-center gap-1">
                    <UIcon name="i-heroicons-star-solid" class="w-4 h-4 text-yellow-400" />
                    <span>{{ movie.vote_average.toFixed(1) }}</span>
                </div>
            </div>
            <p class="text-gray-400 text-xs line-clamp-3">{{ movie.overview }}</p>
        </div>

        <div
            class="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1"
        >
            <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-400" />
            <span class="text-white text-xs font-medium">{{ movie.vote_average.toFixed(1) }}</span>
        </div>
    </div>
</template>
