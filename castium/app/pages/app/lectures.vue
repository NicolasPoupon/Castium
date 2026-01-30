<script setup lang="ts">
import { useI18n } from '#imports'

const { t } = useI18n()

definePageMeta({
    title: 'Lectures',
})

const {
    videos,
    currentVideo,
    loading,
    hasPermission,
    continueWatching,
    favoriteVideos,
    selectFolder,
    restoreFolderAccess,
    playVideo,
    stopVideo,
    saveProgress,
    getProgress,
    toggleFavorite,
    isFavorite,
    formatSize,
    formatDuration,
    scanForVideos,
    usesFallback,
    needsReauthorization,
    savedFolderName,
    reauthorizeAccess,
} = useLocalVideos()

const videoRef = ref<HTMLVideoElement | null>(null)
const videoUrl = ref<string | null>(null)
const showPlayer = ref(false)
const videoDuration = ref(0)
const currentTime = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const isFullscreen = ref(false)
const showControls = ref(true)
const controlsTimeout = ref<NodeJS.Timeout | null>(null)
const searchQuery = ref('')

// Filter videos by search
const filteredVideos = computed(() => {
    if (!searchQuery.value) return videos.value
    const query = searchQuery.value.toLowerCase()
    return videos.value.filter((v) => v.name.toLowerCase().includes(query))
})

// Try to restore folder access on mount
onMounted(async () => {
    await restoreFolderAccess()
})

// Handle reauthorization
const handleReauthorize = async () => {
    await reauthorizeAccess()
}

// Handle folder selection
const handleSelectFolder = async () => {
    await selectFolder()
}

// Handle video click
const handleVideoClick = async (video: any) => {
    const url = await playVideo(video)
    if (url) {
        videoUrl.value = url
        showPlayer.value = true
        // Wait for video element to be ready
        await nextTick()
        if (videoRef.value) {
            const savedProgress = getProgress(video.path)
            if (savedProgress > 0) {
                videoRef.value.currentTime = savedProgress
            }
            videoRef.value.play()
        }
    }
}

// Close video player
const closePlayer = () => {
    if (videoRef.value && currentVideo.value) {
        saveProgress(currentVideo.value.path, videoRef.value.currentTime)
    }
    if (videoUrl.value) {
        URL.revokeObjectURL(videoUrl.value)
    }
    videoUrl.value = null
    showPlayer.value = false
    stopVideo()
}

// Video event handlers
const onLoadedMetadata = () => {
    if (videoRef.value) {
        videoDuration.value = videoRef.value.duration
    }
}

const onTimeUpdate = () => {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime
    }
}

const onEnded = () => {
    if (currentVideo.value) {
        saveProgress(currentVideo.value.path, 0)
    }
    closePlayer()
}

// Save progress periodically
const saveProgressPeriodically = () => {
    if (videoRef.value && currentVideo.value && videoRef.value.currentTime > 0) {
        saveProgress(currentVideo.value.path, videoRef.value.currentTime)
    }
}

// Save progress every 10 seconds
let progressInterval: NodeJS.Timeout | null = null
watch(showPlayer, (isOpen) => {
    if (isOpen) {
        progressInterval = setInterval(saveProgressPeriodically, 10000)
    } else if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
    }
})

// Controls visibility
const showControlsTemporarily = () => {
    showControls.value = true
    if (controlsTimeout.value) {
        clearTimeout(controlsTimeout.value)
    }
    controlsTimeout.value = setTimeout(() => {
        if (videoRef.value && !videoRef.value.paused) {
            showControls.value = false
        }
    }, 3000)
}

// Toggle play/pause
const togglePlay = () => {
    if (videoRef.value) {
        if (videoRef.value.paused) {
            videoRef.value.play()
        } else {
            videoRef.value.pause()
        }
    }
}

// Seek
const seek = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (videoRef.value) {
        videoRef.value.currentTime = parseFloat(target.value)
    }
}

// Toggle mute
const toggleMute = () => {
    if (videoRef.value) {
        videoRef.value.muted = !videoRef.value.muted
        isMuted.value = videoRef.value.muted
    }
}

// Change volume
const changeVolume = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newVolume = parseFloat(target.value)
    if (videoRef.value) {
        videoRef.value.volume = newVolume
        volume.value = newVolume
        isMuted.value = newVolume === 0
    }
}

// Toggle fullscreen
const toggleFullscreen = async () => {
    const playerContainer = document.querySelector('.video-player-container')
    if (!playerContainer) return

    if (!document.fullscreenElement) {
        await playerContainer.requestFullscreen()
        isFullscreen.value = true
    } else {
        await document.exitFullscreen()
        isFullscreen.value = false
    }
}

