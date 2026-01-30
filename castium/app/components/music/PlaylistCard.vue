<script setup lang="ts">
const props = defineProps<{
    playlist: {
        id: string
        name: string
        description?: string
        images: Array<{ url: string }>
        tracks?: {
            total: number
        }
    }
}>()

const emit = defineEmits<{
    play: [playlistId: string]
}>()

const imageUrl = computed(
    () => props.playlist.images?.[0]?.url || "/placeholder-music.jpg",
)
</script>

<template>
    <div
        class="group relative overflow-hidden rounded-lg bg-gray-800/50 backdrop-blur-sm transition-all duration-300 hover:bg-gray-800/80 cursor-pointer p-4"
        @click="emit('play', playlist.id)"
    >
        <div class="aspect-square overflow-hidden rounded-md mb-4 relative">
            <img
                :src="imageUrl"
                :alt="playlist.name"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
            >
                <div
                    class="w-14 h-14 bg-castium-green rounded-full flex items-center justify-center shadow-xl"
                >
                    <UIcon
                        name="i-heroicons-play-solid"
                        class="w-6 h-6 text-white ml-1"
                    />
                </div>
            </div>
        </div>

        <h3 class="text-white font-semibold text-base mb-1 line-clamp-1">
            {{ playlist.name }}
        </h3>

        <p
            v-if="playlist.description"
            class="text-gray-400 text-sm line-clamp-2 mb-2"
        >
            {{ playlist.description }}
        </p>

        <p v-if="playlist.tracks" class="text-gray-500 text-xs">
            {{ playlist.tracks.total }} titres
        </p>
    </div>
</template>
