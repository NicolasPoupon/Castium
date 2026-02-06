<script setup lang="ts">
const {
    playbackState,
    isActive,
    togglePlay,
    stop,
    seek,
    skip,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    nextTrack,
    previousTrack,
    formatTime,
} = useGlobalPlayer()

// Speed options
const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const showSpeedMenu = ref(false)
const showVolumeSlider = ref(false)

// Progress bar interaction
const progressBarRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)

const handleProgressClick = (e: MouseEvent) => {
    if (!progressBarRef.value) return
    const rect = progressBarRef.value.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * playbackState.value.duration
    seek(newTime)
}

const handleProgressDrag = (e: MouseEvent) => {
    if (!isDragging.value || !progressBarRef.value) return
    const rect = progressBarRef.value.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percent * playbackState.value.duration
    seek(newTime)
}

const startDrag = () => {
    isDragging.value = true
    document.addEventListener('mousemove', handleProgressDrag)
    document.addEventListener('mouseup', stopDrag)
}

const stopDrag = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleProgressDrag)
    document.removeEventListener('mouseup', stopDrag)
}

// Progress percentage
const progressPercent = computed(() => {
    if (!playbackState.value.duration) return 0
    return (playbackState.value.currentTime / playbackState.value.duration) * 100
})

// Volume percentage
const volumePercent = computed(() => playbackState.value.volume * 100)

// Media type icon
const mediaTypeIcon = computed(() => {
    switch (playbackState.value.mediaType) {
        case 'music':
            return 'i-heroicons-musical-note'
        case 'radio':
            return 'i-heroicons-radio'
        case 'podcast':
            return 'i-heroicons-microphone'
        default:
            return 'i-heroicons-speaker-wave'
    }
})

// Media type color
const mediaTypeColor = computed(() => {
    switch (playbackState.value.mediaType) {
        case 'music':
            return 'text-green-400'
        case 'radio':
            return 'text-yellow-400'
        case 'podcast':
            return 'text-pink-400'
        default:
            return 'text-white'
    }
})

