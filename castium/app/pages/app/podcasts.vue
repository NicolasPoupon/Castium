<script setup lang="ts">
import { useI18n } from '#imports'
import type { ThemeColor } from '~/composables/useTheme'

definePageMeta({
    ssr: false,
})

const { t } = useI18n()
const { colors, colorClasses } = useTheme()

// Get theme classes for podcasts
const themeColor = computed(() => colors.value.podcasts as ThemeColor)
const theme = computed(() => colorClasses[themeColor.value] || colorClasses.pink)

// Local podcasts composable
const {
    podcasts: localPodcasts,
    likedPodcasts: localLikedPodcasts,
    inProgressPodcasts: localInProgressPodcasts,
    loading: localLoading,
    hasPermission: localHasPermission,
    needsReauthorization: localNeedsReauthorization,
    savedFolderName: localSavedFolderName,
    playbackState: localPlaybackState,
    initialize: initializeLocal,
    selectFolder,
    reauthorizeFolder,
    toggleLike: toggleLocalLike,
    updateNotes: updateLocalNotes,
    deletePodcast: deleteLocalPodcast,
    playPodcast: playLocalPodcast,
    togglePlay: toggleLocalPlay,
    seek: seekLocal,
    skip: skipLocal,
    setVolume: setLocalVolume,
    toggleMute: toggleLocalMute,
    setPlaybackSpeed: setLocalPlaybackSpeed,
    formatDuration: formatLocalDuration,
    formatFileSize: formatLocalFileSize,
    getPodcastColor: getLocalPodcastColor,
    cleanup: cleanupLocal,
} = useLocalPodcasts()

// Cloud podcasts composable
const {
    podcasts: cloudPodcasts,
    likedPodcasts: cloudLikedPodcasts,
    inProgressPodcasts: cloudInProgressPodcasts,
    loading: cloudLoading,
    uploading: cloudUploading,
    uploadProgress: cloudUploadProgress,
    playbackState: cloudPlaybackState,
    fetchPodcasts: fetchCloudPodcasts,
    uploadPodcasts: uploadCloudPodcasts,
    deletePodcast: deleteCloudPodcast,
    toggleLike: toggleCloudLike,
    updateNotes: updateCloudNotes,
    playPodcast: playCloudPodcast,
    togglePlay: toggleCloudPlay,
    seek: seekCloud,
    skip: skipCloud,
    setVolume: setCloudVolume,
    toggleMute: toggleCloudMute,
    setPlaybackSpeed: setCloudPlaybackSpeed,
    formatDuration: formatCloudDuration,
    formatFileSize: formatCloudFileSize,
    getPodcastColor: getCloudPodcastColor,
    cleanup: cleanupCloud,
} = useCloudPodcasts()

// Tab state
type TabType = 'local' | 'cloud'
const activeTab = ref<TabType>('local')

// View mode for each tab
type ViewMode = 'all' | 'liked' | 'inProgress'
const localViewMode = ref<ViewMode>('all')
const cloudViewMode = ref<ViewMode>('all')

// Search
const localSearchQuery = ref('')
const cloudSearchQuery = ref('')

// Modals
const showPodcastInfo = ref(false)
const selectedPodcast = ref<any>(null)
const isLocalPodcast = ref(true)

// Edit notes modal
const showEditNotes = ref(false)
const editNotesText = ref('')
const editCommentText = ref('')

// Delete confirmation
const showDeleteConfirm = ref(false)
const podcastToDelete = ref<any>(null)

// File input ref for cloud upload
const cloudFileInputRef = ref<HTMLInputElement | null>(null)

// Filtered podcasts
const filteredLocalPodcasts = computed(() => {
    let list: any[] = []
    switch (localViewMode.value) {
        case 'liked':
            list = localLikedPodcasts.value
            break
        case 'inProgress':
            list = localInProgressPodcasts.value
            break
        default:
            list = localPodcasts.value
    }

    if (!localSearchQuery.value) return list
    const query = localSearchQuery.value.toLowerCase()
    return list.filter(
        (p) =>
            p.title?.toLowerCase().includes(query) ||
            p.album?.toLowerCase().includes(query) ||
            p.artist?.toLowerCase().includes(query) ||
            p.fileName.toLowerCase().includes(query)
    )
})

const filteredCloudPodcasts = computed(() => {
    let list: any[] = []
    switch (cloudViewMode.value) {
        case 'liked':
            list = cloudLikedPodcasts.value
            break
        case 'inProgress':
            list = cloudInProgressPodcasts.value
            break
        default:
            list = cloudPodcasts.value
    }

    if (!cloudSearchQuery.value) return list
    const query = cloudSearchQuery.value.toLowerCase()
    return list.filter(
        (p) =>
            p.title?.toLowerCase().includes(query) ||
            p.album?.toLowerCase().includes(query) ||
            p.artist?.toLowerCase().includes(query) ||
            p.fileName.toLowerCase().includes(query)
    )
})

// Handlers
const handleCloudFileSelect = () => {
    cloudFileInputRef.value?.click()
}

const handleCloudFilesSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
        await uploadCloudPodcasts(input.files)
        input.value = ''
    }
}

const openPodcastInfo = (podcast: any, isLocal: boolean) => {
    selectedPodcast.value = podcast
    isLocalPodcast.value = isLocal
    showPodcastInfo.value = true
}

const closePodcastInfo = () => {
    showPodcastInfo.value = false
    selectedPodcast.value = null
}

const openEditNotes = () => {
    if (!selectedPodcast.value) return
    editNotesText.value = selectedPodcast.value.notes || ''
    editCommentText.value = selectedPodcast.value.comment || ''
    showEditNotes.value = true
}

const saveNotes = async () => {
    if (!selectedPodcast.value) return

    if (isLocalPodcast.value) {
        await updateLocalNotes(selectedPodcast.value, editNotesText.value, editCommentText.value)
    } else {
        await updateCloudNotes(selectedPodcast.value, editNotesText.value, editCommentText.value)
    }

    selectedPodcast.value.notes = editNotesText.value
    selectedPodcast.value.comment = editCommentText.value
    showEditNotes.value = false
}

const confirmDelete = (podcast: any, isLocal: boolean) => {
    podcastToDelete.value = podcast
    isLocalPodcast.value = isLocal
    showDeleteConfirm.value = true
}

const handleDelete = async () => {
    if (!podcastToDelete.value) return

    if (isLocalPodcast.value) {
        await deleteLocalPodcast(podcastToDelete.value)
    } else {
        await deleteCloudPodcast(podcastToDelete.value)
    }

    showDeleteConfirm.value = false
    podcastToDelete.value = null
    closePodcastInfo()
}

const cancelDelete = () => {
    showDeleteConfirm.value = false
    podcastToDelete.value = null
}

// Play handlers
const handlePlay = (podcast: any, isLocal: boolean) => {
    if (isLocal) {
        playLocalPodcast(podcast)
    } else {
        playCloudPodcast(podcast)
    }
}

// Like handlers
const handleToggleLike = async (podcast: any, isLocal: boolean) => {
    if (isLocal) {
        await toggleLocalLike(podcast)
    } else {
        await toggleCloudLike(podcast)
    }
}

// Current playback helpers
const currentPlaybackState = computed(() => {
    return activeTab.value === 'local' ? localPlaybackState.value : cloudPlaybackState.value
})

const formatDuration = (seconds?: number) => {
    return activeTab.value === 'local' ? formatLocalDuration(seconds) : formatCloudDuration(seconds)
}

// Initialize
onMounted(async () => {
    await initializeLocal()
    await fetchCloudPodcasts()
})

