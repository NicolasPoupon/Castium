<script setup lang="ts">
import { useI18n } from "#imports"

const { t } = useI18n()

definePageMeta({
    title: "Lectures",
    ssr: false,
})

// Local Videos
const {
    videos,
    currentVideo,
    loading: localLoading,
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

// YouTube
const {
    isAuthenticated: youtubeAuthenticated,
    loading: youtubeLoading,
    channel: youtubeChannel,
    playlists: youtubePlaylists,
    currentPlaylistVideos: youtubePlaylistVideos,
    likedVideos: youtubeLikedVideos,
    error: youtubeError,
    initialize: initializeYouTube,
    login: loginYouTube,
    logout: logoutYouTube,
    fetchPlaylists: fetchYoutubePlaylists,
    fetchPlaylistVideos: fetchYoutubePlaylistVideos,
    fetchLikedVideos: fetchYoutubeLikedVideos,
    saveWatchProgress: saveYoutubeProgress,
    getVideoProgress: getYoutubeProgress,
    formatViewCount,
    formatPublishedAt,
    getEmbedUrl,
    toggleFavorite: toggleYoutubeFavorite,
    isFavorite: isYoutubeFavorite,
} = useYouTube()

// Video Upload
const {
    uploadedVideos,
    sortedVideos: sortedUploadedVideos,
    loading: uploadLoading,
    uploading,
    uploadProgress,
    error: uploadError,
    sortBy: uploadSortBy,
    sortOrder: uploadSortOrder,
    fetchVideos: fetchUploadedVideos,
    uploadVideos,
    deleteVideo,
    updateVideoMetadata,
    getThumbnailUrl,
    formatFileSize,
    formatDuration: formatUploadDuration,
} = useVideoUpload()

// Active tab: 'local', 'youtube', or 'upload'
const activeTab = ref<"local" | "youtube" | "upload">("local")

// YouTube state
const selectedPlaylist = ref<string | null>(null)
const showYoutubePlayer = ref(false)
const currentYoutubeVideo = ref<any>(null)
const youtubeIframeRef = ref<HTMLIFrameElement | null>(null)

// Upload state
const fileInputRef = ref<HTMLInputElement | null>(null)
const showVideoDetails = ref(false)
const selectedUploadedVideo = ref<any>(null)
const showDeleteConfirm = ref(false)
const videoToDelete = ref<string | null>(null)
const uploadSearchQuery = ref("")

// Cloud video player state
const showCloudPlayer = ref(false)
const currentCloudVideo = ref<any>(null)
const cloudVideoRef = ref<HTMLVideoElement | null>(null)

// Local video details modal state
const showLocalVideoDetails = ref(false)
const selectedLocalVideo = ref<any>(null)

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
const searchQuery = ref("")
const youtubeSearchQuery = ref("")

// Computed loading state
const loading = computed(() =>
    activeTab.value === "local" ? localLoading.value : youtubeLoading.value,
)

// Filter videos by search
const filteredVideos = computed(() => {
    if (!searchQuery.value) return videos.value
    const query = searchQuery.value.toLowerCase()
    return videos.value.filter((v) => v.name.toLowerCase().includes(query))
})

// Filter YouTube videos by search
const filteredYoutubeVideos = computed(() => {
    const videos =
        selectedPlaylist.value === "liked"
            ? youtubeLikedVideos.value
            : youtubePlaylistVideos.value

    if (!youtubeSearchQuery.value) return videos
    const query = youtubeSearchQuery.value.toLowerCase()
    return videos.filter((v) => v.title.toLowerCase().includes(query))
})

// Try to restore folder access and initialize YouTube on mount
onMounted(async () => {
    await restoreFolderAccess()
    await initializeYouTube()

    // If YouTube is authenticated, fetch playlists
    if (youtubeAuthenticated.value) {
        console.log("[Lectures] YouTube authenticated, fetching playlists...")
        await fetchYoutubePlaylists()
    } else {
        console.log("[Lectures] YouTube not authenticated")
    }
})

// Watch for YouTube authentication changes
watch(youtubeAuthenticated, async (isAuth) => {
    if (isAuth && youtubePlaylists.value.length === 0) {
        console.log("[Lectures] YouTube auth changed, fetching playlists...")
        await fetchYoutubePlaylists()
    }
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
    if (
        videoRef.value &&
        currentVideo.value &&
        videoRef.value.currentTime > 0
    ) {
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
    const playerContainer = document.querySelector(".video-player-container")
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
            Math.min(
                videoRef.value.duration,
                videoRef.value.currentTime + seconds,
            ),
        )
    }
}

// Keyboard shortcuts
const handleKeydown = (e: KeyboardEvent) => {
    if (!showPlayer.value) return

    switch (e.key) {
        case " ":
        case "k":
            e.preventDefault()
            togglePlay()
            break
        case "f":
            e.preventDefault()
            toggleFullscreen()
            break
        case "m":
            e.preventDefault()
            toggleMute()
            break
        case "ArrowLeft":
            e.preventDefault()
            skip(-10)
            break
        case "ArrowRight":
            e.preventDefault()
            skip(10)
            break
        case "Escape":
            e.preventDefault()
            closePlayer()
            break
    }
    showControlsTemporarily()
}

onMounted(() => {
    window.addEventListener("keydown", handleKeydown)
})

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown)
    if (progressInterval) clearInterval(progressInterval)
    if (controlsTimeout.value) clearTimeout(controlsTimeout.value)
})

// Get thumbnail placeholder
const getVideoThumbnail = (video: any) => {
    // Use a placeholder based on video name
    const colors = [
        "#dc2626",
        "#ea580c",
        "#d97706",
        "#65a30d",
        "#16a34a",
        "#0891b2",
        "#2563eb",
        "#7c3aed",
        "#c026d3",
    ]
    const index = video.name.length % colors.length
    return colors[index]
}