// Close volume slider on click outside
const handleClickOutside = () => {
    showVolumeSlider.value = false
    showSpeedMenu.value = false
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
    <Teleport to="body">
        <Transition name="slide-up">
            <div
                v-if="isActive"
                class="fixed bottom-0 left-0 right-0 z-[90] bg-gray-900/95 backdrop-blur-lg border-t border-gray-800"
            >
                <!-- Progress bar -->
                <div
                    ref="progressBarRef"
                    class="h-1 bg-gray-700 cursor-pointer group"
                    @click="handleProgressClick"
                    @mousedown="startDrag"
                >
                    <div
                        class="h-full bg-gradient-to-r from-green-500 to-green-400 relative transition-all"
                        :style="{ width: `${progressPercent}%` }"
                    >
                        <div
                            class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    </div>
                </div>

                <div class="flex items-center justify-between px-4 py-3 gap-4">
                    <!-- Track info -->
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <!-- Cover art or icon -->
                        <div
                            class="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden"
                        >
                            <img
                                v-if="playbackState.currentTrack?.coverArt"
                                :src="playbackState.currentTrack.coverArt"
                                :alt="playbackState.currentTrack.title"
                                class="w-full h-full object-cover"
                            />
                            <UIcon
                                v-else
                                :name="mediaTypeIcon"
                                :class="['w-6 h-6', mediaTypeColor]"
                            />
                        </div>

                        <!-- Title & artist -->
                        <div class="min-w-0 flex-1">
                            <p class="text-white font-medium truncate">
                                {{ playbackState.currentTrack?.title || 'Unknown' }}
                            </p>
                            <p class="text-gray-400 text-sm truncate">
                                {{
                                    playbackState.currentTrack?.artist ||
                                    playbackState.currentTrack?.stationName ||
                                    playbackState.currentTrack?.showName ||
                                    ''
                                }}
                            </p>
                        </div>
                    </div>

                    <!-- Playback controls -->
                    <div class="flex items-center gap-2">
                        <!-- Previous (music only) -->
                        <button
                            v-if="playbackState.mediaType === 'music'"
                            class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            @click="previousTrack"
                        >
                            <UIcon name="i-heroicons-backward" class="w-5 h-5" />
                        </button>

                        <!-- Skip back 15s (podcasts) -->
                        <button
                            v-if="playbackState.mediaType === 'podcast'"
                            class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            @click="skip(-15)"
                        >
                            <span class="text-xs font-bold">-15</span>
                        </button>

                        <!-- Play/Pause -->
                        <button
                            class="p-3 rounded-full bg-white text-gray-900 hover:scale-105 transition-transform"
                            :disabled="playbackState.isLoading"
                            @click="togglePlay"
                        >
                            <UIcon
                                v-if="playbackState.isLoading"
                                name="i-heroicons-arrow-path"
                                class="w-6 h-6 animate-spin"
                            />
                            <UIcon
                                v-else-if="playbackState.isPlaying"
                                name="i-heroicons-pause-solid"
                                class="w-6 h-6"
                            />
                            <UIcon v-else name="i-heroicons-play-solid" class="w-6 h-6" />
                        </button>

                        <!-- Skip forward 30s (podcasts) -->
                        <button
                            v-if="playbackState.mediaType === 'podcast'"
                            class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            @click="skip(30)"
                        >
                            <span class="text-xs font-bold">+30</span>
                        </button>

                        <!-- Next (music only) -->
                        <button
                            v-if="playbackState.mediaType === 'music'"
                            class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            @click="nextTrack"
                        >
                            <UIcon name="i-heroicons-forward" class="w-5 h-5" />
                        </button>
                    </div>

                    <!-- Time display -->
                    <div
                        v-if="playbackState.mediaType !== 'radio'"
                        class="hidden sm:flex items-center gap-2 text-sm text-gray-400 min-w-[100px]"
                    >
                        <span>{{ formatTime(playbackState.currentTime) }}</span>
                        <span>/</span>
                        <span>{{ formatTime(playbackState.duration) }}</span>
                    </div>

                    <!-- Right controls -->
                    <div class="flex items-center gap-2">
                        <!-- Speed control -->
                        <div class="relative" @click.stop>
                            <button
                                class="px-2 py-1 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                @click="showSpeedMenu = !showSpeedMenu"
                            >
                                {{ playbackState.playbackSpeed }}x
                            </button>
                            <Transition name="fade">
                                <div
                                    v-if="showSpeedMenu"
                                    class="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-xl py-2 min-w-[80px]"
                                >
                                    <button
                                        v-for="speed in speedOptions"
                                        :key="speed"
                                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                                        :class="
                                            playbackState.playbackSpeed === speed
                                                ? 'text-green-400'
                                                : 'text-white'
                                        "
                                        @click="setPlaybackSpeed(speed); showSpeedMenu = false"
                                    >
                                        {{ speed }}x
                                    </button>
                                </div>
                            </Transition>
                        </div>

                        <!-- Volume control -->
                        <div class="relative hidden sm:block" @click.stop>
                            <button
                                class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                @click="showVolumeSlider = !showVolumeSlider"
                            >
                                <UIcon
                                    :name="
                                        playbackState.isMuted || playbackState.volume === 0
                                            ? 'i-heroicons-speaker-x-mark'
                                            : playbackState.volume < 0.5
                                              ? 'i-heroicons-speaker-wave'
                                              : 'i-heroicons-speaker-wave'
                                    "
                                    class="w-5 h-5"
                                />
                            </button>
                            <Transition name="fade">
                                <div
                                    v-if="showVolumeSlider"
                                    class="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-xl p-4 w-12"
                                >
                                    <div class="h-24 relative flex justify-center">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            :value="volumePercent"
                                            class="volume-slider"
                                            @input="
                                                setVolume(
                                                    ($event.target as HTMLInputElement)
                                                        .valueAsNumber / 100
                                                )
                                            "
                                        />
                                    </div>
                                    <button class="w-full mt-2 p-1 text-center" @click="toggleMute">
                                        <UIcon
                                            :name="
                                                playbackState.isMuted
                                                    ? 'i-heroicons-speaker-x-mark'
                                                    : 'i-heroicons-speaker-wave'
                                            "
                                            class="w-4 h-4 text-gray-400"
                                        />
                                    </button>
                                </div>
                            </Transition>
                        </div>

                        <!-- Close button -->
                        <button
                            class="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            @click="stop"
                        >
                            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.volume-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 96px;
    height: 4px;
    background: #4b5563;
    border-radius: 2px;
    transform: rotate(-90deg);
    transform-origin: center center;
    position: absolute;
    top: 50%;
    left: 50%;
    margin-left: -48px;
    margin-top: -2px;
}

.volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
}

.volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    border: none;
}
</style>