onUnmounted(() => {
    cleanupLocal()
    cleanupCloud()
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col theme-transition">
        <Navbar mode="app" />

        <div class="pt-20 pb-32 flex-1">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Header with tabs -->
                <div
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
                >
                    <div class="flex items-center gap-3">
                        <div
                            :class="[
                                'w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-110',
                                theme.bg,
                            ]"
                        >
                            <UIcon name="i-heroicons-microphone" class="w-6 h-6 text-white" />
                        </div>
                        <h1 class="text-2xl font-bold text-white">{{ t('podcasts.title') }}</h1>
                    </div>

                    <!-- Tabs -->
                    <div class="flex gap-2">
                        <button
                            :class="[
                                'px-4 py-2 rounded-lg font-medium transition-all duration-300 btn-press',
                                activeTab === 'local'
                                    ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white',
                            ]"
                            @click="activeTab = 'local'"
                        >
                            <UIcon
                                name="i-heroicons-folder"
                                class="w-4 h-4 inline mr-2 icon-bounce"
                            />
                            {{ t('podcasts.tabs.local') }}
                        </button>
                        <button
                            :class="[
                                'px-4 py-2 rounded-lg font-medium transition-all duration-300 btn-press',
                                activeTab === 'cloud'
                                    ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white',
                            ]"
                            @click="activeTab = 'cloud'"
                        >
                            <UIcon
                                name="i-heroicons-cloud"
                                class="w-4 h-4 inline mr-2 icon-bounce"
                            />
                            {{ t('podcasts.tabs.cloud') }}
                        </button>
                    </div>
                </div>

                <!-- LOCAL TAB -->
                <div v-if="activeTab === 'local'" class="animate-fade-in">
                    <!-- No folder selected -->
                    <div
                        v-if="!localHasPermission && !localNeedsReauthorization"
                        class="flex flex-col items-center justify-center min-h-[50vh]"
                    >
                        <div class="text-center max-w-lg">
                            <div
                                :class="[
                                    'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-110',
                                    `bg-${themeColor}-500/20`,
                                ]"
                            >
                                <UIcon
                                    name="i-heroicons-folder-open"
                                    :class="['w-10 h-10', theme.textLight]"
                                />
                            </div>
                            <h2 class="text-2xl font-bold text-white mb-3">
                                {{ t('podcasts.local.title') }}
                            </h2>
                            <p class="text-gray-400 mb-6">{{ t('podcasts.local.description') }}</p>
                            <button
                                :class="[
                                    `px-6 py-3 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg btn-press`,
                                    theme.bg,
                                    `hover:shadow-${themeColor}-500/25`,
                                ]"
                                @click="selectFolder"
                            >
                                {{ t('podcasts.local.selectFolder') }}
                            </button>
                        </div>
                    </div>

                    <!-- Needs reauthorization -->
                    <div
                        v-else-if="localNeedsReauthorization"
                        class="flex flex-col items-center justify-center min-h-[50vh]"
                    >
                        <div class="text-center max-w-lg">
                            <div
                                class="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <UIcon name="i-heroicons-key" class="w-10 h-10 text-yellow-400" />
                            </div>
                            <h2 class="text-xl font-bold text-white mb-2">
                                {{ t('podcasts.local.previousFolder') }}
                            </h2>
                            <p :class="['font-medium mb-4', theme.textLight]">
                                {{ localSavedFolderName }}
                            </p>
                            <button
                                :class="[
                                    `px-6 py-3 text-white rounded-lg font-medium transition-all duration-300 btn-press`,
                                    theme.bg,
                                ]"
                                @click="reauthorizeFolder"
                            >
                                {{ t('podcasts.local.reauthorize') }}
                            </button>
                        </div>
                    </div>

                    <!-- Podcasts loaded -->
                    <div v-else>
                        <!-- Filter bar -->
                        <div class="flex flex-col sm:flex-row gap-4 mb-6">
                            <!-- View mode buttons -->
                            <div class="flex gap-2">
                                <button
                                    :class="[
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all btn-press',
                                        localViewMode === 'all'
                                            ? `bg-${themeColor}-500/20 ${theme.textLight} ring-1 ring-${themeColor}-500/50`
                                            : 'bg-gray-800/60 text-gray-400 hover:text-white',
                                    ]"
                                    @click="localViewMode = 'all'"
                                >
                                    {{ t('podcasts.filter.all') }}
                                </button>
                                <button
                                    :class="[
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all btn-press',
                                        localViewMode === 'inProgress'
                                            ? `bg-${themeColor}-500/20 ${theme.textLight} ring-1 ring-${themeColor}-500/50`
                                            : 'bg-gray-800/60 text-gray-400 hover:text-white',
                                    ]"
                                    @click="localViewMode = 'inProgress'"
                                >
                                    {{ t('podcasts.filter.inProgress') }}
                                </button>
                                <button
                                    :class="[
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all btn-press',
                                        localViewMode === 'liked'
                                            ? `bg-${themeColor}-500/20 ${theme.textLight} ring-1 ring-${themeColor}-500/50`
                                            : 'bg-gray-800/60 text-gray-400 hover:text-white',
                                    ]"
                                    @click="localViewMode = 'liked'"
                                >
                                    {{ t('podcasts.filter.liked') }}
                                </button>
                            </div>

                            <!-- Search -->
                            <div class="flex-1">
                                <UInput
                                    v-model="localSearchQuery"
                                    :placeholder="t('podcasts.searchPlaceholder')"
                                    icon="i-heroicons-magnifying-glass"
                                    class="w-full"
                                />
                            </div>

                            <!-- Change folder -->
                            <button
                                class="px-4 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-lg text-sm transition-colors btn-press"
                                @click="selectFolder"
                            >
                                {{ t('podcasts.local.changeFolder') }}
                            </button>
                        </div>

                        <!-- Loading -->
                        <div v-if="localLoading" class="flex items-center justify-center py-20">
                            <UIcon
                                name="i-heroicons-arrow-path"
                                :class="['w-8 h-8 animate-spin', theme.textLight]"
                            />
                        </div>

                        <!-- Empty state -->
                        <div
                            v-else-if="filteredLocalPodcasts.length === 0"
                            class="text-center py-20"
                        >
                            <UIcon
                                name="i-heroicons-microphone"
                                class="w-16 h-16 text-gray-600 mx-auto mb-4"
                            />
                            <p class="text-gray-400">{{ t('podcasts.local.noPodcasts') }}</p>
                        </div>

                        <!-- Podcast list -->
                        <div v-else class="grid gap-3">
                            <TransitionGroup name="list">
                                <div
                                    v-for="podcast in filteredLocalPodcasts"
                                    :key="podcast.id"
                                    class="group bg-gray-800/40 hover:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:shadow-lg cursor-pointer border border-gray-700/30 card-hover"
                                    @click="openPodcastInfo(podcast, true)"
                                >
                                    <div class="flex items-center gap-4">
                                        <!-- Cover/Icon -->
                                        <div
                                            :class="[
                                                'w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                                                theme.bg,
                                            ]"
                                        >
                                            <UIcon
                                                name="i-heroicons-microphone"
                                                class="w-8 h-8 text-white/80"
                                            />
                                        </div>

                                        <!-- Info -->
                                        <div class="flex-1 min-w-0">
                                            <h3 class="text-white font-medium truncate">
                                                {{ podcast.title || podcast.fileName }}
                                            </h3>
                                            <p class="text-gray-400 text-sm truncate">
                                                {{ podcast.album || t('podcasts.unknownShow') }}
                                            </p>

                                            <!-- Progress bar -->
                                            <div
                                                v-if="podcast.progress > 0 && !podcast.isCompleted"
                                                class="mt-2"
                                            >
                                                <div
                                                    class="h-1 bg-gray-700 rounded-full overflow-hidden"
                                                >
                                                    <div
                                                        :class="[
                                                            'h-full rounded-full transition-all duration-300',
                                                            theme.bg,
                                                        ]"
                                                        :style="{ width: `${podcast.progress}%` }"
                                                    />
                                                </div>
                                            </div>
                                            <div
                                                v-else-if="podcast.isCompleted"
                                                class="mt-2 flex items-center gap-1 text-green-400 text-xs"
                                            >
                                                <UIcon
                                                    name="i-heroicons-check-circle"
                                                    class="w-4 h-4"
                                                />
                                                {{ t('podcasts.completed') }}
                                            </div>
                                        </div>

                                        <!-- Duration -->
                                        <span class="text-gray-500 text-sm">
                                            {{ formatLocalDuration(podcast.duration) }}
                                        </span>

                                        <!-- Actions -->
                                        <div
                                            class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click.stop
                                        >
                                            <button
                                                class="p-2 rounded-full hover:bg-gray-700 transition-colors btn-press"
                                                @click="handleToggleLike(podcast, true)"
                                            >
                                                <UIcon
                                                    :name="
                                                        podcast.isLiked
                                                            ? 'i-heroicons-heart-solid'
                                                            : 'i-heroicons-heart'
                                                    "
                                                    :class="
                                                        podcast.isLiked
                                                            ? ['w-5 h-5', theme.textLight]
                                                            : 'w-5 h-5 text-gray-400'
                                                    "
                                                />
                                            </button>
                                            <button
                                                :class="[
                                                    `p-2 rounded-full transition-colors btn-press`,
                                                    theme.bg,
                                                ]"
                                                @click="handlePlay(podcast, true)"
                                            >
                                                <UIcon
                                                    name="i-heroicons-play-solid"
                                                    class="w-5 h-5 text-white"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </TransitionGroup>
                        </div>
                    </div>
                </div>

                <!-- CLOUD TAB -->
                <div v-if="activeTab === 'cloud'" class="animate-fade-in">
                    <!-- Filter bar -->
                    <div class="flex flex-col sm:flex-row gap-4 mb-6">
                        <!-- View mode buttons -->
                        <div class="flex gap-2">
                            <button
                                :class="[
                                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all btn-press',
                                    cloudViewMode === 'all'
                                        ? `bg-${themeColor}-500/20 ${theme.textLight} ring-1 ring-${themeColor}-500/50`
                                        : 'bg-gray-800/60 text-gray-400 hover:text-white',
                                ]"
                                @click="cloudViewMode = 'all'"
                            >
                                {{ t('podcasts.filter.all') }}
                            </button>
                            <button
                                :class="[
                                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all btn-press',
                                    cloudViewMode === 'inProgress'
                                        ? `bg-${themeColor}-500/20 ${theme.textLight} ring-1 ring-${themeColor}-500/50`
                                        : 'bg-gray-800/60 text-gray-400 hover:text-white',
                                ]"
                                @click="cloudViewMode = 'inProgress'"
                            >
                                {{ t('podcasts.filter.inProgress') }}
                            </button>
                            <button
                                :class="[
                                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all btn-press',
                                    cloudViewMode === 'liked'
                                        ? `bg-${themeColor}-500/20 ${theme.textLight} ring-1 ring-${themeColor}-500/50`
                                        : 'bg-gray-800/60 text-gray-400 hover:text-white',
                                ]"
                                @click="cloudViewMode = 'liked'"
                            >
                                {{ t('podcasts.filter.liked') }}
                            </button>
                        </div>

                        <!-- Search -->
                        <div class="flex-1">
                            <UInput
                                v-model="cloudSearchQuery"
                                :placeholder="t('podcasts.searchPlaceholder')"
                                icon="i-heroicons-magnifying-glass"
                                class="w-full"
                            />
                        </div>

                        <!-- Upload button -->
                        <button
                            :disabled="cloudUploading"
                            :class="[
                                `px-4 py-2 text-white rounded-lg font-medium transition-all duration-300 flex items-center gap-2 btn-press`,
                                theme.bg,
                                `hover:shadow-lg hover:shadow-${themeColor}-500/25 disabled:opacity-50`,
                            ]"
                            @click="handleCloudFileSelect"
                        >
                            <UIcon
                                :name="
                                    cloudUploading
                                        ? 'i-heroicons-arrow-path'
                                        : 'i-heroicons-arrow-up-tray'
                                "
                                :class="
                                    cloudUploading ? 'w-5 h-5 animate-spin' : 'w-5 h-5 icon-bounce'
                                "
                            />
                            {{
                                cloudUploading
                                    ? t('podcasts.cloud.uploading')
                                    : t('podcasts.cloud.upload')
                            }}
                        </button>
                        <input
                            ref="cloudFileInputRef"
                            type="file"
                            accept="audio/*"
                            multiple
                            class="hidden"
                            @change="handleCloudFilesSelected"
                        />
                    </div>

                    <!-- Upload progress -->
                    <div v-if="cloudUploadProgress.length > 0" class="mb-6 space-y-2">
                        <div
                            v-for="progress in cloudUploadProgress"
                            :key="progress.fileName"
                            class="bg-gray-800/60 backdrop-blur-sm rounded-lg p-3 border border-gray-700/30"
                        >
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-white text-sm truncate">
                                    {{ progress.fileName }}
                                </span>
                                <span
                                    :class="[
                                        'text-xs font-medium',
                                        progress.status === 'complete'
                                            ? 'text-green-400'
                                            : progress.status === 'error'
                                              ? 'text-red-400'
                                              : theme.textLight,
                                    ]"
                                >
                                    {{
                                        progress.status === 'complete'
                                            ? '✓'
                                            : progress.status === 'error'
                                              ? '✗'
                                              : `${progress.progress}%`
                                    }}
                                </span>
                            </div>
                            <div class="h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    :class="[
                                        'h-full rounded-full transition-all duration-300',
                                        progress.status === 'error' ? 'bg-red-500' : theme.bg,
                                    ]"
                                    :style="{ width: `${progress.progress}%` }"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Loading -->
                    <div v-if="cloudLoading" class="flex items-center justify-center py-20">
                        <UIcon
                            name="i-heroicons-arrow-path"
                            :class="['w-8 h-8 animate-spin', theme.textLight]"
                        />
                    </div>

                    <!-- Empty state -->
                    <div
                        v-else-if="filteredCloudPodcasts.length === 0"
                        class="flex flex-col items-center justify-center min-h-[50vh]"
                    >
                        <div class="text-center">
                            <div
                                :class="[
                                    'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-110',
                                    `bg-${themeColor}-500/20`,
                                ]"
                            >
                                <UIcon
                                    name="i-heroicons-cloud-arrow-up"
                                    :class="['w-10 h-10', theme.textLight]"
                                />
                            </div>
                            <h2 class="text-xl font-bold text-white mb-3">
                                {{ t('podcasts.cloud.uploadFirst') }}
                            </h2>
                            <p class="text-gray-400 mb-6">{{ t('podcasts.cloud.noPodcasts') }}</p>
                            <button
                                :class="[
                                    `px-6 py-3 text-white rounded-lg font-medium transition-all duration-300 btn-press hover:shadow-lg`,
                                    theme.bg,
                                    `hover:shadow-${themeColor}-500/25`,
                                ]"
                                @click="handleCloudFileSelect"
                            >
                                {{ t('podcasts.cloud.upload') }}
                            </button>
                        </div>
                    </div>

                    <!-- Podcast list -->
                    <div v-else class="grid gap-3">
                        <TransitionGroup name="list">
                            <div
                                v-for="podcast in filteredCloudPodcasts"
                                :key="podcast.id"
                                class="group bg-gray-800/40 hover:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:shadow-lg cursor-pointer border border-gray-700/30 card-hover"
                                @click="openPodcastInfo(podcast, false)"
                            >
                                <div class="flex items-center gap-4">
                                    <!-- Cover/Icon -->
                                    <div
                                        :class="[
                                            'w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                                            theme.bg,
                                        ]"
                                    >
                                        <UIcon
                                            name="i-heroicons-microphone"
                                            class="w-8 h-8 text-white/80"
                                        />
                                    </div>

                                    <!-- Info -->
                                    <div class="flex-1 min-w-0">
                                        <h3 class="text-white font-medium truncate">
                                            {{ podcast.title || podcast.fileName }}
                                        </h3>
                                        <p class="text-gray-400 text-sm truncate">
                                            {{ podcast.album || t('podcasts.unknownShow') }}
                                        </p>

                                        <!-- Progress bar -->
                                        <div
                                            v-if="podcast.progress > 0 && !podcast.isCompleted"
                                            class="mt-2"
                                        >
                                            <div
                                                class="h-1 bg-gray-700 rounded-full overflow-hidden"
                                            >
                                                <div
                                                    :class="[
                                                        'h-full rounded-full transition-all duration-300',
                                                        theme.bg,
                                                    ]"
                                                    :style="{ width: `${podcast.progress}%` }"
                                                />
                                            </div>
                                        </div>
                                        <div
                                            v-else-if="podcast.isCompleted"
                                            class="mt-2 flex items-center gap-1 text-green-400 text-xs"
                                        >
                                            <UIcon
                                                name="i-heroicons-check-circle"
                                                class="w-4 h-4"
                                            />
                                            {{ t('podcasts.completed') }}
                                        </div>
                                    </div>

                                    <!-- Duration -->
                                    <span class="text-gray-500 text-sm">
                                        {{ formatCloudDuration(podcast.duration) }}
                                    </span>

                                    <!-- Actions -->
                                    <div
                                        class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        @click.stop
                                    >
                                        <button
                                            class="p-2 rounded-full hover:bg-gray-700 transition-colors btn-press"
                                            @click="handleToggleLike(podcast, false)"
                                        >
                                            <UIcon
                                                :name="
                                                    podcast.isLiked
                                                        ? 'i-heroicons-heart-solid'
                                                        : 'i-heroicons-heart'
                                                "
                                                :class="
                                                    podcast.isLiked
                                                        ? ['w-5 h-5', theme.textLight]
                                                        : 'w-5 h-5 text-gray-400'
                                                "
                                            />
                                        </button>
                                        <button
                                            :class="[
                                                `p-2 rounded-full transition-colors btn-press`,
                                                theme.bg,
                                            ]"
                                            @click="handlePlay(podcast, false)"
                                        >
                                            <UIcon
                                                name="i-heroicons-play-solid"
                                                class="w-5 h-5 text-white"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </TransitionGroup>
                    </div>
                </div>
            </div>
        </div>

        <!-- Player bar -->
        <Transition name="slide-up">
            <div
                v-if="currentPlaybackState.currentPodcast"
                :class="[
                    `fixed bottom-0 left-0 right-0 backdrop-blur-lg border-t border-gray-800 z-40 bg-gradient-to-r from-gray-900 via-${themeColor}-900/30 to-gray-900`,
                ]"
            >
                <div class="max-w-7xl mx-auto px-4 py-3">
                    <div class="flex items-center gap-4">
                        <!-- Podcast info -->
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div
                                :class="[
                                    'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                                    theme.bg,
                                ]"
                            >
                                <UIcon name="i-heroicons-microphone" class="w-6 h-6 text-white" />
                            </div>
                            <div class="min-w-0">
                                <p class="text-white font-medium truncate">
                                    {{
                                        currentPlaybackState.currentPodcast.title ||
                                        currentPlaybackState.currentPodcast.fileName
                                    }}
                                </p>
                                <p class="text-gray-400 text-sm truncate">
                                    {{
                                        currentPlaybackState.currentPodcast.album ||
                                        t('podcasts.unknownShow')
                                    }}
                                </p>
                            </div>
                        </div>

                        <!-- Controls -->
                        <div class="flex items-center gap-3">
                            <!-- Skip back -->
                            <button
                                class="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white btn-press"
                                @click="activeTab === 'local' ? skipLocal(-15) : skipCloud(-15)"
                            >
                                <UIcon name="i-heroicons-backward" class="w-5 h-5" />
                            </button>

                            <!-- Play/Pause -->
                            <button
                                :class="[`p-3 rounded-full transition-colors btn-press`, theme.bg]"
                                @click="activeTab === 'local' ? toggleLocalPlay() : toggleCloudPlay()"
                            >
                                <UIcon
                                    :name="
                                        currentPlaybackState.isPlaying
                                            ? 'i-heroicons-pause-solid'
                                            : 'i-heroicons-play-solid'
                                    "
                                    class="w-6 h-6 text-white"
                                />
                            </button>

                            <!-- Skip forward -->
                            <button
                                class="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white btn-press"
                                @click="activeTab === 'local' ? skipLocal(30) : skipCloud(30)"
                            >
                                <UIcon name="i-heroicons-forward" class="w-5 h-5" />
                            </button>
                        </div>

                        <!-- Progress -->
                        <div class="hidden sm:flex items-center gap-2 flex-1">
                            <span class="text-gray-500 text-xs w-12 text-right">
                                {{ formatDuration(currentPlaybackState.currentTime) }}
                            </span>
                            <input
                                type="range"
                                min="0"
                                :max="currentPlaybackState.duration || 100"
                                :value="currentPlaybackState.currentTime"
                                :class="[
                                    `flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-${themeColor}-500`,
                                ]"
                                @input="
                                    (e) =>
                                        activeTab === 'local'
                                            ? seekLocal(
                                                  Number((e.target as HTMLInputElement).value)
                                              )
                                            : seekCloud(
                                                  Number((e.target as HTMLInputElement).value)
                                              )
                                "
                            />
                            <span class="text-gray-500 text-xs w-12">
                                {{ formatDuration(currentPlaybackState.duration) }}
                            </span>
                        </div>

                        <!-- Speed control -->
                        <div class="hidden md:flex items-center gap-2">
                            <select
                                :value="currentPlaybackState.playbackSpeed"
                                :class="[
                                    `bg-gray-800 text-gray-300 text-sm rounded-lg px-2 py-1 border-none focus:ring-1 focus:ring-${themeColor}-500`,
                                ]"
                                @change="
                                    (e) =>
                                        activeTab === 'local'
                                            ? setLocalPlaybackSpeed(
                                                  Number((e.target as HTMLSelectElement).value)
                                              )
                                            : setCloudPlaybackSpeed(
                                                  Number((e.target as HTMLSelectElement).value)
                                              )
                                "
                            >
                                <option :value="0.5">0.5x</option>
                                <option :value="0.75">0.75x</option>
                                <option :value="1">1x</option>
                                <option :value="1.25">1.25x</option>
                                <option :value="1.5">1.5x</option>
                                <option :value="2">2x</option>
                            </select>
                        </div>

                        <!-- Volume -->
                        <div class="hidden lg:flex items-center gap-2">
                            <button
                                class="p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white btn-press"
                                @click="activeTab === 'local' ? toggleLocalMute() : toggleCloudMute()"
                            >
                                <UIcon
                                    :name="
                                        currentPlaybackState.isMuted
                                            ? 'i-heroicons-speaker-x-mark'
                                            : 'i-heroicons-speaker-wave'
                                    "
                                    class="w-5 h-5"
                                />
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                :value="
                                    currentPlaybackState.isMuted ? 0 : currentPlaybackState.volume
                                "
                                :class="[
                                    `w-20 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-${themeColor}-500`,
                                ]"
                                @input="
                                    (e) =>
                                        activeTab === 'local'
                                            ? setLocalVolume(
                                                  Number((e.target as HTMLInputElement).value)
                                              )
                                            : setCloudVolume(
                                                  Number((e.target as HTMLInputElement).value)
                                              )
                                "
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Podcast Info Modal -->
        <Transition name="modal">
            <div
                v-if="showPodcastInfo && selectedPodcast"
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
                @click.self="closePodcastInfo"
            >
                <div
                    class="bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-modal-in"
                >
                    <!-- Header -->
                    <div class="relative p-6 pb-4">
                        <button
                            class="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-800 transition-colors"
                            @click="closePodcastInfo"
                        >
                            <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-gray-400" />
                        </button>

                        <div class="flex items-start gap-4">
                            <div
                                :class="[
                                    'w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105',
                                    theme.bg,
                                ]"
                            >
                                <UIcon
                                    name="i-heroicons-microphone"
                                    class="w-10 h-10 text-white/80"
                                />
                            </div>
                            <div class="flex-1 min-w-0 pt-1">
                                <h2 class="text-xl font-bold text-white truncate">
                                    {{ selectedPodcast.title || selectedPodcast.fileName }}
                                </h2>
                                <p :class="['truncate', theme.textLight]">
                                    {{ selectedPodcast.album || t('podcasts.unknownShow') }}
                                </p>
                                <p class="text-gray-500 text-sm mt-1">
                                    {{
                                        isLocalPodcast
                                            ? formatLocalDuration(selectedPodcast.duration)
                                            : formatCloudDuration(selectedPodcast.duration)
                                    }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="px-6 pb-6 space-y-4">
                        <!-- Progress -->
                        <div
                            v-if="selectedPodcast.progress > 0"
                            class="bg-gray-800/60 rounded-lg p-3 backdrop-blur-sm"
                        >
                            <div class="flex justify-between text-sm mb-2">
                                <span class="text-gray-400">{{ t('podcasts.info.progress') }}</span>
                                <span :class="theme.textLight">
                                    {{ Math.round(selectedPodcast.progress) }}%
                                </span>
                            </div>
                            <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    :class="['h-full rounded-full transition-all', theme.bg]"
                                    :style="{ width: `${selectedPodcast.progress}%` }"
                                />
                            </div>
                        </div>

                        <!-- Notes -->
                        <div class="bg-gray-800/60 rounded-lg p-3 backdrop-blur-sm">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-gray-400 text-sm">
                                    {{ t('podcasts.info.notes') }}
                                </span>
                                <button
                                    :class="[
                                        'text-sm hover:opacity-80 transition-colors',
                                        theme.textLight,
                                    ]"
                                    @click="openEditNotes"
                                >
                                    {{ t('podcasts.info.edit') }}
                                </button>
                            </div>
                            <p v-if="selectedPodcast.notes" class="text-white text-sm">
                                {{ selectedPodcast.notes }}
                            </p>
                            <p v-else class="text-gray-500 text-sm italic">
                                {{ t('podcasts.info.noNotes') }}
                            </p>
                        </div>

                        <!-- Comment -->
                        <div class="bg-gray-800 rounded-lg p-3">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-gray-400 text-sm">
                                    {{ t('podcasts.info.comment') }}
                                </span>
                            </div>
                            <p v-if="selectedPodcast.comment" class="text-white text-sm">
                                {{ selectedPodcast.comment }}
                            </p>
                            <p v-else class="text-gray-500 text-sm italic">
                                {{ t('podcasts.info.noComment') }}
                            </p>
                        </div>

                        <!-- File info -->
                        <div class="bg-gray-800 rounded-lg p-3 space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">{{ t('podcasts.info.file') }}</span>
                                <span class="text-gray-300 truncate max-w-[60%]">
                                    {{ selectedPodcast.fileName }}
                                </span>
                            </div>
                            <div v-if="selectedPodcast.fileSize" class="flex justify-between">
                                <span class="text-gray-400">{{ t('podcasts.info.size') }}</span>
                                <span class="text-gray-300">
                                    {{
                                        isLocalPodcast
                                            ? formatLocalFileSize(selectedPodcast.fileSize)
                                            : formatCloudFileSize(selectedPodcast.fileSize)
                                    }}
                                </span>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex gap-3 pt-2">
                            <button
                                :class="[
                                    'flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 btn-press',
                                    selectedPodcast.isLiked
                                        ? `bg-${themeColor}-500/20 ${theme.textLight} ring-1 ring-${themeColor}-500/50`
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
                                ]"
                                @click="handleToggleLike(selectedPodcast, isLocalPodcast)"
                            >
                                <UIcon
                                    :name="
                                        selectedPodcast.isLiked
                                            ? 'i-heroicons-heart-solid'
                                            : 'i-heroicons-heart'
                                    "
                                    class="w-5 h-5"
                                />
                                {{
                                    selectedPodcast.isLiked
                                        ? t('podcasts.info.liked')
                                        : t('podcasts.info.like')
                                }}
                            </button>
                            <button
                                :class="[
                                    `flex-1 py-3 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 btn-press`,
                                    theme.bg,
                                ]"
                                @click="handlePlay(selectedPodcast, isLocalPodcast); closePodcastInfo()"
                            >
                                <UIcon name="i-heroicons-play-solid" class="w-5 h-5" />
                                {{ t('podcasts.info.play') }}
                            </button>
                        </div>

                        <!-- Delete button -->
                        <button
                            class="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                            @click="confirmDelete(selectedPodcast, isLocalPodcast)"
                        >
                            <UIcon name="i-heroicons-trash" class="w-5 h-5" />
                            {{ t('podcasts.info.delete') }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Edit Notes Modal -->
        <Transition name="modal">
            <div
                v-if="showEditNotes"
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                @click.self="showEditNotes = false"
            >
                <div
                    class="bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-modal-in border border-gray-700/30"
                >
                    <div class="p-6">
                        <h2 class="text-xl font-bold text-white mb-4">
                            {{ t('podcasts.editNotes.title') }}
                        </h2>

                        <div class="space-y-4">
                            <div>
                                <label class="block text-gray-400 text-sm mb-2">
                                    {{ t('podcasts.editNotes.notes') }}
                                </label>
                                <textarea
                                    v-model="editNotesText"
                                    :placeholder="t('podcasts.editNotes.notesPlaceholder')"
                                    rows="3"
                                    :class="[
                                        `w-full bg-gray-800 text-white rounded-lg px-4 py-3 border-none focus:ring-2 focus:ring-${themeColor}-500 resize-none`,
                                    ]"
                                />
                            </div>

                            <div>
                                <label class="block text-gray-400 text-sm mb-2">
                                    {{ t('podcasts.editNotes.comment') }}
                                </label>
                                <textarea
                                    v-model="editCommentText"
                                    :placeholder="t('podcasts.editNotes.commentPlaceholder')"
                                    rows="4"
                                    :class="[
                                        `w-full bg-gray-800 text-white rounded-lg px-4 py-3 border-none focus:ring-2 focus:ring-${themeColor}-500 resize-none`,
                                    ]"
                                />
                            </div>
                        </div>

                        <div class="flex gap-3 mt-6">
                            <button
                                class="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors btn-press"
                                @click="showEditNotes = false"
                            >
                                {{ t('common.cancel') }}
                            </button>
                            <button
                                :class="[
                                    `flex-1 py-3 text-white rounded-lg font-medium transition-colors btn-press`,
                                    theme.bg,
                                ]"
                                @click="saveNotes"
                            >
                                {{ t('common.save') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Delete Confirmation Modal -->
        <Transition name="modal">
            <div
                v-if="showDeleteConfirm"
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
                @click.self="cancelDelete"
            >
                <div
                    class="bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-modal-in"
                >
                    <div class="p-6 text-center">
                        <div
                            class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <UIcon name="i-heroicons-trash" class="w-8 h-8 text-red-400" />
                        </div>
                        <h2 class="text-xl font-bold text-white mb-2">
                            {{ t('podcasts.deleteConfirm.title') }}
                        </h2>
                        <p class="text-gray-400 mb-6">{{ t('podcasts.deleteConfirm.message') }}</p>

                        <div class="flex gap-3">
                            <button
                                class="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                                @click="cancelDelete"
                            >
                                {{ t('common.cancel') }}
                            </button>
                            <button
                                class="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                                @click="handleDelete"
                            >
                                {{ t('common.delete') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <Footer mode="app" />
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-modal-in {
    animation: modalIn 0.3s ease-out;
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(20px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.list-enter-active,
.list-leave-active {
    transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(-30px);
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
}

/* Range input styling */
input[type='range'] {
    -webkit-appearance: none;
    background: transparent;
}

input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 12px;
    width: 12px;
    border-radius: 50%;
    background: #f97316;
    cursor: pointer;
    margin-top: -4px;
}

input[type='range']::-webkit-slider-runnable-track {
    height: 4px;
    background: #374151;
    border-radius: 2px;
}
</style>
