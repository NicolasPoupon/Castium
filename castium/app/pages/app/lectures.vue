<script setup lang="ts">
import { useI18n } from '#imports'
import type { ThemeColor } from '~/composables/useTheme'

const { t } = useI18n()
const { colors, colorClasses } = useTheme()
const themeColor = computed(() => colors.value.lectures as ThemeColor)
const theme = computed(() => colorClasses[themeColor.value] || colorClasses.purple)

definePageMeta({
    title: 'Lectures',
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
    playlists: localPlaylists,
    rootVideos,
    selectFolder,
    restoreFolderAccess,
    playVideo,
    stopVideo,
    saveProgress,
    removeFromWatching,
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
    getRating,
    setRating,
    removeRating,
    getVideosByFolder,
    clearLocalState: clearLocalVideos,
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
    cloudPlaylists,
    unassignedVideos,
    playlistsWithVideos,
    continueWatchingVideos: cloudContinueWatching,
    favoriteVideos: cloudFavoriteVideos,
    fetchVideos: fetchUploadedVideos,
    uploadVideos,
    deleteVideo,
    updateVideoMetadata,
    getThumbnailUrl,
    formatFileSize,
    formatDuration: formatUploadDuration,
    getCloudRating,
    setCloudRating,
    removeCloudRating,
    getCloudProgress,
    saveCloudProgress,
    removeFromContinueWatching,
    isCloudFavorite,
    toggleCloudFavorite,
    createCloudPlaylist,
    deleteCloudPlaylist,
    assignToPlaylist,
    clearState: clearCloudVideos,
} = useVideoUpload()

// Active tab: 'local', 'youtube', or 'upload'
const activeTab = ref<'local' | 'youtube' | 'upload'>('local')

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
const uploadSearchQuery = ref('')

// Cloud video player state
const showCloudPlayer = ref(false)
const currentCloudVideo = ref<any>(null)
const cloudVideoRef = ref<HTMLVideoElement | null>(null)

// Rating modal state
const showRatingModal = ref(false)
const ratingVideoPath = ref<string | null>(null)
const ratingVideoId = ref<string | null>(null)
const ratingVideoType = ref<'local' | 'cloud'>('local')
const ratingValue = ref(5)
const ratingComment = ref('')

// Playlist modal state
const showPlaylistModal = ref(false)
const newPlaylistName = ref('')
const selectedVideoForPlaylist = ref<any>(null)

// Selected local playlist
const selectedLocalPlaylist = ref<string | null>(null)

// Selected cloud playlist
const selectedCloudPlaylist = ref<string | null>(null)

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
const isPiP = ref(false)
const showControls = ref(true)
const controlsTimeout = ref<NodeJS.Timeout | null>(null)
const searchQuery = ref('')
const youtubeSearchQuery = ref('')

// Computed loading state
const loading = computed(() =>
    activeTab.value === 'local' ? localLoading.value : youtubeLoading.value
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
        selectedPlaylist.value === 'liked' ? youtubeLikedVideos.value : youtubePlaylistVideos.value

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
        console.log('[Lectures] YouTube authenticated, fetching playlists...')
        await fetchYoutubePlaylists()
    } else {
        console.log('[Lectures] YouTube not authenticated')
    }
})

// Subscribe to data refresh events (for when user deletes data from settings)
const { onRefresh } = useDataRefresh()
const refreshAllData = async () => {
    console.log('[Lectures] Refreshing all data...')
    // Clear local video state first (removes folders from display)
    clearLocalVideos()
    // Clear cloud video state
    clearCloudVideos()
    // Try to restore folder access (will fail if IndexedDB was cleared, which is expected)
    await restoreFolderAccess()
    // Refresh cloud uploaded videos
    await fetchUploadedVideos()
    // Refresh YouTube playlists if authenticated
    if (youtubeAuthenticated.value) {
        await fetchYoutubePlaylists()
    }
}
onMounted(() => {
    const unsubscribe = onRefresh('lectures', refreshAllData)
    onUnmounted(() => unsubscribe())
})