// Format video name (remove extension)
const formatVideoName = (name: string) => {
    return name.replace(/\.[^/.]+$/, "").replace(/[._-]/g, " ")
}

// YouTube functions
const handleYoutubeLogin = () => {
    loginYouTube()
}

const handleYoutubeLogout = () => {
    logoutYouTube()
    selectedPlaylist.value = null
}

const handleSelectPlaylist = async (playlistId: string) => {
    selectedPlaylist.value = playlistId
    if (playlistId === "liked") {
        await fetchYoutubeLikedVideos()
    } else {
        await fetchYoutubePlaylistVideos(playlistId)
    }
}

const handleYoutubeVideoClick = (video: any) => {
    currentYoutubeVideo.value = video
    showYoutubePlayer.value = true
}

const closeYoutubePlayer = () => {
    showYoutubePlayer.value = false
    currentYoutubeVideo.value = null
}

const goBackToPlaylists = () => {
    selectedPlaylist.value = null
    youtubeSearchQuery.value = ""
}

// Upload functions
const handleFileSelect = () => {
    fileInputRef.value?.click()
}

const handleFilesSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
        await uploadVideos(Array.from(input.files))
        input.value = "" // Reset input
    }
}

const openVideoDetails = (video: any) => {
    selectedUploadedVideo.value = video
    showVideoDetails.value = true
}

const closeVideoDetails = () => {
    showVideoDetails.value = false
    selectedUploadedVideo.value = null
}

const confirmDeleteVideo = (videoId: string) => {
    videoToDelete.value = videoId
    showDeleteConfirm.value = true
}

const handleDeleteVideo = async () => {
    if (videoToDelete.value) {
        await deleteVideo(videoToDelete.value)
        showDeleteConfirm.value = false
        videoToDelete.value = null
    }
}

const cancelDelete = () => {
    showDeleteConfirm.value = false
    videoToDelete.value = null
}

const handleUpdateMetadata = async (videoId: string, metadata: any) => {
    await updateVideoMetadata(videoId, metadata)
    closeVideoDetails()
}

// Cloud video player functions
const playCloudVideo = (video: any) => {
    if (!video.publicUrl) {
        console.error("[Lectures] No public URL for video:", video)
        return
    }
    currentCloudVideo.value = video
    showCloudPlayer.value = true
}

const closeCloudPlayer = () => {
    showCloudPlayer.value = false
    currentCloudVideo.value = null
    if (cloudVideoRef.value) {
        cloudVideoRef.value.pause()
    }
}

// Local video details functions
const openLocalVideoDetails = (video: any) => {
    selectedLocalVideo.value = video
    showLocalVideoDetails.value = true
}

const closeLocalVideoDetails = () => {
    showLocalVideoDetails.value = false
    selectedLocalVideo.value = null
}

// Filter uploaded videos by search
const filteredUploadedVideos = computed(() => {
    if (!uploadSearchQuery.value) return sortedUploadedVideos.value
    const query = uploadSearchQuery.value.toLowerCase()
    return sortedUploadedVideos.value.filter(
        (v) =>
            v.title?.toLowerCase().includes(query) ||
            v.artist?.toLowerCase().includes(query) ||
            v.album?.toLowerCase().includes(query),
    )
})