// Skip forward/backward
const skip = (seconds: number) => {
    if (videoRef.value) {
        videoRef.value.currentTime = Math.max(
            0,
            Math.min(videoRef.value.duration, videoRef.value.currentTime + seconds)
        )
    }
}

// Keyboard shortcuts
const handleKeydown = (e: KeyboardEvent) => {
    if (!showPlayer.value) return

    switch (e.key) {
        case ' ':
        case 'k':
            e.preventDefault()
            togglePlay()
            break
        case 'f':
            e.preventDefault()
            toggleFullscreen()
            break
        case 'm':
            e.preventDefault()
            toggleMute()
            break
        case 'ArrowLeft':
            e.preventDefault()
            skip(-10)
            break
        case 'ArrowRight':
            e.preventDefault()
            skip(10)
            break
        case 'Escape':
            e.preventDefault()
            closePlayer()
            break
    }
    showControlsTemporarily()
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    if (progressInterval) clearInterval(progressInterval)
    if (controlsTimeout.value) clearTimeout(controlsTimeout.value)
})

// Get thumbnail placeholder
const getVideoThumbnail = (video: any) => {
    // Use a placeholder based on video name
    const colors = [
        '#dc2626',
        '#ea580c',
        '#d97706',
        '#65a30d',
        '#16a34a',
        '#0891b2',
        '#2563eb',
        '#7c3aed',
        '#c026d3',
    ]
    const index = video.name.length % colors.length
    return colors[index]
}

