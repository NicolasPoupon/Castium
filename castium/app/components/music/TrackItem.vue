<script setup lang="ts">
const props = defineProps<{
    track: {
        id: string
        name: string
        artists: Array<{ name: string }>
        album: {
            name: string
            images: Array<{ url: string }>
        }
        duration_ms: number
        uri: string
    }
    index: number
}>()

const emit = defineEmits<{
    play: [uri: string]
}>()

const albumArt = computed(
    () => props.track.album.images?.[2]?.url || props.track.album.images?.[0]?.url
)
const artistNames = computed(() => props.track.artists.map((a) => a.name).join(', '))
const duration = computed(() => {
    const minutes = Math.floor(props.track.duration_ms / 60000)
    const seconds = Math.floor((props.track.duration_ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
})
</script>

<template>
    <div
        class="group grid grid-cols-[auto_1fr_1fr_auto] gap-4 items-center p-2 rounded-md hover:bg-gray-800/50 transition-colors cursor-pointer"
        @click="emit('play', track.uri)"
    >
        <div class="flex items-center gap-3 w-12">
            <span class="text-gray-400 text-sm group-hover:hidden">{{ index }}</span>
            <UIcon
                name="i-heroicons-play-solid"
                class="w-4 h-4 text-white hidden group-hover:block"
            />
        </div>

        <div class="flex items-center gap-3 min-w-0">
            <img
                v-if="albumArt"
                :src="albumArt"
                :alt="track.album.name"
                class="w-10 h-10 rounded"
            />
            <div class="min-w-0">
                <p class="text-white font-medium truncate">{{ track.name }}</p>
                <p class="text-gray-400 text-sm truncate">{{ artistNames }}</p>
            </div>
        </div>

        <div class="text-gray-400 text-sm truncate hidden md:block">
            {{ track.album.name }}
        </div>

        <div class="text-gray-400 text-sm">
            {{ duration }}
        </div>
    </div>
</template>