// Initialize uploaded videos on tab change
watch(activeTab, async (tab) => {
    if (tab === "upload" && uploadedVideos.value.length === 0) {
        await fetchUploadedVideos()
    }
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col">
        <Navbar mode="app" />

        <div class="pt-24 pb-12">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Tab Navigation -->
                <div class="flex items-center gap-4 mb-8">
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2',
                            activeTab === 'local'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                        ]"
                        @click="activeTab = 'local'"
                    >
                        <UIcon name="i-heroicons-folder" class="w-5 h-5" />
                        {{ t("lectures.tabs.local") }}
                    </button>
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2',
                            activeTab === 'youtube'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                        ]"
                        @click="activeTab = 'youtube'"
                    >
                        <UIcon name="i-heroicons-play" class="w-5 h-5" />
                        YouTube
                    </button>
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2',
                            activeTab === 'upload'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                        ]"
                        @click="activeTab = 'upload'"
                    >
                        <UIcon name="i-heroicons-cloud-arrow-up" class="w-5 h-5" />
                        {{ t("lectures.tabs.upload") }}
                    </button>
                </div>

                <!-- LOCAL VIDEOS TAB -->
                <div v-if="activeTab === 'local'">
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
                                    {{ t("lectures.hero.title") }}
                                </h1>
                                <p class="text-gray-400 text-lg mb-8">
                                    {{ t("lectures.hero.description") }}
                                </p>
                            </div>

                            <!-- Show reauthorization button if folder was previously selected -->
                            <div
                                v-if="needsReauthorization && savedFolderName"
                                class="mb-6"
                            >
                                <p class="text-gray-300 mb-4">
                                    {{ t("lectures.hero.previousFolder") }}:
                                    <span class="text-purple-400 font-medium">
                                        {{ savedFolderName }}
                                    </span>
                                </p>
                                <UButton
                                    icon="i-heroicons-arrow-path"
                                    size="xl"
                                    :label="t('lectures.hero.reauthorize')"
                                    :loading="loading"
                                    class="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                    @click="handleReauthorize"
                                />
                                <p class="text-gray-500 text-sm mt-4">
                                    {{ t("lectures.hero.orSelectNew") }}
                                </p>
                            </div>

                            <UButton
                                icon="i-heroicons-folder-plus"
                                size="xl"
                                :label="t('lectures.hero.selectFolder')"
                                :loading="loading"
                                :variant="
                                    needsReauthorization ? 'outline' : 'solid'
                                "
                                :class="
                                    needsReauthorization
                                        ? 'border-purple-600 text-purple-400 hover:bg-purple-600/20'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white font-semibold'
                                "
                                @click="handleSelectFolder"
                            />

                            <p class="text-gray-500 text-sm mt-6">
                                {{ t("lectures.hero.permissionNotice") }}
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
                                        {{ t("lectures.fallback.title") }}
                                    </p>
                                    <p class="text-amber-300/70 text-sm mt-1">
                                        {{ t("lectures.fallback.description") }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Header with search and refresh -->
                        <div
                            class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
                        >
                            <h1 class="text-4xl font-bold text-white">
                                {{ t("lectures.library.title") }}
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
                            <h2
                                class="text-2xl font-semibold text-white mb-4 flex items-center gap-2"
                            >
                                <UIcon
                                    name="i-heroicons-play-circle"
                                    class="w-6 h-6"
                                />
                                {{ t("lectures.sections.continueWatching") }}
                            </h2>
                            <div
                                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                            >
                                <div
                                    v-for="video in continueWatching.slice(
                                        0,
                                        6,
                                    )"
                                    :key="video.path"
                                    class="group relative cursor-pointer"
                                    @click="handleVideoClick(video)"
                                >
                                    <div
                                        class="aspect-video rounded-lg overflow-hidden relative"
                                        :style="{
                                            backgroundColor:
                                                getVideoThumbnail(video),
                                        }"
                                    >
                                        <div
                                            class="absolute inset-0 flex items-center justify-center"
                                        >
                                            <UIcon
                                                name="i-heroicons-film"
                                                class="w-12 h-12 text-white/50"
                                            />
                                        </div>
                                        <!-- Progress bar -->
                                        <div
                                            class="absolute bottom-0 left-0 right-0 h-1 bg-gray-800"
                                        >
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
                                    <p
                                        class="mt-2 text-sm text-gray-300 truncate"
                                    >
                                        {{ formatVideoName(video.name) }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Favorites Section -->
                        <div v-if="favoriteVideos.length > 0" class="mb-12">
                            <h2
                                class="text-2xl font-semibold text-white mb-4 flex items-center gap-2"
                            >
                                <UIcon
                                    name="i-heroicons-heart"
                                    class="w-6 h-6 text-red-500"
                                />
                                {{ t("lectures.sections.favorites") }}
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
                                        :style="{
                                            backgroundColor:
                                                getVideoThumbnail(video),
                                        }"
                                    >
                                        <div
                                            class="absolute inset-0 flex items-center justify-center"
                                        >
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
                                    <p
                                        class="mt-2 text-sm text-gray-300 truncate"
                                    >
                                        {{ formatVideoName(video.name) }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- All Videos Section -->
                        <div>
                            <h2
                                class="text-2xl font-semibold text-white mb-4 flex items-center gap-2"
                            >
                                <UIcon
                                    name="i-heroicons-film"
                                    class="w-6 h-6"
                                />
                                {{ t("lectures.sections.allVideos") }}
                                <span class="text-gray-500 text-lg font-normal">
                                    ({{ filteredVideos.length }})
                                </span>
                            </h2>

                            <div
                                v-if="filteredVideos.length === 0"
                                class="text-center py-12"
                            >
                                <UIcon
                                    name="i-heroicons-film"
                                    class="w-16 h-16 text-gray-600 mx-auto mb-4"
                                />
                                <p class="text-gray-400">
                                    {{ t("lectures.library.noVideos") }}
                                </p>
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
                                        :style="{
                                            backgroundColor:
                                                getVideoThumbnail(video),
                                        }"
                                        @click="handleVideoClick(video)"
                                    >
                                        <div
                                            class="absolute inset-0 flex items-center justify-center"
                                        >
                                            <UIcon
                                                name="i-heroicons-film"
                                                class="w-12 h-12 text-white/50"
                                            />
                                        </div>
                                        <!-- Play overlay -->
                                        <div
                                            class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
                                        >
                                            <UButton
                                                icon="i-heroicons-play"
                                                color="neutral"
                                                variant="solid"
                                                size="lg"
                                                class="!rounded-full"
                                                @click.stop="handleVideoClick(video)"
                                            />
                                            <UButton
                                                icon="i-heroicons-information-circle"
                                                color="neutral"
                                                variant="solid"
                                                size="sm"
                                                class="!rounded-full"
                                                @click.stop="openLocalVideoDetails(video)"
                                            />
                                        </div>
                                    </div>
                                    <div
                                        class="flex items-start justify-between mt-2"
                                    >
                                        <div class="flex-1 min-w-0">
                                            <p
                                                class="text-sm text-gray-300 truncate"
                                            >
                                                {{
                                                    formatVideoName(video.name)
                                                }}
                                            </p>
                                            <p class="text-xs text-gray-500">
                                                {{ formatSize(video.size) }}
                                            </p>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <UButton
                                                icon="i-heroicons-information-circle"
                                                size="xs"
                                                color="neutral"
                                                variant="ghost"
                                                class="text-gray-400"
                                                @click.stop="openLocalVideoDetails(video)"
                                            />
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
                                                @click.stop="
                                                    toggleFavorite(video.path)
                                                "
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- YOUTUBE TAB -->
                <div v-else-if="activeTab === 'youtube'">
                    <!-- Not connected state -->
                    <div
                        v-if="!youtubeAuthenticated"
                        class="flex flex-col items-center justify-center min-h-[60vh]"
                    >
                        <div class="text-center max-w-2xl">
                            <div class="mb-8">
                                <div
                                    class="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <UIcon
                                        name="i-heroicons-play"
                                        class="w-14 h-14 text-white"
                                    />
                                </div>
                                <h1 class="text-4xl font-bold text-white mb-4">
                                    {{ t("lectures.youtube.title") }}
                                </h1>
                                <p class="text-gray-400 text-lg mb-8">
                                    {{ t("lectures.youtube.description") }}
                                </p>
                            </div>

                            <UButton
                                icon="i-heroicons-play"
                                size="xl"
                                :label="t('lectures.youtube.connect')"
                                :loading="youtubeLoading"
                                class="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                @click="handleYoutubeLogin"
                            />

                            <p class="text-gray-500 text-sm mt-6">
                                {{ t("lectures.youtube.permissionNotice") }}
                            </p>
                        </div>
                    </div>

                    <!-- YouTube connected -->
                    <div v-else>
                        <!-- Header with channel info -->
                        <div
                            class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
                        >
                            <div class="flex items-center gap-4">
                                <img
                                    v-if="youtubeChannel?.thumbnail"
                                    :src="youtubeChannel.thumbnail"
                                    :alt="youtubeChannel.title"
                                    class="w-12 h-12 rounded-full"
                                />
                                <div>
                                    <h1 class="text-2xl font-bold text-white">
                                        {{ youtubeChannel?.title || "YouTube" }}
                                    </h1>
                                    <p class="text-gray-400 text-sm">
                                        {{ t("lectures.youtube.connected") }}
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-4">
                                <UButton
                                    icon="i-heroicons-arrow-path"
                                    color="neutral"
                                    variant="ghost"
                                    :loading="youtubeLoading"
                                    @click="fetchYoutubePlaylists"
                                />
                                <UButton
                                    icon="i-heroicons-arrow-right-on-rectangle"
                                    color="neutral"
                                    variant="ghost"
                                    :label="t('lectures.youtube.disconnect')"
                                    @click="handleYoutubeLogout"
                                />
                            </div>
                        </div>

                        <!-- Error message -->
                        <div
                            v-if="youtubeError"
                            class="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6"
                        >
                            <div class="flex items-start gap-3">
                                <UIcon
                                    name="i-heroicons-exclamation-triangle"
                                    class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                                />
                                <div>
                                    <p class="text-red-200 font-medium">
                                        {{ t("lectures.youtube.error") }}
                                    </p>
                                    <p class="text-red-300/70 text-sm mt-1">
                                        {{ youtubeError }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Playlist selected - show videos -->
                        <div v-if="selectedPlaylist">
                            <div class="flex items-center gap-4 mb-6">
                                <UButton
                                    icon="i-heroicons-arrow-left"
                                    color="neutral"
                                    variant="ghost"
                                    @click="goBackToPlaylists"
                                />
                                <h2 class="text-2xl font-semibold text-white">
                                    {{
                                        selectedPlaylist === "liked"
                                            ? t("lectures.youtube.likedVideos")
                                            : youtubePlaylists.find(
                                                  (p) =>
                                                      p.id === selectedPlaylist,
                                              )?.title
                                    }}
                                </h2>
                            </div>

                            <!-- Search -->
                            <div class="mb-6">
                                <UInput
                                    v-model="youtubeSearchQuery"
                                    icon="i-heroicons-magnifying-glass"
                                    size="lg"
                                    :placeholder="t('lectures.library.search')"
                                    class="w-full md:w-80"
                                />
                            </div>

                            <!-- Videos grid -->
                            <div
                                v-if="youtubeLoading"
                                class="flex justify-center py-12"
                            >
                                <div
                                    class="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"
                                ></div>
                            </div>

                            <div
                                v-else-if="filteredYoutubeVideos.length === 0"
                                class="text-center py-12"
                            >
                                <UIcon
                                    name="i-heroicons-film"
                                    class="w-16 h-16 text-gray-600 mx-auto mb-4"
                                />
                                <p class="text-gray-400">
                                    {{ t("lectures.youtube.noVideos") }}
                                </p>
                            </div>

                            <div
                                v-else
                                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                            >
                                <div
                                    v-for="video in filteredYoutubeVideos"
                                    :key="video.id"
                                    class="group cursor-pointer"
                                    @click="handleYoutubeVideoClick(video)"
                                >
                                    <div
                                        class="aspect-video rounded-lg overflow-hidden relative bg-gray-800"
                                    >
                                        <img
                                            :src="video.thumbnail"
                                            :alt="video.title"
                                            class="w-full h-full object-cover"
                                        />
                                        <div
                                            class="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white"
                                        >
                                            {{ video.duration }}
                                        </div>
                                        <!-- Play overlay -->
                                        <div
                                            class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            <div
                                                class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center"
                                            >
                                                <UIcon
                                                    name="i-heroicons-play"
                                                    class="w-8 h-8 text-white ml-1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-3">
                                        <p
                                            class="text-white font-medium line-clamp-2"
                                        >
                                            {{ video.title }}
                                        </p>
                                        <p class="text-gray-400 text-sm mt-1">
                                            {{ video.channelTitle }}
                                        </p>
                                        <p class="text-gray-500 text-xs mt-1">
                                            {{
                                                formatViewCount(video.viewCount)
                                            }}
                                            {{ t("lectures.youtube.views") }} •
                                            {{
                                                formatPublishedAt(
                                                    video.publishedAt,
                                                )
                                            }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Playlists view -->
                        <div v-else>
                            <!-- Quick access section -->
                            <div class="mb-8">
                                <h2
                                    class="text-xl font-semibold text-white mb-4"
                                >
                                    {{ t("lectures.youtube.quickAccess") }}
                                </h2>
                                <div class="flex flex-wrap gap-4">
                                    <button
                                        class="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-lg px-6 py-4 transition-colors"
                                        @click="handleSelectPlaylist('liked')"
                                    >
                                        <div
                                            class="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center"
                                        >
                                            <UIcon
                                                name="i-heroicons-heart"
                                                class="w-6 h-6 text-white"
                                            />
                                        </div>
                                        <span class="text-white font-medium">
                                            {{
                                                t(
                                                    "lectures.youtube.likedVideos",
                                                )
                                            }}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <!-- Playlists section -->
                            <div>
                                <h2
                                    class="text-xl font-semibold text-white mb-4 flex items-center gap-2"
                                >
                                    <UIcon
                                        name="i-heroicons-queue-list"
                                        class="w-5 h-5"
                                    />
                                    {{ t("lectures.youtube.playlists") }}
                                    <span
                                        class="text-gray-500 text-base font-normal"
                                    >
                                        ({{ youtubePlaylists.length }})
                                    </span>
                                </h2>

                                <div
                                    v-if="youtubeLoading"
                                    class="flex justify-center py-12"
                                >
                                    <div
                                        class="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"
                                    ></div>
                                </div>

                                <div
                                    v-else-if="youtubePlaylists.length === 0"
                                    class="text-center py-12"
                                >
                                    <UIcon
                                        name="i-heroicons-queue-list"
                                        class="w-16 h-16 text-gray-600 mx-auto mb-4"
                                    />
                                    <p class="text-gray-400">
                                        {{ t("lectures.youtube.noPlaylists") }}
                                    </p>
                                </div>

                                <div
                                    v-else
                                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                                >
                                    <div
                                        v-for="playlist in youtubePlaylists"
                                        :key="playlist.id"
                                        class="group cursor-pointer"
                                        @click="
                                            handleSelectPlaylist(playlist.id)
                                        "
                                    >
                                        <div
                                            class="aspect-video rounded-lg overflow-hidden relative bg-gray-800"
                                        >
                                            <img
                                                v-if="playlist.thumbnail"
                                                :src="playlist.thumbnail"
                                                :alt="playlist.title"
                                                class="w-full h-full object-cover"
                                            />
                                            <div
                                                class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"
                                            ></div>
                                            <div
                                                class="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white flex items-center gap-1"
                                            >
                                                <UIcon
                                                    name="i-heroicons-queue-list"
                                                    class="w-3 h-3"
                                                />
                                                {{ playlist.itemCount }}
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
                                        <p
                                            class="mt-2 text-sm text-gray-300 line-clamp-2"
                                        >
                                            {{ playlist.title }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- UPLOAD TAB -->
                <div v-else-if="activeTab === 'upload'">
                    <!-- Hidden file input -->
                    <input
                        ref="fileInputRef"
                        type="file"
                        accept="video/*"
                        multiple
                        class="hidden"
                        @change="handleFilesSelected"
                    />

                    <!-- Header -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                        <h1 class="text-4xl font-bold text-white">
                            {{ t("lectures.upload.title") }}
                        </h1>
                        <div class="flex items-center gap-4">
                            <UInput
                                v-model="uploadSearchQuery"
                                icon="i-heroicons-magnifying-glass"
                                size="lg"
                                :placeholder="t('lectures.upload.search')"
                                class="w-full md:w-80"
                            />
                            <UButton
                                icon="i-heroicons-arrow-path"
                                color="neutral"
                                variant="ghost"
                                :loading="uploadLoading"
                                @click="fetchUploadedVideos"
                            />
                            <UButton
                                icon="i-heroicons-cloud-arrow-up"
                                :label="t('lectures.upload.uploadButton')"
                                class="bg-green-600 hover:bg-green-700 text-white"
                                :loading="uploading"
                                @click="handleFileSelect"
                            />
                        </div>
                    </div>

                    <!-- Sort controls -->
                    <div class="flex items-center gap-4 mb-6">
                        <span class="text-gray-400 text-sm">{{ t("lectures.upload.sortBy") }}:</span>
                        <div class="flex items-center gap-2">
                            <button
                                v-for="option in [
                                    { value: 'created_at', label: t('lectures.upload.sortOptions.date') },
                                    { value: 'title', label: t('lectures.upload.sortOptions.name') },
                                    { value: 'file_size', label: t('lectures.upload.sortOptions.size') },
                                ]"
                                :key="option.value"
                                :class="[
                                    'px-3 py-1.5 rounded-lg text-sm transition-colors',
                                    uploadSortBy === option.value
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                                ]"
                                @click="uploadSortBy = option.value as any"
                            >
                                {{ option.label }}
                            </button>
                        </div>
                        <button
                            class="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                            @click="uploadSortOrder = uploadSortOrder === 'asc' ? 'desc' : 'asc'"
                        >
                            <UIcon
                                :name="uploadSortOrder === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                                class="w-4 h-4"
                            />
                        </button>
                    </div>

                    <!-- Upload progress -->
                    <div v-if="uploading && Object.keys(uploadProgress).length > 0" class="mb-8">
                        <h2 class="text-lg font-semibold text-white mb-4">
                            {{ t("lectures.upload.uploading") }}
                        </h2>
                        <div class="space-y-3">
                            <div
                                v-for="(progress, filename) in uploadProgress"
                                :key="filename"
                                class="bg-gray-800 rounded-lg p-4"
                            >
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-gray-300 truncate flex-1">{{ filename }}</span>
                                    <span class="text-green-400 text-sm ml-4">{{ progress }}%</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        class="bg-green-500 h-2 rounded-full transition-all duration-300"
                                        :style="{ width: `${progress}%` }"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Error message -->
                    <div
                        v-if="uploadError"
                        class="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6"
                    >
                        <div class="flex items-start gap-3">
                            <UIcon
                                name="i-heroicons-exclamation-triangle"
                                class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                            />
                            <div>
                                <p class="text-red-200 font-medium">
                                    {{ t("lectures.upload.error") }}
                                </p>
                                <p class="text-red-300/70 text-sm mt-1">
                                    {{ uploadError }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Loading state -->
                    <div v-if="uploadLoading && !uploading" class="flex justify-center py-12">
                        <div class="w-12 h-12 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin"></div>
                    </div>

                    <!-- Empty state -->
                    <div
                        v-else-if="uploadedVideos.length === 0 && !uploadLoading"
                        class="flex flex-col items-center justify-center min-h-[40vh]"
                    >
                        <div class="text-center max-w-lg">
                            <UIcon
                                name="i-heroicons-cloud-arrow-up"
                                class="w-24 h-24 text-green-500/50 mx-auto mb-6"
                            />
                            <h2 class="text-2xl font-bold text-white mb-4">
                                {{ t("lectures.upload.emptyTitle") }}
                            </h2>
                            <p class="text-gray-400 mb-8">
                                {{ t("lectures.upload.emptyDescription") }}
                            </p>
                            <UButton
                                icon="i-heroicons-cloud-arrow-up"
                                size="xl"
                                :label="t('lectures.upload.uploadFirst')"
                                class="bg-green-600 hover:bg-green-700 text-white font-semibold"
                                @click="handleFileSelect"
                            />
                        </div>
                    </div>

                    <!-- Videos grid -->
                    <div v-else>
                        <h2 class="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <UIcon name="i-heroicons-film" class="w-5 h-5" />
                            {{ t("lectures.upload.yourVideos") }}
                            <span class="text-gray-500 text-base font-normal">
                                ({{ filteredUploadedVideos.length }})
                            </span>
                        </h2>

                        <div
                            v-if="filteredUploadedVideos.length === 0"
                            class="text-center py-12"
                        >
                            <UIcon
                                name="i-heroicons-magnifying-glass"
                                class="w-16 h-16 text-gray-600 mx-auto mb-4"
                            />
                            <p class="text-gray-400">
                                {{ t("lectures.upload.noResults") }}
                            </p>
                        </div>

                        <div
                            v-else
                            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                        >
                            <div
                                v-for="video in filteredUploadedVideos"
                                :key="video.id"
                                class="group relative"
                            >
                                <div
                                    class="aspect-video rounded-lg overflow-hidden relative bg-gray-800 cursor-pointer"
                                    @click="playCloudVideo(video)"
                                >
                                    <!-- Thumbnail -->
                                    <img
                                        v-if="video.thumbnailPath"
                                        :src="getThumbnailUrl(video.thumbnailPath)"
                                        :alt="video.title"
                                        class="w-full h-full object-cover"
                                    />
                                    <div
                                        v-else
                                        class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-900/50 to-gray-900"
                                    >
                                        <UIcon
                                            name="i-heroicons-film"
                                            class="w-12 h-12 text-white/50"
                                        />
                                    </div>

                                    <!-- Duration badge -->
                                    <div
                                        v-if="video.duration"
                                        class="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white"
                                    >
                                        {{ formatUploadDuration(video.duration) }}
                                    </div>

                                    <!-- Hover overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        <UButton
                                            icon="i-heroicons-play"
                                            color="neutral"
                                            variant="solid"
                                            size="lg"
                                            class="!rounded-full"
                                            @click.stop="playCloudVideo(video)"
                                        />
                                        <UButton
                                            icon="i-heroicons-information-circle"
                                            color="neutral"
                                            variant="solid"
                                            size="sm"
                                            @click.stop="openVideoDetails(video)"
                                        />
                                        <UButton
                                            icon="i-heroicons-trash"
                                            color="error"
                                            variant="solid"
                                            size="sm"
                                            @click.stop="confirmDeleteVideo(video.id)"
                                        />
                                    </div>
                                </div>

                                <!-- Video info -->
                                <div class="mt-2">
                                    <p class="text-sm text-gray-300 truncate">
                                        {{ video.title || video.fileName }}
                                    </p>
                                    <div class="flex items-center gap-2 text-xs text-gray-500">
                                        <span v-if="video.artist">{{ video.artist }}</span>
                                        <span v-if="video.fileSize">{{ formatFileSize(video.fileSize) }}</span>
                                    </div>
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
                                            <h3
                                                class="text-white font-semibold text-lg"
                                            >
                                                {{
                                                    currentVideo
                                                        ? formatVideoName(
                                                              currentVideo.name,
                                                          )
                                                        : ""
                                                }}
                                            </h3>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <UButton
                                            :icon="
                                                currentVideo &&
                                                isFavorite(currentVideo.path)
                                                    ? 'i-heroicons-heart-solid'
                                                    : 'i-heroicons-heart'
                                            "
                                            color="neutral"
                                            variant="ghost"
                                            size="lg"
                                            :class="
                                                currentVideo &&
                                                isFavorite(currentVideo.path)
                                                    ? 'text-red-500'
                                                    : ''
                                            "
                                            @click.stop="
                                                currentVideo &&
                                                toggleFavorite(
                                                    currentVideo.path,
                                                )
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
                                    <div
                                        class="flex justify-between text-xs text-gray-400 mt-1"
                                    >
                                        <span>
                                            {{ formatDuration(currentTime) }}
                                        </span>
                                        <span>
                                            {{ formatDuration(videoDuration) }}
                                        </span>
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

        <!-- YouTube Player Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showYoutubePlayer && currentYoutubeVideo"
                    class="fixed inset-0 z-[100] bg-black flex flex-col"
                >
                    <!-- Top bar -->
                    <div
                        class="flex items-center justify-between p-4 bg-gray-900/90"
                    >
                        <div class="flex items-center gap-4">
                            <UButton
                                icon="i-heroicons-arrow-left"
                                color="neutral"
                                variant="ghost"
                                size="lg"
                                @click="closeYoutubePlayer"
                            />
                            <div>
                                <h3
                                    class="text-white font-semibold text-lg line-clamp-1"
                                >
                                    {{ currentYoutubeVideo.title }}
                                </h3>
                                <p class="text-gray-400 text-sm">
                                    {{ currentYoutubeVideo.channelTitle }}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <UButton
                                :icon="
                                    isYoutubeFavorite(currentYoutubeVideo.id)
                                        ? 'i-heroicons-heart-solid'
                                        : 'i-heroicons-heart'
                                "
                                color="neutral"
                                variant="ghost"
                                size="lg"
                                :class="
                                    isYoutubeFavorite(currentYoutubeVideo.id)
                                        ? 'text-red-500'
                                        : ''
                                "
                                @click="
                                    toggleYoutubeFavorite(
                                        currentYoutubeVideo.id,
                                    )
                                "
                            />
                            <UButton
                                icon="i-heroicons-arrow-top-right-on-square"
                                color="neutral"
                                variant="ghost"
                                size="lg"
                                as="a"
                                :href="`https://www.youtube.com/watch?v=${currentYoutubeVideo.id}`"
                                target="_blank"
                            />
                        </div>
                    </div>

                    <!-- Video iframe -->
                    <div class="flex-1 relative">
                        <iframe
                            ref="youtubeIframeRef"
                            :src="
                                getEmbedUrl(
                                    currentYoutubeVideo.id,
                                    getYoutubeProgress(currentYoutubeVideo.id),
                                )
                            "
                            class="absolute inset-0 w-full h-full"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowfullscreen
                        ></iframe>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Video Details Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showVideoDetails && selectedUploadedVideo"
                    class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                    @click.self="closeVideoDetails"
                >
                    <div class="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <!-- Header -->
                        <div class="sticky top-0 bg-gray-900 p-6 border-b border-gray-800 flex items-center justify-between">
                            <h2 class="text-xl font-bold text-white">
                                {{ t("lectures.upload.videoDetails") }}
                            </h2>
                            <UButton
                                icon="i-heroicons-x-mark"
                                color="neutral"
                                variant="ghost"
                                @click="closeVideoDetails"
                            />
                        </div>

                        <!-- Content -->
                        <div class="p-6 space-y-6">
                            <!-- Thumbnail -->
                            <div class="aspect-video rounded-lg overflow-hidden bg-gray-800">
                                <img
                                    v-if="selectedUploadedVideo.thumbnailPath"
                                    :src="getThumbnailUrl(selectedUploadedVideo.thumbnailPath)"
                                    :alt="selectedUploadedVideo.title"
                                    class="w-full h-full object-cover"
                                />
                                <div
                                    v-else
                                    class="w-full h-full flex items-center justify-center"
                                >
                                    <UIcon
                                        name="i-heroicons-film"
                                        class="w-20 h-20 text-gray-600"
                                    />
                                </div>
                            </div>

                            <!-- Metadata -->
                            <div class="space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.upload.metadata.title") }}</label>
                                        <p class="text-white">{{ selectedUploadedVideo.title || "-" }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.upload.metadata.artist") }}</label>
                                        <p class="text-white">{{ selectedUploadedVideo.artist || "-" }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.upload.metadata.album") }}</label>
                                        <p class="text-white">{{ selectedUploadedVideo.album || "-" }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.upload.metadata.year") }}</label>
                                        <p class="text-white">{{ selectedUploadedVideo.year || "-" }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.upload.metadata.genre") }}</label>
                                        <p class="text-white">{{ selectedUploadedVideo.genre || "-" }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.upload.metadata.duration") }}</label>
                                        <p class="text-white">
                                            {{ selectedUploadedVideo.duration ? formatUploadDuration(selectedUploadedVideo.duration) : "-" }}
                                        </p>
                                    </div>
                                </div>

                                <div class="border-t border-gray-800 pt-4">
                                    <h3 class="text-gray-400 text-sm mb-3">{{ t("lectures.upload.metadata.fileInfo") }}</h3>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="text-gray-500 text-xs">{{ t("lectures.upload.metadata.filename") }}</label>
                                            <p class="text-gray-300 text-sm truncate">{{ selectedUploadedVideo.fileName }}</p>
                                        </div>
                                        <div>
                                            <label class="text-gray-500 text-xs">{{ t("lectures.upload.metadata.size") }}</label>
                                            <p class="text-gray-300 text-sm">{{ formatFileSize(selectedUploadedVideo.fileSize) }}</p>
                                        </div>
                                        <div>
                                            <label class="text-gray-500 text-xs">{{ t("lectures.upload.metadata.format") }}</label>
                                            <p class="text-gray-300 text-sm">{{ selectedUploadedVideo.mimeType }}</p>
                                        </div>
                                        <div>
                                            <label class="text-gray-500 text-xs">{{ t("lectures.upload.metadata.resolution") }}</label>
                                            <p v-if="selectedUploadedVideo.width && selectedUploadedVideo.height" class="text-gray-300 text-sm">{{ selectedUploadedVideo.width }}x{{ selectedUploadedVideo.height }}</p>
                                            <p v-else class="text-gray-500 text-sm">—</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="p-6 border-t border-gray-800 flex justify-end gap-3">
                            <UButton
                                color="neutral"
                                variant="ghost"
                                :label="t('common.close')"
                                @click="closeVideoDetails"
                            />
                            <UButton
                                icon="i-heroicons-trash"
                                color="error"
                                variant="solid"
                                :label="t('common.delete')"
                                @click="confirmDeleteVideo(selectedUploadedVideo.id); closeVideoDetails()"
                            />
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Delete Confirmation Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showDeleteConfirm"
                    class="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
                    @click.self="cancelDelete"
                >
                    <div class="bg-gray-900 rounded-xl max-w-md w-full p-6">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
                                <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-white">
                                    {{ t("lectures.upload.deleteConfirm.title") }}
                                </h3>
                                <p class="text-gray-400 text-sm">
                                    {{ t("lectures.upload.deleteConfirm.message") }}
                                </p>
                            </div>
                        </div>
                        <div class="flex justify-end gap-3">
                            <UButton
                                color="neutral"
                                variant="ghost"
                                :label="t('common.cancel')"
                                @click="cancelDelete"
                            />
                            <UButton
                                color="error"
                                variant="solid"
                                :label="t('common.delete')"
                                :loading="uploadLoading"
                                @click="handleDeleteVideo"
                            />
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Cloud Video Player Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showCloudPlayer && currentCloudVideo"
                    class="fixed inset-0 z-[100] bg-black flex flex-col"
                >
                    <!-- Top bar -->
                    <div class="flex items-center justify-between p-4 bg-gray-900/90">
                        <div class="flex items-center gap-4">
                            <UButton
                                icon="i-heroicons-arrow-left"
                                color="neutral"
                                variant="ghost"
                                size="lg"
                                @click="closeCloudPlayer"
                            />
                            <div>
                                <h3 class="text-white font-semibold text-lg line-clamp-1">
                                    {{ currentCloudVideo.title || currentCloudVideo.fileName }}
                                </h3>
                                <p v-if="currentCloudVideo.artist" class="text-gray-400 text-sm">
                                    {{ currentCloudVideo.artist }}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <UButton
                                icon="i-heroicons-information-circle"
                                color="neutral"
                                variant="ghost"
                                size="lg"
                                @click="openVideoDetails(currentCloudVideo); closeCloudPlayer()"
                            />
                            <UButton
                                icon="i-heroicons-trash"
                                color="neutral"
                                variant="ghost"
                                size="lg"
                                class="text-red-400 hover:text-red-500"
                                @click="confirmDeleteVideo(currentCloudVideo.id); closeCloudPlayer()"
                            />
                        </div>
                    </div>

                    <!-- Video player -->
                    <div class="flex-1 relative flex items-center justify-center">
                        <video
                            ref="cloudVideoRef"
                            :src="currentCloudVideo.publicUrl"
                            class="max-w-full max-h-full"
                            controls
                            autoplay
                        />
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Local Video Details Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showLocalVideoDetails && selectedLocalVideo"
                    class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                    @click.self="closeLocalVideoDetails"
                >
                    <div class="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <!-- Header -->
                        <div class="sticky top-0 bg-gray-900 p-6 border-b border-gray-800 flex items-center justify-between">
                            <h2 class="text-xl font-bold text-white">
                                {{ t("lectures.local.videoDetails") }}
                            </h2>
                            <UButton
                                icon="i-heroicons-x-mark"
                                color="neutral"
                                variant="ghost"
                                @click="closeLocalVideoDetails"
                            />
                        </div>

                        <!-- Content -->
                        <div class="p-6 space-y-6">
                            <!-- Video preview with color -->
                            <div
                                class="aspect-video rounded-lg overflow-hidden flex items-center justify-center"
                                :style="{ backgroundColor: getVideoThumbnail(selectedLocalVideo) }"
                            >
                                <UIcon
                                    name="i-heroicons-film"
                                    class="w-24 h-24 text-white/30"
                                />
                            </div>

                            <!-- Metadata -->
                            <div class="space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="col-span-2">
                                        <label class="text-gray-400 text-sm">{{ t("lectures.local.metadata.name") }}</label>
                                        <p class="text-white text-lg font-medium">{{ formatVideoName(selectedLocalVideo.name) }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.local.metadata.size") }}</label>
                                        <p class="text-white">{{ formatSize(selectedLocalVideo.size) }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.local.metadata.type") }}</label>
                                        <p class="text-white">{{ selectedLocalVideo.type || selectedLocalVideo.name.split('.').pop()?.toUpperCase() }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.local.metadata.lastModified") }}</label>
                                        <p class="text-white">{{ selectedLocalVideo.lastModified ? new Date(selectedLocalVideo.lastModified).toLocaleDateString() : '-' }}</p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">{{ t("lectures.local.metadata.path") }}</label>
                                        <p class="text-gray-300 text-sm truncate" :title="selectedLocalVideo.path">{{ selectedLocalVideo.path }}</p>
                                    </div>
                                </div>

                                <!-- Progress info -->
                                <div v-if="getProgress(selectedLocalVideo.path) > 0" class="border-t border-gray-800 pt-4">
                                    <label class="text-gray-400 text-sm">{{ t("lectures.local.metadata.progress") }}</label>
                                    <div class="flex items-center gap-2 mt-1">
                                        <div class="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                class="h-full bg-purple-500"
                                                :style="{ width: `${Math.min((getProgress(selectedLocalVideo.path) / 100) * 100, 100)}%` }"
                                            />
                                        </div>
                                        <span class="text-white text-sm">{{ formatDuration(getProgress(selectedLocalVideo.path)) }}</span>
                                    </div>
                                </div>

                                <!-- Favorite status -->
                                <div class="border-t border-gray-800 pt-4 flex items-center justify-between">
                                    <span class="text-gray-400">{{ t("lectures.local.metadata.favorite") }}</span>
                                    <UButton
                                        :icon="isFavorite(selectedLocalVideo.path) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                                        :color="isFavorite(selectedLocalVideo.path) ? 'error' : 'neutral'"
                                        variant="ghost"
                                        :label="isFavorite(selectedLocalVideo.path) ? t('lectures.local.removeFromFavorites') : t('lectures.local.addToFavorites')"
                                        @click="toggleFavorite(selectedLocalVideo.path)"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="p-6 border-t border-gray-800 flex justify-end gap-3">
                            <UButton
                                color="neutral"
                                variant="ghost"
                                :label="t('common.close')"
                                @click="closeLocalVideoDetails"
                            />
                            <UButton
                                icon="i-heroicons-play"
                                color="primary"
                                variant="solid"
                                :label="t('lectures.local.play')"
                                @click="handleVideoClick(selectedLocalVideo); closeLocalVideoDetails()"
                            />
                        </div>
                    </div>
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

.line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #a855f7;
    cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #a855f7;
    cursor: pointer;
    border: none;
}
</style>
