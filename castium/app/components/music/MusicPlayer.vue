<script setup lang="ts">
const props = defineProps<{
    currentTrack?: {
        id: string
        name: string
        uri: string
        duration_ms: number
        album: {
            name: string
            images: Array<{ url: string }>
        }
        artists: Array<{ name: string }>
    }
    isPlaying: boolean
    progress: number
    duration: number
}>()

const emit = defineEmits<{
    play: []
    pause: []
    next: []
    previous: []
    seek: [position: number]
    volumeChange: [volume: number]
}>()

const volume = ref(70)
const isDragging = ref(false)

const albumArt = computed(() => props.currentTrack?.album.images?.[1]?.url)
const artistNames = computed(() => props.currentTrack?.artists.map((a) => a.name).join(', '))
const progressPercent = computed(() => (props.progress / props.duration) * 100 || 0)

const formatTime = (ms: number) => {
    if (!ms || isNaN(ms)) return '0:00'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const handleProgressClick = (e: MouseEvent) => {
    const progressBar = e.currentTarget as HTMLElement
    const rect = progressBar.getBoundingClientRect()
    const newPosition = ((e.clientX - rect.left) / rect.width) * props.duration
    emit('seek', newPosition)
}

watch(volume, (newVolume) => {
    emit('volumeChange', newVolume)
})
</script>

<template>
    <div class="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 z-50">
        <div v-if="currentTrack" class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
            <div class="flex items-center gap-4">
                <img
                    v-if="albumArt"
                    :src="albumArt"
                    :alt="currentTrack.album.name"
                    class="w-16 h-16 rounded shadow-lg object-cover flex-shrink-0"
                />

                <div class="flex-1 min-w-0">
                    <p class="text-white font-semibold truncate">{{ currentTrack.name }}</p>
                    <p class="text-gray-400 text-sm truncate">{{ artistNames }}</p>

                    <div class="mt-2 flex items-center gap-2">
                        <span class="text-xs text-gray-400 flex-shrink-0">{{ formatTime(progress) }}</span>
                        <div
                            class="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer hover:h-1.5 transition-all"
                            @click="handleProgressClick"
                        >
                            <div
                                class="h-full bg-green-600 rounded-full"
                                :style="{ width: `${progressPercent}%` }"
                            />
                        </div>
                        <span class="text-xs text-gray-400 flex-shrink-0">
                            {{ formatTime(duration) }}
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-3 flex-shrink-0">
                    <UButton
                        icon="i-heroicons-backward-solid"
                        color="gray"
                        variant="ghost"
                        size="sm"
                        @click="emit('previous')"
                    />

                    <UButton
                        :icon="isPlaying ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
                        color="gray"
                        variant="ghost"
                        size="lg"
                        class="!p-2"
                        @click="isPlaying ? emit('pause') : emit('play')"
                    />

                    <UButton
                        icon="i-heroicons-forward-solid"
                        color="gray"
                        variant="ghost"
                        size="sm"
                        @click="emit('next')"
                    />

                    <div class="flex items-center gap-2 min-w-[150px]">
                        <UIcon name="i-heroicons-speaker-wave" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <URange
                            v-model="volume"
                            :min="0"
                            :max="100"
                            :step="1"
                            class="flex-1"
                        />
                        <span class="text-xs text-gray-400 w-8 text-right flex-shrink-0">
                            {{ volume }}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="px-4 md:px-6 lg:px-8 py-4 text-center">
            <p class="text-gray-400 text-sm">Sélectionnez une musique pour commencer</p>
        </div>
    </div>
</template>