// Watch for YouTube authentication changes
watch(youtubeAuthenticated, async (isAuth) => {
    if (isAuth && youtubePlaylists.value.length === 0) {
        console.log('[Lectures] YouTube auth changed, fetching playlists...')
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
    // Exit PiP mode if active and pause the PiP video first
    if (document.pictureInPictureElement) {
        const pipVideo = document.pictureInPictureElement as HTMLVideoElement
        pipVideo.pause()
        await document.exitPictureInPicture()
    }
    isPiP.value = false

    // Stop any playing video (local or cloud)
    if (videoRef.value) {
        videoRef.value.pause()
    }
    if (cloudVideoRef.value) {
        cloudVideoRef.value.pause()
    }

    // Close cloud player if open
    if (showCloudPlayer.value) {
        showCloudPlayer.value = false
        currentCloudVideo.value = null
    }

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

// Toggle Picture-in-Picture mode
const togglePiP = async () => {
    if (!videoRef.value) return

    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture()
            isPiP.value = false
        } else if (document.pictureInPictureEnabled) {
            await videoRef.value.requestPictureInPicture()
            isPiP.value = true
        }
    } catch (error) {
        console.error('[Lectures] PiP error:', error)
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
        case 'p':
            e.preventDefault()
            togglePiP()
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
    if (playlistId === 'liked') {
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
    youtubeSearchQuery.value = ''
}

// Upload functions
const handleFileSelect = () => {
    fileInputRef.value?.click()
}

const handleFilesSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
        await uploadVideos(Array.from(input.files))
        input.value = '' // Reset input
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
const playCloudVideo = async (video: any) => {
    // Exit PiP mode if active and pause the PiP video first
    if (document.pictureInPictureElement) {
        const pipVideo = document.pictureInPictureElement as HTMLVideoElement
        pipVideo.pause()
        await document.exitPictureInPicture()
    }
    isPiP.value = false

    // Stop any playing video (local or cloud)
    if (videoRef.value) {
        videoRef.value.pause()
    }
    if (cloudVideoRef.value) {
        cloudVideoRef.value.pause()
    }

    // Close local player if open
    if (showPlayer.value) {
        if (videoUrl.value) {
            URL.revokeObjectURL(videoUrl.value)
        }
        videoUrl.value = null
        showPlayer.value = false
        stopVideo()
    }

    if (!video.publicUrl) {
        console.error('[Lectures] No public URL for video:', video)
        return
    }
    currentCloudVideo.value = video
    showCloudPlayer.value = true

    // Wait for video element and restore progress
    await nextTick()
    if (cloudVideoRef.value) {
        const savedProgress = getCloudProgress(video.id)
        if (savedProgress > 0) {
            cloudVideoRef.value.currentTime = savedProgress
        }
    }
}

const closeCloudPlayer = async () => {
    // Save progress before closing
    if (cloudVideoRef.value && currentCloudVideo.value) {
        const currentTime = cloudVideoRef.value.currentTime
        if (currentTime > 0) {
            await saveCloudProgress(currentCloudVideo.value.id, currentTime)
        }
    }
    showCloudPlayer.value = false
    currentCloudVideo.value = null
    if (cloudVideoRef.value) {
        cloudVideoRef.value.pause()
    }
}

// Toggle Picture-in-Picture for cloud video
const toggleCloudPiP = async () => {
    if (!cloudVideoRef.value) return

    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture()
        } else if (document.pictureInPictureEnabled) {
            await cloudVideoRef.value.requestPictureInPicture()
        }
    } catch (error) {
        console.error('[Lectures] Cloud PiP error:', error)
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

// Rating functions
const openRatingModal = (videoPath: string | null, videoId: string | null, type: 'local' | 'cloud') => {
    ratingVideoPath.value = videoPath
    ratingVideoId.value = videoId
    ratingVideoType.value = type

    // Load existing rating
    if (type === 'local' && videoPath) {
        const existing = getRating(videoPath)
        if (existing) {
            ratingValue.value = existing.rating
            ratingComment.value = existing.comment
        } else {
            ratingValue.value = 5
            ratingComment.value = ''
        }
    } else if (type === 'cloud' && videoId) {
        const existing = getCloudRating(videoId)
        if (existing) {
            ratingValue.value = existing.rating
            ratingComment.value = existing.comment
        } else {
            ratingValue.value = 5
            ratingComment.value = ''
        }
    }

    showRatingModal.value = true
}

const closeRatingModal = () => {
    showRatingModal.value = false
    ratingVideoPath.value = null
    ratingVideoId.value = null
    ratingValue.value = 5
    ratingComment.value = ''
}

const saveRating = async () => {
    if (ratingVideoType.value === 'local' && ratingVideoPath.value) {
        await setRating(ratingVideoPath.value, ratingValue.value, ratingComment.value)
    } else if (ratingVideoType.value === 'cloud' && ratingVideoId.value) {
        await setCloudRating(ratingVideoId.value, ratingValue.value, ratingComment.value)
    }
    closeRatingModal()
}

const deleteRating = async () => {
    if (ratingVideoType.value === 'local' && ratingVideoPath.value) {
        await removeRating(ratingVideoPath.value)
    } else if (ratingVideoType.value === 'cloud' && ratingVideoId.value) {
        await removeCloudRating(ratingVideoId.value)
    }
    closeRatingModal()
}

// Playlist functions for cloud videos
const openPlaylistModal = (video: any) => {
    selectedVideoForPlaylist.value = video
    showPlaylistModal.value = true
}

const closePlaylistModal = () => {
    showPlaylistModal.value = false
    selectedVideoForPlaylist.value = null
    newPlaylistName.value = ''
}

const handleCreatePlaylist = async () => {
    if (newPlaylistName.value.trim()) {
        await createCloudPlaylist(newPlaylistName.value.trim())
        newPlaylistName.value = ''
    }
}

const handleAssignToPlaylist = async (playlistName: string | null) => {
    if (selectedVideoForPlaylist.value) {
        await assignToPlaylist(selectedVideoForPlaylist.value.id, playlistName)
        await fetchUploadedVideos()
        closePlaylistModal()
    }
}

// Filter uploaded videos by search
const filteredUploadedVideos = computed(() => {
    if (!uploadSearchQuery.value) return sortedUploadedVideos.value
    const query = uploadSearchQuery.value.toLowerCase()
    return sortedUploadedVideos.value.filter(
        (v) =>
            v.title?.toLowerCase().includes(query) ||
            v.artist?.toLowerCase().includes(query) ||
            v.album?.toLowerCase().includes(query)
    )
})

// Initialize uploaded videos on tab change
watch(activeTab, async (tab) => {
    if (tab === 'upload' && uploadedVideos.value.length === 0) {
        await fetchUploadedVideos()
    }
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col theme-transition">
        <Navbar mode="app" />

        <div class="pt-24 pb-12">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Tab Navigation -->
                <div class="flex items-center gap-4 mb-8">
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 btn-press',
                            activeTab === 'local'
                                ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white',
                        ]"
                        @click="activeTab = 'local'"
                    >
                        <UIcon name="i-heroicons-folder" class="w-5 h-5 icon-bounce" />
                        {{ t('lectures.tabs.local') }}
                    </button>
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 btn-press',
                            activeTab === 'youtube'
                                ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white',
                        ]"
                        @click="activeTab = 'youtube'"
                    >
                        <UIcon name="i-heroicons-play" class="w-5 h-5 icon-bounce" />
                        YouTube
                    </button>
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 btn-press',
                            activeTab === 'upload'
                                ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white',
                        ]"
                        @click="activeTab = 'upload'"
                    >
                        <UIcon name="i-heroicons-cloud-arrow-up" class="w-5 h-5 icon-bounce" />
                        {{ t('lectures.tabs.upload') }}
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
                                <div
                                    :class="[
                                        'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-110',
                                        `bg-${themeColor}-500/20`,
                                    ]"
                                >
                                    <UIcon
                                        name="i-heroicons-folder-open"
                                        :class="['w-12 h-12', theme.textLight]"
                                    />
                                </div>
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
                                    <span :class="[theme.textLight, 'font-medium']">
                                        {{ savedFolderName }}
                                    </span>
                                </p>
                                <UButton
                                    icon="i-heroicons-arrow-path"
                                    size="xl"
                                    :label="t('lectures.hero.reauthorize')"
                                    :loading="loading"
                                    :class="[`text-white font-semibold btn-press`, theme.bg]"
                                    @click="handleReauthorize"
                                />
                                <p class="text-gray-500 text-sm mt-4">
                                    {{ t('lectures.hero.orSelectNew') }}
                                </p>
                            </div>

                            <UButton
                                icon="i-heroicons-folder-plus"
                                size="xl"
                                :label="t('lectures.hero.selectFolder')"
                                :loading="loading"
                                :variant="needsReauthorization ? 'outline' : 'solid'"
                                :class="
                                    needsReauthorization
                                        ? `border-${themeColor}-600 ${theme.textLight} hover:bg-${themeColor}-600/20 btn-press`
                                        : `${theme.bg} text-white font-semibold btn-press`
                                "
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
                            <h2
                                class="text-2xl font-semibold text-white mb-4 flex items-center gap-2"
                            >
                                <UIcon name="i-heroicons-play-circle" class="w-6 h-6" />
                                {{ t('lectures.sections.continueWatching') }}
                            </h2>
                            <div
                                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                            >
                                <div
                                    v-for="video in continueWatching.slice(0, 6)"
                                    :key="video.path"
                                    class="group relative cursor-pointer video-card"
                                >
                                    <div
                                        class="aspect-[16/10] rounded-lg overflow-hidden relative"
                                        :style="{ backgroundColor: getVideoThumbnail(video) }"
                                        @click="handleVideoClick(video)"
                                    >
                                        <div class="absolute inset-0 flex items-center justify-center">
                                            <UIcon name="i-heroicons-film" class="w-12 h-12 text-white/50" />
                                        </div>
                                        <!-- Rating badge -->
                                        <div v-if="getRating(video.path)" class="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                            <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-400" />
                                            <span class="text-white text-xs font-bold">{{ getRating(video.path)?.rating }}/10</span>
                                        </div>
                                        <!-- Favorite badge -->
                                        <div v-if="isFavorite(video.path)" class="absolute top-2 right-2">
                                            <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-500" />
                                        </div>
                                        <!-- Progress bar -->
                                        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                                            <div :class="['h-full', theme.bg]" :style="{ width: `${(getProgress(video.path) / 100) * 100}%` }" />
                                        </div>
                                        <!-- Play overlay with action buttons -->
                                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <UIcon name="i-heroicons-play" class="w-10 h-10 text-white" />
                                            <div class="flex items-center gap-2">
                                                <button class="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="openRatingModal(video.path, null, 'local')">
                                                    <UIcon name="i-heroicons-star" class="w-4 h-4 text-yellow-400" />
                                                </button>
                                                <button class="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="toggleFavorite(video.path)">
                                                    <UIcon :name="isFavorite(video.path) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'" :class="isFavorite(video.path) ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-gray-400'" />
                                                </button>
                                                <button class="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="openLocalVideoDetails(video)">
                                                    <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- Remove from continue watching button -->
                                    <button
                                        class="absolute -top-2 -right-2 w-6 h-6 rounded-xl bg-red-600 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center"
                                        @click.stop="removeFromWatching(video.path)"
                                    >
                                        <UIcon name="i-heroicons-minus" class="w-3 h-3" />
                                    </button>
                                    <p class="mt-2 text-sm text-gray-300 truncate">
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
                                        :style="{
                                            backgroundColor: getVideoThumbnail(video),
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
                                    <p class="mt-2 text-sm text-gray-300 truncate">
                                        {{ formatVideoName(video.name) }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Playlists (Folders) Section -->
                        <div v-if="localPlaylists.length > 0" class="mb-12">
                            <h2
                                class="text-2xl font-semibold text-white mb-4 flex items-center gap-2"
                            >
                                <UIcon name="i-heroicons-folder" class="w-6 h-6 text-purple-400" />
                                {{ t('lectures.sections.playlists') }}
                                <span class="text-gray-500 text-lg font-normal">
                                    ({{ localPlaylists.length }})
                                </span>
                            </h2>
                            <div
                                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                            >
                                <div
                                    v-for="playlist in localPlaylists"
                                    :key="playlist.name"
                                    class="group relative cursor-pointer video-card"
                                    @click="selectedLocalPlaylist = playlist.name"
                                >
                                    <div
                                        class="aspect-video rounded-xl overflow-hidden relative bg-gradient-to-br from-purple-900/60 to-gray-900 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300"
                                    >
                                        <div
                                            class="absolute inset-0 flex flex-col items-center justify-center"
                                        >
                                            <UIcon
                                                name="i-heroicons-folder-open"
                                                class="w-12 h-12 text-purple-400/70"
                                            />
                                            <span class="text-purple-300/80 text-xs mt-2">
                                                {{ playlist.videos.length }} {{ t('lectures.videos') }}
                                            </span>
                                        </div>
                                        <!-- Hover overlay -->
                                        <div
                                            class="absolute inset-0 bg-purple-600/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                                        >
                                            <UIcon
                                                name="i-heroicons-play"
                                                class="w-12 h-12 text-white transform group-hover:scale-110 transition-transform"
                                            />
                                        </div>
                                    </div>
                                    <p class="mt-3 text-sm font-medium text-white truncate text-center">
                                        {{ playlist.name }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Selected Playlist Videos -->
                        <div v-if="selectedLocalPlaylist" class="mb-12">
                            <div class="flex items-center gap-4 mb-4">
                                <button
                                    class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                                    @click="selectedLocalPlaylist = null"
                                >
                                    <UIcon name="i-heroicons-arrow-left" class="w-5 h-5 text-white" />
                                </button>
                                <h2 class="text-2xl font-semibold text-white flex items-center gap-2">
                                    <UIcon name="i-heroicons-folder-open" class="w-6 h-6 text-purple-400" />
                                    {{ selectedLocalPlaylist }}
                                    <span class="text-gray-500 text-lg font-normal">
                                        ({{ getVideosByFolder(selectedLocalPlaylist).length }})
                                    </span>
                                </h2>
                            </div>
                            <div
                                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
                            >
                                <div
                                    v-for="video in getVideosByFolder(selectedLocalPlaylist)"
                                    :key="video.path"
                                    class="group relative video-card"
                                >
                                    <!-- Improved Video Card -->
                                    <div
                                        class="aspect-[5/6] rounded-xl overflow-hidden relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                                        :style="{
                                            backgroundColor: getVideoThumbnail(video),
                                        }"
                                    >
                                        <div
                                            class="absolute inset-0 flex items-center justify-center bg-black/30"
                                        >
                                            <UIcon
                                                name="i-heroicons-film"
                                                class="w-16 h-16 text-white/40"
                                            />
                                        </div>
                                        <!-- Rating badge -->
                                        <div v-if="getRating(video.path)" class="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                            <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-400" />
                                            <span class="text-white text-xs font-bold">{{ getRating(video.path)?.rating }}/10</span>
                                        </div>
                                        <!-- Favorite badge -->
                                        <div v-if="isFavorite(video.path)" class="absolute top-2 right-2">
                                            <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-500" />
                                        </div>
                                        <!-- Hover overlay -->
                                        <div
                                            class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end p-4"
                                        >
                                            <div class="flex items-center gap-2 mb-3">
                                                <button
                                                    class="p-3 rounded-full bg-purple-600 hover:bg-purple-500 transition-colors transform hover:scale-110"
                                                    @click.stop="handleVideoClick(video)"
                                                >
                                                    <UIcon name="i-heroicons-play-solid" class="w-6 h-6 text-white" />
                                                </button>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <button
                                                    class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors"
                                                    @click.stop="openRatingModal(video.path, null, 'local')"
                                                >
                                                    <UIcon name="i-heroicons-star" class="w-4 h-4 text-yellow-400" />
                                                </button>
                                                <button
                                                    class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors"
                                                    @click.stop="toggleFavorite(video.path)"
                                                >
                                                    <UIcon :name="isFavorite(video.path) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'" :class="isFavorite(video.path) ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-gray-400'" />
                                                </button>
                                                <button
                                                    class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors"
                                                    @click.stop="openLocalVideoDetails(video)"
                                                >
                                                    <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-3">
                                        <p class="text-sm font-medium text-white truncate">
                                            {{ formatVideoName(video.name) }}
                                        </p>
                                        <p class="text-xs text-gray-500">
                                            {{ formatSize(video.size) }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- All Videos Section (only when no playlist selected) -->
                        <div v-if="!selectedLocalPlaylist">
                            <h2
                                class="text-2xl font-semibold text-white mb-4 flex items-center gap-2"
                            >
                                <UIcon name="i-heroicons-film" class="w-6 h-6 text-purple-400" />
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
                                <p class="text-gray-400">
                                    {{ t('lectures.library.noVideos') }}
                                </p>
                            </div>

                            <div
                                v-else
                                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
                            >
                                <div
                                    v-for="video in filteredVideos"
                                    :key="video.path"
                                    class="group relative video-card"
                                >
                                    <!-- Improved Video Card -->
                                    <div
                                        class="aspect-[5/6] rounded-xl overflow-hidden relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                                        :style="{
                                            backgroundColor: getVideoThumbnail(video),
                                        }"
                                        @click="handleVideoClick(video)"
                                    >
                                        <div
                                            class="absolute inset-0 flex items-center justify-center bg-black/30"
                                        >
                                            <UIcon
                                                name="i-heroicons-film"
                                                class="w-16 h-16 text-white/40"
                                            />
                                        </div>
                                        <!-- Rating badge -->
                                        <div v-if="getRating(video.path)" class="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                            <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-400" />
                                            <span class="text-white text-xs font-bold">{{ getRating(video.path)?.rating }}/10</span>
                                        </div>
                                        <!-- Favorite badge -->
                                        <div v-if="isFavorite(video.path)" class="absolute top-2 right-2">
                                            <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-500" />
                                        </div>
                                        <!-- Folder badge -->
                                        <div v-if="video.folder" class="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-purple-300">
                                            <UIcon name="i-heroicons-folder" class="w-3 h-3 inline mr-1" />
                                            {{ video.folder }}
                                        </div>
                                        <!-- Hover overlay -->
                                        <div
                                            class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end p-4"
                                        >
                                            <div class="flex items-center gap-2 mb-3">
                                                <button
                                                    class="p-3 rounded-full bg-purple-600 hover:bg-purple-500 transition-colors transform hover:scale-110"
                                                    @click.stop="handleVideoClick(video)"
                                                >
                                                    <UIcon name="i-heroicons-play-solid" class="w-6 h-6 text-white" />
                                                </button>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <button
                                                    class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors"
                                                    @click.stop="openRatingModal(video.path, null, 'local')"
                                                >
                                                    <UIcon name="i-heroicons-star" class="w-4 h-4 text-yellow-400" />
                                                </button>
                                                <button
                                                    class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors"
                                                    @click.stop="toggleFavorite(video.path)"
                                                >
                                                    <UIcon :name="isFavorite(video.path) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'" :class="isFavorite(video.path) ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-gray-400'" />
                                                </button>
                                                <button
                                                    class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors"
                                                    @click.stop="openLocalVideoDetails(video)"
                                                >
                                                    <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-3">
                                        <p class="text-sm font-medium text-white truncate">
                                            {{ formatVideoName(video.name) }}
                                        </p>
                                        <p class="text-xs text-gray-500">
                                            {{ formatSize(video.size) }}
                                        </p>
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
                                    <UIcon name="i-heroicons-play" class="w-14 h-14 text-white" />
                                </div>
                                <h1 class="text-4xl font-bold text-white mb-4">
                                    {{ t('lectures.youtube.title') }}
                                </h1>
                                <p class="text-gray-400 text-lg mb-8">
                                    {{ t('lectures.youtube.description') }}
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
                                {{ t('lectures.youtube.permissionNotice') }}
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
                                        {{ youtubeChannel?.title || 'YouTube' }}
                                    </h1>
                                    <p class="text-gray-400 text-sm">
                                        {{ t('lectures.youtube.connected') }}
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
                                        {{ t('lectures.youtube.error') }}
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
                                        selectedPlaylist === 'liked'
                                            ? t('lectures.youtube.likedVideos')
                                            : youtubePlaylists.find(
                                                  (p) => p.id === selectedPlaylist
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
                            <div v-if="youtubeLoading" class="flex justify-center py-12">
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
                                    {{ t('lectures.youtube.noVideos') }}
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
                                        <p class="text-white font-medium line-clamp-2">
                                            {{ video.title }}
                                        </p>
                                        <p class="text-gray-400 text-sm mt-1">
                                            {{ video.channelTitle }}
                                        </p>
                                        <p class="text-gray-500 text-xs mt-1">
                                            {{ formatViewCount(video.viewCount) }}
                                            {{ t('lectures.youtube.views') }} •
                                            {{ formatPublishedAt(video.publishedAt) }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Playlists view -->
                        <div v-else>
                            <!-- Quick access section -->
                            <div class="mb-8">
                                <h2 class="text-xl font-semibold text-white mb-4">
                                    {{ t('lectures.youtube.quickAccess') }}
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
                                            {{ t('lectures.youtube.likedVideos') }}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <!-- Playlists section -->
                            <div>
                                <h2
                                    class="text-xl font-semibold text-white mb-4 flex items-center gap-2"
                                >
                                    <UIcon name="i-heroicons-queue-list" class="w-5 h-5" />
                                    {{ t('lectures.youtube.playlists') }}
                                    <span class="text-gray-500 text-base font-normal">
                                        ({{ youtubePlaylists.length }})
                                    </span>
                                </h2>

                                <div v-if="youtubeLoading" class="flex justify-center py-12">
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
                                        {{ t('lectures.youtube.noPlaylists') }}
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
                                        @click="handleSelectPlaylist(playlist.id)"
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
                                        <p class="mt-2 text-sm text-gray-300 line-clamp-2">
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
                    <div
                        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
                    >
                        <h1 class="text-4xl font-bold text-white">
                            {{ t('lectures.upload.title') }}
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
                                class="bg-purple-600 hover:bg-purple-700 text-white"
                                :loading="uploading"
                                @click="handleFileSelect"
                            />
                        </div>
                    </div>

                    <!-- Sort controls -->
                    <div class="flex items-center gap-4 mb-6">
                        <span class="text-gray-400 text-sm">
                            {{ t('lectures.upload.sortBy') }}:
                        </span>
                        <div class="flex items-center gap-2">
                            <button
                                v-for="option in [
                                    {
                                        value: 'created_at',
                                        label: t('lectures.upload.sortOptions.date'),
                                    },
                                    {
                                        value: 'title',
                                        label: t('lectures.upload.sortOptions.name'),
                                    },
                                    {
                                        value: 'file_size',
                                        label: t('lectures.upload.sortOptions.size'),
                                    },
                                ]"
                                :key="option.value"
                                :class="[
                                    'px-3 py-1.5 rounded-lg text-sm transition-colors',
                                    uploadSortBy === option.value
                                        ? 'bg-purple-600 text-white'
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
                                :name="
                                    uploadSortOrder === 'asc'
                                        ? 'i-heroicons-arrow-up'
                                        : 'i-heroicons-arrow-down'
                                "
                                class="w-4 h-4"
                            />
                        </button>
                    </div>

                    <!-- Upload progress -->
                    <div v-if="uploading && Object.keys(uploadProgress).length > 0" class="mb-8">
                        <h2 class="text-lg font-semibold text-white mb-4">
                            {{ t('lectures.upload.uploading') }}
                        </h2>
                        <div class="space-y-3">
                            <div
                                v-for="(progress, filename) in uploadProgress"
                                :key="filename"
                                class="bg-gray-800 rounded-lg p-4"
                            >
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-gray-300 truncate flex-1">
                                        {{ filename }}
                                    </span>
                                    <span class="text-purple-400 text-sm ml-4">{{ progress }}%</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        class="bg-purple-500 h-2 rounded-full transition-all duration-300"
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
                                    {{ t('lectures.upload.error') }}
                                </p>
                                <p class="text-red-300/70 text-sm mt-1">
                                    {{ uploadError }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Loading state -->
                    <div v-if="uploadLoading && !uploading" class="flex justify-center py-12">
                        <div
                            class="w-12 h-12 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin"
                        ></div>
                    </div>

                    <!-- Empty state -->
                    <div
                        v-else-if="uploadedVideos.length === 0 && !uploadLoading"
                        class="flex flex-col items-center justify-center min-h-[40vh]"
                    >
                        <div class="text-center max-w-lg">
                            <UIcon
                                name="i-heroicons-cloud-arrow-up"
                                class="w-24 h-24 text-purple-500/50 mx-auto mb-6"
                            />
                            <h2 class="text-2xl font-bold text-white mb-4">
                                {{ t('lectures.upload.emptyTitle') }}
                            </h2>
                            <p class="text-gray-400 mb-8">
                                {{ t('lectures.upload.emptyDescription') }}
                            </p>
                            <UButton
                                icon="i-heroicons-cloud-arrow-up"
                                size="xl"
                                :label="t('lectures.upload.uploadFirst')"
                                class="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                @click="handleFileSelect"
                            />
                        </div>
                    </div>

                    <!-- Videos sections -->
                    <div v-else>
                        <!-- Continue Watching Section (Cloud) -->
                        <div v-if="cloudContinueWatching.length > 0 && !selectedCloudPlaylist" class="mb-12">
                            <h2 class="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                                <UIcon name="i-heroicons-play-circle" class="w-6 h-6" />
                                {{ t('lectures.sections.continueWatching') }}
                            </h2>
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                <div
                                    v-for="video in cloudContinueWatching.slice(0, 6)"
                                    :key="video.id"
                                    class="group relative cursor-pointer video-card"
                                >
                                    <div
                                        class="aspect-[16/10] rounded-lg overflow-hidden relative"
                                        @click="playCloudVideo(video)"
                                    >
                                        <img
                                            v-if="video.thumbnailPath"
                                            :src="getThumbnailUrl(video.thumbnailPath)"
                                            :alt="video.title"
                                            class="w-full h-full object-cover"
                                        />
                                        <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-gray-900">
                                            <UIcon name="i-heroicons-film" class="w-12 h-12 text-white/50" />
                                        </div>
                                        <!-- Rating badge -->
                                        <div v-if="getCloudRating(video.id)" class="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                            <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-400" />
                                            <span class="text-white text-xs font-bold">{{ getCloudRating(video.id)?.rating }}/10</span>
                                        </div>
                                        <!-- Favorite badge -->
                                        <div v-if="isCloudFavorite(video.id)" class="absolute top-2 right-2">
                                            <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-500" />
                                        </div>
                                        <!-- Progress bar -->
                                        <div v-if="video.duration && getCloudProgress(video.id) > 0" class="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                                            <div class="h-full bg-purple-500" :style="{ width: `${(getCloudProgress(video.id) / video.duration) * 100}%` }" />
                                        </div>
                                        <!-- Play overlay with action buttons -->
                                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <UIcon name="i-heroicons-play" class="w-10 h-10 text-white" />
                                            <div class="flex items-center gap-2">
                                                <button class="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="openRatingModal(null, video.id, 'cloud')">
                                                    <UIcon name="i-heroicons-star" class="w-4 h-4 text-yellow-400" />
                                                </button>
                                                <button class="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="toggleCloudFavorite(video.id)">
                                                    <UIcon :name="isCloudFavorite(video.id) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'" :class="isCloudFavorite(video.id) ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-gray-400'" />
                                                </button>
                                                <button class="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="openVideoDetails(video)">
                                                    <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- Remove from continue watching button -->
                                    <button
                                        class="absolute -top-2 -right-2 w-6 h-6 rounded-xl bg-red-600 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center"
                                        @click.stop="removeFromContinueWatching(video.id)"
                                    >
                                        <UIcon name="i-heroicons-minus" class="w-3 h-3" />
                                    </button>
                                    <p class="mt-2 text-sm text-gray-300 truncate">{{ video.title || video.fileName }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Favorites Section (Cloud) -->
                        <div v-if="cloudFavoriteVideos.length > 0 && !selectedCloudPlaylist" class="mb-12">
                            <h2 class="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                                <UIcon name="i-heroicons-heart" class="w-6 h-6 text-red-500" />
                                {{ t('lectures.sections.favorites') }}
                            </h2>
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                <div
                                    v-for="video in cloudFavoriteVideos"
                                    :key="video.id"
                                    class="group relative cursor-pointer video-card"
                                >
                                    <div
                                        class="aspect-video rounded-lg overflow-hidden relative"
                                        @click="playCloudVideo(video)"
                                    >
                                        <img
                                            v-if="video.thumbnailPath"
                                            :src="getThumbnailUrl(video.thumbnailPath)"
                                            :alt="video.title"
                                            class="w-full h-full object-cover"
                                        />
                                        <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-gray-900">
                                            <UIcon name="i-heroicons-film" class="w-12 h-12 text-white/50" />
                                        </div>
                                        <!-- Rating badge -->
                                        <div v-if="getCloudRating(video.id)" class="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                            <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-400" />
                                            <span class="text-white text-xs font-bold">{{ getCloudRating(video.id)?.rating }}/10</span>
                                        </div>
                                        <!-- Favorite badge -->
                                        <div class="absolute top-2 right-2">
                                            <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-500" />
                                        </div>
                                        <!-- Play overlay -->
                                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <UIcon name="i-heroicons-play" class="w-12 h-12 text-white" />
                                        </div>
                                    </div>
                                    <p class="mt-2 text-sm text-gray-300 truncate">{{ video.title || video.fileName }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Playlists Section (Cloud) -->
                        <div v-if="playlistsWithVideos.length > 0 && !selectedCloudPlaylist" class="mb-12">
                            <h2 class="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                                <UIcon name="i-heroicons-folder" class="w-6 h-6 text-purple-400" />
                                {{ t('lectures.sections.playlists') }}
                            </h2>
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                <div
                                    v-for="playlist in playlistsWithVideos"
                                    :key="playlist.name"
                                    class="group relative cursor-pointer video-card"
                                    @click="selectedCloudPlaylist = playlist.name"
                                >
                                    <div class="aspect-video rounded-lg overflow-hidden relative bg-gradient-to-br from-purple-900/50 to-gray-900 border border-purple-500/30">
                                        <img
                                            v-if="playlist.thumbnail"
                                            :src="getThumbnailUrl(playlist.thumbnail)"
                                            alt=""
                                            class="w-full h-full object-cover opacity-60"
                                        />
                                        <div class="absolute inset-0 flex items-center justify-center">
                                            <UIcon name="i-heroicons-folder-open" class="w-12 h-12 text-purple-400/70" />
                                        </div>
                                        <!-- Delete button -->
                                        <button
                                            class="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            @click.stop="deleteCloudPlaylist(playlist.name)"
                                        >
                                            <UIcon name="i-heroicons-trash" class="w-3 h-3" />
                                        </button>
                                        <!-- Play overlay -->
                                        <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <UIcon name="i-heroicons-play" class="w-12 h-12 text-white transform group-hover:scale-110 transition-transform" />
                                        </div>
                                    </div>
                                    <p class="mt-2 text-sm text-white font-medium truncate">{{ playlist.name }}</p>
                                    <p class="text-xs text-gray-500">{{ playlist.videos.length }} {{ t('lectures.videos') }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Selected Playlist Videos (Cloud) -->
                        <div v-if="selectedCloudPlaylist" class="mb-12">
                            <div class="flex items-center gap-4 mb-6">
                                <button
                                    class="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                                    @click="selectedCloudPlaylist = null"
                                >
                                    <UIcon name="i-heroicons-arrow-left" class="w-5 h-5 text-white" />
                                </button>
                                <h2 class="text-2xl font-semibold text-white flex items-center gap-2">
                                    <UIcon name="i-heroicons-folder-open" class="w-6 h-6 text-purple-400" />
                                    {{ selectedCloudPlaylist }}
                                </h2>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                <div
                                    v-for="video in playlistsWithVideos.find(p => p.name === selectedCloudPlaylist)?.videos || []"
                                    :key="video.id"
                                    class="group relative video-card"
                                >
                                    <div
                                        class="aspect-[5/6] rounded-xl overflow-hidden relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer"
                                        @click="playCloudVideo(video)"
                                    >
                                        <img
                                            v-if="video.thumbnailPath"
                                            :src="getThumbnailUrl(video.thumbnailPath)"
                                            :alt="video.title"
                                            class="w-full h-full object-cover"
                                        />
                                        <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-gray-900">
                                            <UIcon name="i-heroicons-film" class="w-16 h-16 text-white/40" />
                                        </div>
                                        <!-- Rating badge -->
                                        <div v-if="getCloudRating(video.id)" class="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                            <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-400" />
                                            <span class="text-white text-xs font-bold">{{ getCloudRating(video.id)?.rating }}/10</span>
                                        </div>
                                        <!-- Favorite badge -->
                                        <div v-if="isCloudFavorite(video.id)" class="absolute top-2 right-2">
                                            <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-500" />
                                        </div>
                                        <!-- Hover overlay with remove from playlist -->
                                        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end p-4">
                                            <div class="flex items-center gap-2 mb-3">
                                                <button class="p-3 rounded-full bg-purple-600 hover:bg-purple-500 transition-colors transform hover:scale-110" @click.stop="playCloudVideo(video)">
                                                    <UIcon name="i-heroicons-play-solid" class="w-6 h-6 text-white" />
                                                </button>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <button class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="openRatingModal(null, video.id, 'cloud')">
                                                    <UIcon name="i-heroicons-star" class="w-4 h-4 text-yellow-400" />
                                                </button>
                                                <button class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="toggleCloudFavorite(video.id)">
                                                    <UIcon :name="isCloudFavorite(video.id) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'" :class="isCloudFavorite(video.id) ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-gray-400'" />
                                                </button>
                                                <button class="p-2 rounded-full bg-red-600/80 hover:bg-red-500 transition-colors" @click.stop="assignToPlaylist(video.id, null)">
                                                    <UIcon name="i-heroicons-minus" class="w-4 h-4 text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-3">
                                        <p class="text-sm font-medium text-white truncate">{{ video.title || video.fileName }}</p>
                                        <p v-if="video.fileSize" class="text-xs text-gray-500">{{ formatFileSize(video.fileSize) }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- All Videos Section (Cloud) -->
                        <div v-if="!selectedCloudPlaylist">
                            <h2 class="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <UIcon name="i-heroicons-film" class="w-5 h-5" />
                                {{ t('lectures.sections.allVideos') }}
                                <span class="text-gray-500 text-base font-normal">({{ filteredUploadedVideos.length }})</span>
                            </h2>

                            <div v-if="filteredUploadedVideos.length === 0" class="text-center py-12">
                                <UIcon name="i-heroicons-magnifying-glass" class="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p class="text-gray-400">{{ t('lectures.upload.noResults') }}</p>
                            </div>

                            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                <div
                                    v-for="video in filteredUploadedVideos"
                                    :key="video.id"
                                    class="group relative video-card"
                                >
                                    <div
                                        class="aspect-[5/6] rounded-xl overflow-hidden relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer"
                                        @click="playCloudVideo(video)"
                                    >
                                        <img
                                            v-if="video.thumbnailPath"
                                            :src="getThumbnailUrl(video.thumbnailPath)"
                                            :alt="video.title"
                                            class="w-full h-full object-cover"
                                        />
                                        <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-gray-900">
                                            <UIcon name="i-heroicons-film" class="w-16 h-16 text-white/40" />
                                        </div>

                                        <!-- Rating badge -->
                                        <div v-if="getCloudRating(video.id)" class="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                            <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-yellow-400" />
                                            <span class="text-white text-xs font-bold">{{ getCloudRating(video.id)?.rating }}/10</span>
                                        </div>

                                        <!-- Favorite badge -->
                                        <div v-if="isCloudFavorite(video.id)" class="absolute top-2 right-2">
                                            <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-500" />
                                        </div>

                                        <!-- Duration badge -->
                                        <div v-if="video.duration" class="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                                            {{ formatUploadDuration(video.duration) }}
                                        </div>

                                        <!-- Playlist badge -->
                                        <div v-if="video.playlist" class="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-purple-300">
                                            <UIcon name="i-heroicons-folder" class="w-3 h-3 inline mr-1" />
                                            {{ video.playlist }}
                                        </div>

                                        <!-- Hover overlay -->
                                        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end p-4">
                                            <div class="flex items-center gap-2 mb-3">
                                                <button class="p-3 rounded-full bg-purple-600 hover:bg-purple-500 transition-colors transform hover:scale-110" @click.stop="playCloudVideo(video)">
                                                    <UIcon name="i-heroicons-play-solid" class="w-6 h-6 text-white" />
                                                </button>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <button class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="openRatingModal(null, video.id, 'cloud')">
                                                    <UIcon name="i-heroicons-star" class="w-4 h-4 text-yellow-400" />
                                                </button>
                                                <button class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="toggleCloudFavorite(video.id)">
                                                    <UIcon :name="isCloudFavorite(video.id) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'" :class="isCloudFavorite(video.id) ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-gray-400'" />
                                                </button>
                                                <button class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="openPlaylistModal(video)">
                                                    <UIcon name="i-heroicons-folder-plus" class="w-4 h-4 text-purple-400" />
                                                </button>
                                                <button class="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors" @click.stop="openVideoDetails(video)">
                                                    <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
                                                </button>
                                                <button class="p-2 rounded-full bg-gray-800/80 hover:bg-red-600 transition-colors" @click.stop="confirmDeleteVideo(video.id)">
                                                    <UIcon name="i-heroicons-trash" class="w-4 h-4 text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mt-3">
                                        <p class="text-sm font-medium text-white truncate">{{ video.title || video.fileName }}</p>
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
                        @enterpictureinpicture="isPiP = true"
                        @leavepictureinpicture="isPiP = false"
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
                                        :class="[
                                            `w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-${themeColor}-500`,
                                        ]"
                                        @input="seek"
                                        @click.stop
                                    />
                                    <div class="flex justify-between text-xs text-gray-400 mt-1">
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
                                                :class="[
                                                    `w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-${themeColor}-500`,
                                                ]"
                                                @input="changeVolume"
                                                @click.stop
                                            />
                                        </div>

                                        <!-- Picture-in-Picture button -->
                                        <UButton
                                            icon="i-heroicons-window"
                                            color="neutral"
                                            variant="ghost"
                                            size="lg"
                                            :class="isPiP ? 'text-green-400' : ''"
                                            title="Picture-in-Picture"
                                            @click.stop="togglePiP"
                                        />

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
                    <div class="flex items-center justify-between p-4 bg-gray-900/90">
                        <div class="flex items-center gap-4">
                            <UButton
                                icon="i-heroicons-arrow-left"
                                color="neutral"
                                variant="ghost"
                                size="lg"
                                @click="closeYoutubePlayer"
                            />
                            <div>
                                <h3 class="text-white font-semibold text-lg line-clamp-1">
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
                                    isYoutubeFavorite(currentYoutubeVideo.id) ? 'text-red-500' : ''
                                "
                                @click="toggleYoutubeFavorite(currentYoutubeVideo.id)"
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
                                    getYoutubeProgress(currentYoutubeVideo.id)
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
                    <div
                        class="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <!-- Header -->
                        <div
                            class="sticky top-0 bg-gray-900 p-6 border-b border-gray-800 flex items-center justify-between"
                        >
                            <h2 class="text-xl font-bold text-white">
                                {{ t('lectures.upload.videoDetails') }}
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
                                <div v-else class="w-full h-full flex items-center justify-center">
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
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.upload.metadata.title') }}
                                        </label>
                                        <p class="text-white">
                                            {{ selectedUploadedVideo.title || '-' }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.upload.metadata.artist') }}
                                        </label>
                                        <p class="text-white">
                                            {{ selectedUploadedVideo.artist || '-' }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.upload.metadata.album') }}
                                        </label>
                                        <p class="text-white">
                                            {{ selectedUploadedVideo.album || '-' }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.upload.metadata.year') }}
                                        </label>
                                        <p class="text-white">
                                            {{ selectedUploadedVideo.year || '-' }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.upload.metadata.genre') }}
                                        </label>
                                        <p class="text-white">
                                            {{ selectedUploadedVideo.genre || '-' }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.upload.metadata.duration') }}
                                        </label>
                                        <p class="text-white">
                                            {{
                                                selectedUploadedVideo.duration
                                                    ? formatUploadDuration(
                                                          selectedUploadedVideo.duration
                                                      )
                                                    : '-'
                                            }}
                                        </p>
                                    </div>
                                </div>

                                <div class="border-t border-gray-800 pt-4">
                                    <h3 class="text-gray-400 text-sm mb-3">
                                        {{ t('lectures.upload.metadata.fileInfo') }}
                                    </h3>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="text-gray-500 text-xs">
                                                {{ t('lectures.upload.metadata.filename') }}
                                            </label>
                                            <p class="text-gray-300 text-sm truncate">
                                                {{ selectedUploadedVideo.fileName }}
                                            </p>
                                        </div>
                                        <div>
                                            <label class="text-gray-500 text-xs">
                                                {{ t('lectures.upload.metadata.size') }}
                                            </label>
                                            <p class="text-gray-300 text-sm">
                                                {{ formatFileSize(selectedUploadedVideo.fileSize) }}
                                            </p>
                                        </div>
                                        <div>
                                            <label class="text-gray-500 text-xs">
                                                {{ t('lectures.upload.metadata.format') }}
                                            </label>
                                            <p class="text-gray-300 text-sm">
                                                {{ selectedUploadedVideo.mimeType }}
                                            </p>
                                        </div>
                                        <div>
                                            <label class="text-gray-500 text-xs">
                                                {{ t('lectures.upload.metadata.resolution') }}
                                            </label>
                                            <p
                                                v-if="
                                                    selectedUploadedVideo.width &&
                                                    selectedUploadedVideo.height
                                                "
                                                class="text-gray-300 text-sm"
                                            >
                                                {{ selectedUploadedVideo.width }}x{{
                                                    selectedUploadedVideo.height
                                                }}
                                            </p>
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
                            <div
                                class="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center"
                            >
                                <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-white">
                                    {{ t('lectures.upload.deleteConfirm.title') }}
                                </h3>
                                <p class="text-gray-400 text-sm">
                                    {{ t('lectures.upload.deleteConfirm.message') }}
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
                            <!-- Picture-in-Picture for cloud video -->
                            <UButton
                                icon="i-heroicons-window"
                                color="neutral"
                                variant="ghost"
                                size="lg"
                                title="Picture-in-Picture"
                                @click="toggleCloudPiP"
                            />
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
                    <div
                        class="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <!-- Header -->
                        <div
                            class="sticky top-0 bg-gray-900 p-6 border-b border-gray-800 flex items-center justify-between"
                        >
                            <h2 class="text-xl font-bold text-white">
                                {{ t('lectures.local.videoDetails') }}
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
                                <UIcon name="i-heroicons-film" class="w-24 h-24 text-white/30" />
                            </div>

                            <!-- Metadata -->
                            <div class="space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="col-span-2">
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.local.metadata.name') }}
                                        </label>
                                        <p class="text-white text-lg font-medium">
                                            {{ formatVideoName(selectedLocalVideo.name) }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.local.metadata.size') }}
                                        </label>
                                        <p class="text-white">
                                            {{ formatSize(selectedLocalVideo.size) }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.local.metadata.type') }}
                                        </label>
                                        <p class="text-white">
                                            {{
                                                selectedLocalVideo.type ||
                                                selectedLocalVideo.name
                                                    .split('.')
                                                    .pop()
                                                    ?.toUpperCase()
                                            }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.local.metadata.lastModified') }}
                                        </label>
                                        <p class="text-white">
                                            {{
                                                selectedLocalVideo.lastModified
                                                    ? new Date(
                                                          selectedLocalVideo.lastModified
                                                      ).toLocaleDateString()
                                                    : '-'
                                            }}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-gray-400 text-sm">
                                            {{ t('lectures.local.metadata.path') }}
                                        </label>
                                        <p
                                            class="text-gray-300 text-sm truncate"
                                            :title="selectedLocalVideo.path"
                                        >
                                            {{ selectedLocalVideo.path }}
                                        </p>
                                    </div>
                                </div>

                                <!-- Progress info -->
                                <div
                                    v-if="getProgress(selectedLocalVideo.path) > 0"
                                    class="border-t border-gray-800 pt-4"
                                >
                                    <label class="text-gray-400 text-sm">
                                        {{ t('lectures.local.metadata.progress') }}
                                    </label>
                                    <div class="flex items-center gap-2 mt-1">
                                        <div
                                            class="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden"
                                        >
                                            <div
                                                :class="['h-full', theme.bg]"
                                                :style="{
                                                    width: `${Math.min((getProgress(selectedLocalVideo.path) / 100) * 100, 100)}%`,
                                                }"
                                            />
                                        </div>
                                        <span class="text-white text-sm">
                                            {{
                                                formatDuration(getProgress(selectedLocalVideo.path))
                                            }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Favorite status -->
                                <div
                                    class="border-t border-gray-800 pt-4 flex items-center justify-between"
                                >
                                    <span class="text-gray-400">
                                        {{ t('lectures.local.metadata.favorite') }}
                                    </span>
                                    <UButton
                                        :icon="
                                            isFavorite(selectedLocalVideo.path)
                                                ? 'i-heroicons-heart-solid'
                                                : 'i-heroicons-heart'
                                        "
                                        :color="
                                            isFavorite(selectedLocalVideo.path)
                                                ? 'error'
                                                : 'neutral'
                                        "
                                        variant="ghost"
                                        :label="
                                            isFavorite(selectedLocalVideo.path)
                                                ? t('lectures.local.removeFromFavorites')
                                                : t('lectures.local.addToFavorites')
                                        "
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

        <!-- Rating Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showRatingModal"
                    class="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
                    @click.self="closeRatingModal"
                >
                    <div class="bg-gray-900 rounded-2xl max-w-md w-full p-6">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-bold text-white">
                                {{ t('lectures.rating.title') }}
                            </h2>
                            <UButton
                                icon="i-heroicons-x-mark"
                                color="neutral"
                                variant="ghost"
                                @click="closeRatingModal"
                            />
                        </div>

                        <!-- Rating Stars -->
                        <div class="mb-6">
                            <label class="text-gray-400 text-sm mb-2 block">
                                {{ t('lectures.rating.score') }}
                            </label>
                            <div class="flex items-center gap-2">
                                <input
                                    v-model.number="ratingValue"
                                    type="range"
                                    min="1"
                                    max="10"
                                    class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <span class="text-2xl font-bold text-purple-400 w-16 text-center">
                                    {{ ratingValue }}/10
                                </span>
                            </div>
                            <div class="flex justify-between mt-2">
                                <button
                                    v-for="n in 10"
                                    :key="n"
                                    class="w-8 h-8 rounded-full transition-all"
                                    :class="n <= ratingValue ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'"
                                    @click="ratingValue = n"
                                >
                                    {{ n }}
                                </button>
                            </div>
                        </div>

                        <!-- Comment -->
                        <div class="mb-6">
                            <label class="text-gray-400 text-sm mb-2 block">
                                {{ t('lectures.rating.comment') }}
                            </label>
                            <textarea
                                v-model="ratingComment"
                                class="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                                :placeholder="t('lectures.rating.commentPlaceholder')"
                            />
                        </div>

                        <!-- Actions -->
                        <div class="flex justify-between">
                            <UButton
                                v-if="(ratingVideoType === 'local' && ratingVideoPath && getRating(ratingVideoPath)) || (ratingVideoType === 'cloud' && ratingVideoId && getCloudRating(ratingVideoId))"
                                icon="i-heroicons-trash"
                                color="error"
                                variant="ghost"
                                :label="t('lectures.rating.delete')"
                                @click="deleteRating"
                            />
                            <div class="flex-1" />
                            <div class="flex gap-3">
                                <UButton
                                    color="neutral"
                                    variant="ghost"
                                    :label="t('common.cancel')"
                                    @click="closeRatingModal"
                                />
                                <UButton
                                    icon="i-heroicons-check"
                                    class="bg-purple-600 hover:bg-purple-700 text-white"
                                    :label="t('lectures.rating.save')"
                                    @click="saveRating"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Playlist Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showPlaylistModal"
                    class="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
                    @click.self="closePlaylistModal"
                >
                    <div class="bg-gray-900 rounded-2xl max-w-md w-full p-6">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-bold text-white">
                                {{ t('lectures.playlist.title') }}
                            </h2>
                            <UButton
                                icon="i-heroicons-x-mark"
                                color="neutral"
                                variant="ghost"
                                @click="closePlaylistModal"
                            />
                        </div>

                        <!-- Create new playlist -->
                        <div class="mb-6">
                            <label class="text-gray-400 text-sm mb-2 block">
                                {{ t('lectures.playlist.createNew') }}
                            </label>
                            <div class="flex gap-2">
                                <UInput
                                    v-model="newPlaylistName"
                                    :placeholder="t('lectures.playlist.namePlaceholder')"
                                    class="flex-1"
                                />
                                <UButton
                                    icon="i-heroicons-plus"
                                    class="bg-purple-600 hover:bg-purple-700 text-white"
                                    :disabled="!newPlaylistName.trim()"
                                    @click="handleCreatePlaylist"
                                />
                            </div>
                        </div>

                        <!-- Existing playlists -->
                        <div v-if="cloudPlaylists.length > 0" class="mb-6">
                            <label class="text-gray-400 text-sm mb-2 block">
                                {{ t('lectures.playlist.addTo') }}
                            </label>
                            <div class="space-y-2 max-h-48 overflow-y-auto">
                                <button
                                    v-for="playlist in cloudPlaylists"
                                    :key="playlist"
                                    class="w-full flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
                                    :class="selectedVideoForPlaylist?.playlist === playlist ? 'border-2 border-purple-500' : ''"
                                    @click="handleAssignToPlaylist(playlist)"
                                >
                                    <UIcon name="i-heroicons-folder" class="w-5 h-5 text-purple-400" />
                                    <span class="text-white">{{ playlist }}</span>
                                    <UIcon
                                        v-if="selectedVideoForPlaylist?.playlist === playlist"
                                        name="i-heroicons-check"
                                        class="w-5 h-5 text-purple-400 ml-auto"
                                    />
                                </button>
                            </div>
                        </div>

                        <!-- Remove from playlist -->
                        <div v-if="selectedVideoForPlaylist?.playlist" class="border-t border-gray-800 pt-4">
                            <UButton
                                icon="i-heroicons-folder-minus"
                                color="neutral"
                                variant="ghost"
                                :label="t('lectures.playlist.removeFromPlaylist')"
                                class="w-full justify-center"
                                @click="handleAssignToPlaylist(null)"
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

/* Video card animations */
.video-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.video-card:hover {
    z-index: 10;
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