// Format video name (remove extension)
const formatVideoName = (name: string) => {
    return name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ')
}
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col">
        <Navbar mode="app" />

        <div class="pt-24 pb-12">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- No folder selected state -->
                <div
                    v-if="!hasPermission"
                    class="flex flex-col items-center justify-center min-h-[60vh]"
                >
                    <div class="text-center max-w-2xl">
                        <div class="mb-8">
                            <UIcon
                                name="i-heroicons-folder-open"
                                class="w-24 h-24 text-purple-500 mx-auto mb-6"
                            />
                            <h1 class="text-4xl font-bold text-white mb-4">
                                {{ t('lectures.hero.title') }}
                            </h1>
                            <p class="text-gray-400 text-lg mb-8">
                                {{ t('lectures.hero.description') }}
                            </p>
                        </div>

                        <!-- Show reauthorization button if folder was previously selected -->
                        <div v-if="needsReauthorization && savedFolderName" class="mb-6">
                            <p class="text-gray-300 mb-4">
                                {{ t('lectures.hero.previousFolder') }}: 
                                <span class="text-purple-400 font-medium">{{ savedFolderName }}</span>
                            </p>
                            <UButton
                                icon="i-heroicons-arrow-path"
                                size="xl"
                                :label="t('lectures.hero.reauthorize')"
                                :loading="loading"
                                class="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                @click="handleReauthorize"
                            />
                            <p class="text-gray-500 text-sm mt-4">{{ t('lectures.hero.orSelectNew') }}</p>
                        </div>

                        <UButton
                            icon="i-heroicons-folder-plus"
                            size="xl"
                            :label="t('lectures.hero.selectFolder')"
                            :loading="loading"
                            :variant="needsReauthorization ? 'outline' : 'solid'"
                            :class="needsReauthorization ? 'border-purple-600 text-purple-400 hover:bg-purple-600/20' : 'bg-purple-600 hover:bg-purple-700 text-white font-semibold'"
                            @click="handleSelectFolder"
                        />

                        <p class="text-gray-500 text-sm mt-6">
                            {{ t('lectures.hero.permissionNotice') }}
                        </p>
                    </div>
                </div>

                <!-- Videos library -->
                <div v-else>
                    <!-- Fallback mode notice -->
                    <div
                        v-if="usesFallback"
                        class="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4 mb-6"
                    >
                        <div class="flex items-start gap-3">
                            <UIcon
                                name="i-heroicons-exclamation-triangle"
                                class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                            />
                            <div>
                                <p class="text-amber-200 font-medium">
                                    {{ t('lectures.fallback.title') }}
                                </p>
                                <p class="text-amber-300/70 text-sm mt-1">
                                    {{ t('lectures.fallback.description') }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Header with search and refresh -->
                    <div
                        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
                    >
                        <h1 class="text-4xl font-bold text-white">
                            {{ t('lectures.library.title') }}
                        </h1>
                        <div class="flex items-center gap-4">
                            <UInput
                                v-model="searchQuery"
                                icon="i-heroicons-magnifying-glass"
                                size="lg"
                                :placeholder="t('lectures.library.search')"
                                class="w-full md:w-80"
                            />
                            <UButton
                                icon="i-heroicons-arrow-path"
                                color="neutral"
                                variant="ghost"
                                :loading="loading"
                                @click="scanForVideos"
                            />
                            <UButton
                                icon="i-heroicons-folder-open"
                                color="neutral"
                                variant="ghost"
                                @click="handleSelectFolder"
                            />
                        </div>
                    </div>

                    <!-- Continue Watching Section -->
                    <div v-if="continueWatching.length > 0" class="mb-12">
                        <h2 class="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                            <UIcon name="i-heroicons-play-circle" class="w-6 h-6" />
                            {{ t('lectures.sections.continueWatching') }}
                        </h2>
                        <div
                            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                        >
                            <div
                                v-for="video in continueWatching.slice(0, 6)"
                                :key="video.path"
                                class="group relative cursor-pointer"
                                @click="handleVideoClick(video)"
                            >
                                <div
                                    class="aspect-video rounded-lg overflow-hidden relative"
                                    :style="{ backgroundColor: getVideoThumbnail(video) }"
                                >
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <UIcon
                                            name="i-heroicons-film"
                                            class="w-12 h-12 text-white/50"
                                        />
                                    </div>
                                    <!-- Progress bar -->
                                    <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                                        <div
                                            class="h-full bg-purple-500"
                                            :style="{
                                                width: `${(getProgress(video.path) / 100) * 100}%`,
                                            }"
                                        />
                                    </div>
                                    <!-- Play overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <UIcon
                                            name="i-heroicons-play"
                                            class="w-12 h-12 text-white"
                                        />
                                    </div>
                                </div>
                                <p class="mt-2 text-sm text-gray-300 truncate">
                                    {{ formatVideoName(video.name) }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Favorites Section -->
                    <div v-if="favoriteVideos.length > 0" class="mb-12">
                        <h2 class="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                            <UIcon name="i-heroicons-heart" class="w-6 h-6 text-red-500" />
                            {{ t('lectures.sections.favorites') }}
                        </h2>
                        <div
                            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                        >
                            <div
                                v-for="video in favoriteVideos"
                                :key="video.path"
                                class="group relative cursor-pointer"
                                @click="handleVideoClick(video)"
                            >
                                <div
                                    class="aspect-video rounded-lg overflow-hidden relative"
                                    :style="{ backgroundColor: getVideoThumbnail(video) }"
                                >
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <UIcon
                                            name="i-heroicons-film"
                                            class="w-12 h-12 text-white/50"
                                        />
                                    </div>
                                    <!-- Favorite badge -->
                                    <div class="absolute top-2 right-2">
                                        <UIcon
                                            name="i-heroicons-heart-solid"
                                            class="w-5 h-5 text-red-500"
                                        />
                                    </div>
                                    <!-- Play overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <UIcon
                                            name="i-heroicons-play"
                                            class="w-12 h-12 text-white"
                                        />
                                    </div>
                                </div>
                                <p class="mt-2 text-sm text-gray-300 truncate">
                                    {{ formatVideoName(video.name) }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- All Videos Section -->
                    <div>
                        <h2 class="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                            <UIcon name="i-heroicons-film" class="w-6 h-6" />
                            {{ t('lectures.sections.allVideos') }}
                            <span class="text-gray-500 text-lg font-normal">
                                ({{ filteredVideos.length }})
                            </span>
                        </h2>

                        <div v-if="filteredVideos.length === 0" class="text-center py-12">
                            <UIcon
                                name="i-heroicons-film"
                                class="w-16 h-16 text-gray-600 mx-auto mb-4"
                            />
                            <p class="text-gray-400">{{ t('lectures.library.noVideos') }}</p>
                        </div>

                        <div
                            v-else
                            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                        >
                            <div
                                v-for="video in filteredVideos"
                                :key="video.path"
                                class="group relative cursor-pointer"
                            >
                                <div
                                    class="aspect-video rounded-lg overflow-hidden relative"
                                    :style="{ backgroundColor: getVideoThumbnail(video) }"
                                    @click="handleVideoClick(video)"
                                >
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <UIcon
                                            name="i-heroicons-film"
                                            class="w-12 h-12 text-white/50"
                                        />
                                    </div>
                                    <!-- Play overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <UIcon
                                            name="i-heroicons-play"
                                            class="w-12 h-12 text-white"
                                        />
                                    </div>
                                </div>
                                <div class="flex items-start justify-between mt-2">
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm text-gray-300 truncate">
                                            {{ formatVideoName(video.name) }}
                                        </p>
                                        <p class="text-xs text-gray-500">
                                            {{ formatSize(video.size) }}
                                        </p>
                                    </div>
                                    <UButton
                                        :icon="
                                            isFavorite(video.path)
                                                ? 'i-heroicons-heart-solid'
                                                : 'i-heroicons-heart'
                                        "
                                        size="xs"
                                        color="neutral"
                                        variant="ghost"
                                        :class="
                                            isFavorite(video.path)
                                                ? 'text-red-500'
                                                : 'text-gray-400'
                                        "
                                        @click.stop="toggleFavorite(video.path)"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Video Player Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showPlayer && videoUrl"
                    class="fixed inset-0 z-[100] bg-black video-player-container"
                    @mousemove="showControlsTemporarily"
                    @click="togglePlay"
                >
                    <video
                        ref="videoRef"
                        :src="videoUrl"
                        class="w-full h-full object-contain"
                        @loadedmetadata="onLoadedMetadata"
                        @timeupdate="onTimeUpdate"
                        @ended="onEnded"
                        @click.stop="togglePlay"
                    />

                    <!-- Controls overlay -->
                    <Transition name="fade">
                        <div
                            v-if="showControls"
                            class="absolute inset-0 pointer-events-none"
                            @click.stop
                        >
                            <!-- Top bar -->
                            <div
                                class="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 pointer-events-auto"
                            >
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <UButton
                                            icon="i-heroicons-arrow-left"
                                            color="neutral"
                                            variant="ghost"
                                            size="lg"
                                            @click.stop="closePlayer"
                                        />
                                        <div>
                                            <h3 class="text-white font-semibold text-lg">
                                                {{
                                                    currentVideo
                                                        ? formatVideoName(currentVideo.name)
                                                        : ''
                                                }}
                                            </h3>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <UButton
                                            :icon="
                                                currentVideo && isFavorite(currentVideo.path)
                                                    ? 'i-heroicons-heart-solid'
                                                    : 'i-heroicons-heart'
                                            "
                                            color="neutral"
                                            variant="ghost"
                                            size="lg"
                                            :class="
                                                currentVideo && isFavorite(currentVideo.path)
                                                    ? 'text-red-500'
                                                    : ''
                                            "
                                            @click.stop="
                                                currentVideo && toggleFavorite(currentVideo.path)
                                            "
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- Bottom controls -->
                            <div
                                class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-auto"
                            >
                                <!-- Progress bar -->
                                <div class="mb-4">
                                    <input
                                        type="range"
                                        min="0"
                                        :max="videoDuration"
                                        :value="currentTime"
                                        class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        @input="seek"
                                        @click.stop
                                    />
                                    <div class="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>{{ formatDuration(currentTime) }}</span>
                                        <span>{{ formatDuration(videoDuration) }}</span>
                                    </div>
                                </div>

                                <!-- Control buttons -->
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <UButton
                                            icon="i-heroicons-backward"
                                            color="neutral"
                                            variant="ghost"
                                            size="lg"
                                            @click.stop="skip(-10)"
                                        />
                                        <UButton
                                            :icon="
                                                videoRef?.paused
                                                    ? 'i-heroicons-play'
                                                    : 'i-heroicons-pause'
                                            "
                                            color="neutral"
                                            variant="ghost"
                                            size="xl"
                                            class="!w-14 !h-14"
                                            @click.stop="togglePlay"
                                        />
                                        <UButton
                                            icon="i-heroicons-forward"
                                            color="neutral"
                                            variant="ghost"
                                            size="lg"
                                            @click.stop="skip(10)"
                                        />
                                    </div>

                                    <div class="flex items-center gap-4">
                                        <!-- Volume control -->
                                        <div class="flex items-center gap-2">
                                            <UButton
                                                :icon="
                                                    isMuted || volume === 0
                                                        ? 'i-heroicons-speaker-x-mark'
                                                        : 'i-heroicons-speaker-wave'
                                                "
                                                color="neutral"
                                                variant="ghost"
                                                size="lg"
                                                @click.stop="toggleMute"
                                            />
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                :value="isMuted ? 0 : volume"
                                                class="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                @input="changeVolume"
                                                @click.stop
                                            />
                                        </div>

                                        <UButton
                                            :icon="
                                                isFullscreen
                                                    ? 'i-heroicons-arrows-pointing-in'
                                                    : 'i-heroicons-arrows-pointing-out'
                                            "
                                            color="neutral"
                                            variant="ghost"
                                            size="lg"
                                            @click.stop="toggleFullscreen"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #a855f7;
    cursor: pointer;
}

input[type='range']::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #a855f7;
    cursor: pointer;
    border: none;
}
</style>
