<script setup lang="ts">
import { useI18n } from '#imports'
import type { LocalTrack, LocalPlaylist } from '~/composables/useLocalMusic'
import type { CloudTrack, CloudPlaylist } from '~/composables/useCloudMusic'
import type { ThemeColor } from '~/composables/useTheme'

const { t } = useI18n()
const { colors, colorClasses } = useTheme()

// Get theme classes for music
const themeColor = computed(() => colors.value.music as ThemeColor)
const theme = computed(() => colorClasses[themeColor.value] || colorClasses.green)

definePageMeta({
    title: 'Music',
    ssr: false,
})

// Spotify
const {
    getAuthUrl,
    isAuthenticated: spotifyAuthenticated,
    getUserPlaylists,
    getFeaturedPlaylists,
    play: spotifyPlay,
} = useSpotify()

// Local Music
const {
    tracks,
    playlists,
    loading: localLoading,
    hasPermission,
    usesFallback,
    needsReauthorization,
    savedFolderName,
    playbackState,
    getLikedTracks,
    selectFolder,
    restoreFolderAccess,
    reauthorizeAccess,
    scanForTracks,
    loadPlaylists,
    createPlaylist,
    deletePlaylist,
    getPlaylistTracks,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    toggleLike,
    isLiked,
    playTrack,
    playQueue,
    togglePlay,
    pause,
    resume,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    toggleShuffle,
    toggleRepeat,
    formatDuration,
    formatFileSize,
    loadLikedTracksFromDb,
    removeLikedTrack,
} = useLocalMusic()

// Cloud Music
const {
    tracks: cloudTracks,
    sortedTracks: sortedCloudTracks,
    playlists: cloudPlaylists,
    likedTracks: cloudLikedTracks,
    loading: cloudLoading,
    uploading: cloudUploading,
    uploadProgress: cloudUploadProgress,
    error: cloudError,
    playbackState: cloudPlaybackState,
    fetchTracks: fetchCloudTracks,
    uploadTracks: uploadCloudTracks,
    deleteTrack: deleteCloudTrack,
    toggleLike: toggleCloudLike,
    fetchLikedTracks: fetchCloudLikedTracks,
    fetchPlaylists: fetchCloudPlaylists,
    createPlaylist: createCloudPlaylist,
    deletePlaylist: deleteCloudPlaylist,
    addTrackToPlaylist: addCloudTrackToPlaylist,
    removeTrackFromPlaylist: removeCloudTrackFromPlaylist,
    getPlaylistTracks: getCloudPlaylistTracks,
    playTrack: playCloudTrack,
    playQueue: playCloudQueue,
    togglePlay: toggleCloudPlay,
    seek: seekCloud,
    setVolume: setCloudVolume,
    toggleMute: toggleCloudMute,
    nextTrack: nextCloudTrack,
    previousTrack: previousCloudTrack,
    toggleShuffle: toggleCloudShuffle,
    toggleRepeat: toggleCloudRepeat,
    stopPlayback: stopCloudPlayback,
    getTrackColor: getCloudTrackColor,
    formatFileSize: formatCloudFileSize,
    formatDuration: formatCloudDuration,
} = useCloudMusic()

// Client-only flag for hydration
const isClient = ref(false)

// Active tab: 'local' | 'spotify' | 'upload'
const activeTab = ref<'local' | 'spotify' | 'upload'>('local')

// Spotify state
const spotifyUserPlaylists = ref<any[]>([])
const spotifyFeaturedPlaylists = ref<any[]>([])
const spotifyLoading = ref(false)
const spotifySearchQuery = ref('')

// Local music state
const localSearchQuery = ref('')
const showCreatePlaylist = ref(false)
const newPlaylistName = ref('')
const selectedPlaylist = ref<LocalPlaylist | null>(null)
const playlistTracks = ref<LocalTrack[]>([])
const viewMode = ref<'all' | 'liked' | 'playlist'>('all')

// Cloud music state
const cloudSearchQuery = ref('')
const showCloudCreatePlaylist = ref(false)
const newCloudPlaylistName = ref('')
const selectedCloudPlaylist = ref<CloudPlaylist | null>(null)
const cloudPlaylistTracks = ref<CloudTrack[]>([])
const cloudViewMode = ref<'all' | 'liked' | 'playlist'>('all')
const showCloudTrackInfo = ref(false)
const selectedCloudTrack = ref<CloudTrack | null>(null)
const showCloudAddToPlaylist = ref(false)
const cloudTrackToAdd = ref<CloudTrack | null>(null)
const showCloudDeleteConfirm = ref(false)
const cloudTrackToDelete = ref<string | null>(null)
const cloudFileInputRef = ref<HTMLInputElement | null>(null)
const showTrackInfo = ref(false)
const selectedTrack = ref<LocalTrack | null>(null)
const showAddToPlaylist = ref(false)
const trackToAdd = ref<LocalTrack | null>(null)

// Filter local tracks by search
const filteredTracks = computed(() => {
    const trackList =
        viewMode.value === 'liked'
            ? getLikedTracks.value
            : viewMode.value === 'playlist'
              ? playlistTracks.value
              : tracks.value

    if (!localSearchQuery.value) return trackList
    const query = localSearchQuery.value.toLowerCase()
    return trackList.filter(
        (t) =>
            t.title?.toLowerCase().includes(query) ||
            t.artist?.toLowerCase().includes(query) ||
            t.album?.toLowerCase().includes(query) ||
            t.fileName.toLowerCase().includes(query)
    )
})

// Spotify functions
const loadSpotifyPlaylists = async () => {
    if (!spotifyAuthenticated.value) return

    spotifyLoading.value = true
    try {
        const [user, featured] = await Promise.all([getUserPlaylists(20), getFeaturedPlaylists()])

        spotifyUserPlaylists.value = user.items || []
        spotifyFeaturedPlaylists.value = featured.playlists?.items || []
    } catch (error) {
        console.error('Error loading Spotify playlists:', error)
    } finally {
        spotifyLoading.value = false
    }
}

const handlePlaySpotifyPlaylist = async (playlistId: string) => {
    try {
        await spotifyPlay(`spotify:playlist:${playlistId}`)
    } catch (error) {
        console.error('Error playing Spotify playlist:', error)
    }
}

const connectSpotify = () => {
    window.location.href = getAuthUrl()
}

// Local music functions
const handleSelectFolder = async () => {
    await selectFolder()
    await loadPlaylists()
}

const handleReauthorize = async () => {
    await reauthorizeAccess()
    await loadPlaylists()
}

const handleCreatePlaylist = async () => {
    if (!newPlaylistName.value.trim()) return
    await createPlaylist(newPlaylistName.value.trim())
    newPlaylistName.value = ''
    showCreatePlaylist.value = false
}

const handleDeletePlaylist = async (playlistId: string) => {
    await deletePlaylist(playlistId)
    if (selectedPlaylist.value?.id === playlistId) {
        selectedPlaylist.value = null
        viewMode.value = 'all'
    }
}

const handleSelectPlaylist = async (playlist: LocalPlaylist) => {
    selectedPlaylist.value = playlist
    viewMode.value = 'playlist'
    playlistTracks.value = await getPlaylistTracks(playlist.id)
}

const handleViewLiked = () => {
    selectedPlaylist.value = null
    viewMode.value = 'liked'
}

const handleViewAll = () => {
    selectedPlaylist.value = null
    viewMode.value = 'all'
}

const handlePlayTrack = (track: LocalTrack, index: number) => {
    // Only play if track is available
    if (!track.isAvailable) return
    // Filter to only available tracks for the queue
    const availableTracks = filteredTracks.value.filter((t) => t.isAvailable !== false)
    const newIndex = availableTracks.findIndex((t) => t.filePath === track.filePath)
    if (newIndex >= 0) {
        playQueue(availableTracks, newIndex)
    }
}

const handleToggleLike = async (track: LocalTrack) => {
    // Only available tracks can be liked/unliked via toggle
    if (track.isAvailable !== false) {
        await toggleLike(track.filePath)
    }
}

const handleRemoveLikedTrack = async (track: LocalTrack) => {
    await removeLikedTrack(track.id)
    // Refresh liked tracks view
    if (viewMode.value === 'liked') {
        await loadLikedTracksFromDb()
    }
}

const openTrackInfo = (track: LocalTrack) => {
    selectedTrack.value = track
    showTrackInfo.value = true
}

const closeTrackInfo = () => {
    showTrackInfo.value = false
    selectedTrack.value = null
}

const openAddToPlaylist = (track: LocalTrack) => {
    // Only available tracks can be added to playlists
    if (track.isAvailable === false) return
    trackToAdd.value = track
    showAddToPlaylist.value = true
}

const handleAddToPlaylist = async (playlistId: string) => {
    if (!trackToAdd.value) return
    await addTrackToPlaylist(playlistId, trackToAdd.value.filePath)
    showAddToPlaylist.value = false
    trackToAdd.value = null
}

const handleRemoveFromPlaylist = async (track: LocalTrack) => {
    if (!selectedPlaylist.value) return
    await removeTrackFromPlaylist(selectedPlaylist.value.id, track.id)
    playlistTracks.value = playlistTracks.value.filter((t) => t.id !== track.id)
}

// Progress bar for player
const progressPercent = computed(() => {
    if (!playbackState.value.duration) return 0
    return (playbackState.value.currentTime / playbackState.value.duration) * 100
})

const handleSeek = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const time = percent * playbackState.value.duration
    seek(time)
}

// Get thumbnail color based on track - use theme colors
const getTrackColor = (track: LocalTrack) => {
    const themeColorValue = theme.value.bg.replace('bg-', '')
    const colors = [
        `var(--color-${themeColorValue.replace('-500', '-600')})`,
        `var(--color-${themeColorValue.replace('-500', '-700')})`,
        '#dc2626',
        '#ea580c',
        '#d97706',
        '#16a34a',
        '#0891b2',
        '#2563eb',
        '#7c3aed',
        '#c026d3',
    ]
    const index = (track.title?.length || track.fileName.length) % colors.length
    return colors[index]
}

// =========== CLOUD MUSIC FUNCTIONS ===========

// Filter cloud tracks by search
const filteredCloudTracks = computed(() => {
    const trackList =
        cloudViewMode.value === 'liked'
            ? cloudLikedTracks.value
            : cloudViewMode.value === 'playlist'
              ? cloudPlaylistTracks.value
              : cloudTracks.value

    if (!cloudSearchQuery.value) return trackList
    const query = cloudSearchQuery.value.toLowerCase()
    return trackList.filter(
        (t) =>
            t.title?.toLowerCase().includes(query) ||
            t.artist?.toLowerCase().includes(query) ||
            t.album?.toLowerCase().includes(query) ||
            t.fileName.toLowerCase().includes(query)
    )
})

// Cloud progress bar
const cloudProgressPercent = computed(() => {
    if (!cloudPlaybackState.value.duration) return 0
    return (cloudPlaybackState.value.currentTime / cloudPlaybackState.value.duration) * 100
})

const handleCloudSeek = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const time = percent * cloudPlaybackState.value.duration
    seekCloud(time)
}

// Cloud file upload
const handleCloudFileSelect = () => {
    cloudFileInputRef.value?.click()
}

const handleCloudFilesSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return

    await uploadCloudTracks(input.files)
    input.value = '' // Reset input
}

// Cloud playlist functions
const handleCloudCreatePlaylist = async () => {
    if (!newCloudPlaylistName.value.trim()) return
    await createCloudPlaylist(newCloudPlaylistName.value.trim())
    newCloudPlaylistName.value = ''
    showCloudCreatePlaylist.value = false
}

const handleCloudDeletePlaylist = async (playlistId: string) => {
    await deleteCloudPlaylist(playlistId)
    if (selectedCloudPlaylist.value?.id === playlistId) {
        selectedCloudPlaylist.value = null
        cloudViewMode.value = 'all'
    }
}

const handleCloudSelectPlaylist = async (playlist: CloudPlaylist) => {
    selectedCloudPlaylist.value = playlist
    cloudViewMode.value = 'playlist'
    cloudPlaylistTracks.value = await getCloudPlaylistTracks(playlist.id)
}

const handleCloudViewLiked = () => {
    selectedCloudPlaylist.value = null
    cloudViewMode.value = 'liked'
}

const handleCloudViewAll = () => {
    selectedCloudPlaylist.value = null
    cloudViewMode.value = 'all'
}

// Cloud track actions
const handleCloudPlayTrack = (track: CloudTrack, index: number) => {
    const trackList = filteredCloudTracks.value
    playCloudQueue(trackList, index)
}

const handleCloudToggleLike = async (track: CloudTrack) => {
    await toggleCloudLike(track.id)
}

const openCloudTrackInfo = (track: CloudTrack) => {
    selectedCloudTrack.value = track
    showCloudTrackInfo.value = true
}

const closeCloudTrackInfo = () => {
    showCloudTrackInfo.value = false
    selectedCloudTrack.value = null
}

const openCloudAddToPlaylist = (track: CloudTrack) => {
    cloudTrackToAdd.value = track
    showCloudAddToPlaylist.value = true
}

const handleCloudAddToPlaylist = async (playlistId: string) => {
    if (!cloudTrackToAdd.value) return
    await addCloudTrackToPlaylist(playlistId, cloudTrackToAdd.value.id)
    showCloudAddToPlaylist.value = false
    cloudTrackToAdd.value = null
}

const handleCloudRemoveFromPlaylist = async (track: CloudTrack) => {
    if (!selectedCloudPlaylist.value) return
    await removeCloudTrackFromPlaylist(selectedCloudPlaylist.value.id, track.id)
    cloudPlaylistTracks.value = cloudPlaylistTracks.value.filter((t) => t.id !== track.id)
}

const confirmCloudDeleteTrack = (trackId: string) => {
    cloudTrackToDelete.value = trackId
    showCloudDeleteConfirm.value = true
}

const handleCloudDeleteTrack = async () => {
    if (!cloudTrackToDelete.value) return
    await deleteCloudTrack(cloudTrackToDelete.value)
    showCloudDeleteConfirm.value = false
    cloudTrackToDelete.value = null
}

const cancelCloudDelete = () => {
    showCloudDeleteConfirm.value = false
    cloudTrackToDelete.value = null
}

// Lifecycle
onMounted(async () => {
    isClient.value = true

    // Always load playlists and liked tracks from DB first
    await loadPlaylists()
    await loadLikedTracksFromDb()

    // Try to restore local folder access
    await restoreFolderAccess()

    // Load Spotify if authenticated
    if (spotifyAuthenticated.value) {
        await loadSpotifyPlaylists()
    }

    // Load cloud music
    await fetchCloudTracks()
    await fetchCloudPlaylists()
    await fetchCloudLikedTracks()
})

watch(spotifyAuthenticated, (isAuth) => {
    if (isAuth) {
        loadSpotifyPlaylists()
    }
})

// Load cloud data when tab changes
watch(activeTab, async (tab) => {
    if (tab === 'upload') {
        await fetchCloudTracks()
        await fetchCloudPlaylists()
        await fetchCloudLikedTracks()
    }
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col theme-transition">
        <Navbar mode="app" />

        <div class="pt-24 pb-32">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Tab Navigation -->
                <div class="flex items-center gap-4 mb-8">
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 btn-press',
                            activeTab === 'local'
                                ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60',
                        ]"
                        @click="activeTab = 'local'"
                    >
                        <UIcon name="i-heroicons-folder" class="w-5 h-5 icon-bounce" />
                        {{ t('music.tabs.local') }}
                    </button>
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 btn-press',
                            activeTab === 'upload'
                                ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60',
                        ]"
                        @click="activeTab = 'upload'"
                    >
                        <UIcon name="i-heroicons-cloud-arrow-up" class="w-5 h-5 icon-bounce" />
                        {{ t('music.tabs.upload') || 'Cloud' }}
                    </button>
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 btn-press',
                            activeTab === 'spotify'
                                ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60',
                        ]"
                        @click="activeTab = 'spotify'"
                    >
                        <UIcon name="i-heroicons-musical-note" class="w-5 h-5 icon-bounce" />
                        Spotify
                    </button>
                </div>

                <!-- LOCAL MUSIC TAB -->
                <div v-if="activeTab === 'local'">
                    <!-- No folder selected state -->
                    <div
                        v-if="!hasPermission"
                        class="flex flex-col items-center justify-center min-h-[60vh]"
                    >
                        <div class="text-center max-w-2xl">
                            <div class="mb-8">
                                <UIcon
                                    name="i-heroicons-musical-note"
                                    :class="['w-24 h-24 mx-auto mb-6 icon-bounce', theme.text]"
                                />
                                <h1 class="text-4xl font-bold text-white mb-4">
                                    {{ t('music.local.title') }}
                                </h1>
                                <p class="text-gray-400 text-lg mb-8">
                                    {{ t('music.local.description') }}
                                </p>
                            </div>

                            <!-- Reauthorization button -->
                            <div v-if="needsReauthorization && savedFolderName" class="mb-6">
                                <p class="text-gray-300 mb-4">
                                    {{ t('music.local.previousFolder') }}:
                                    <span :class="['font-medium', theme.textLight]">
                                        {{ savedFolderName }}
                                    </span>
                                </p>
                                <UButton
                                    icon="i-heroicons-arrow-path"
                                    size="xl"
                                    :label="t('music.local.reauthorize')"
                                    :loading="localLoading"
                                    :class="[
                                        theme.bg,
                                        `hover:${theme.bgLight}`,
                                        'text-white font-semibold btn-press',
                                    ]"
                                    @click="handleReauthorize"
                                />
                                <p class="text-gray-500 text-sm mt-4">
                                    {{ t('music.local.orSelectNew') }}
                                </p>
                            </div>

                            <UButton
                                icon="i-heroicons-folder-plus"
                                size="xl"
                                :label="t('music.local.selectFolder')"
                                :loading="localLoading"
                                :variant="needsReauthorization ? 'outline' : 'solid'"
                                :class="
                                    needsReauthorization
                                        ? `${theme.border} ${theme.textLight} hover:bg-${themeColor}-600/20`
                                        : `${theme.bg} hover:${theme.bgLight} text-white font-semibold btn-press`
                                "
                                @click="handleSelectFolder"
                            />

                            <p class="text-gray-500 text-sm mt-6">
                                {{ t('music.local.permissionNotice') }}
                            </p>
                        </div>
                    </div>

                    <!-- Music library -->
                    <div v-else class="flex gap-6">
                        <!-- Sidebar: Playlists -->
                        <aside class="w-64 flex-shrink-0">
                            <div
                                class="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 sticky top-24 border border-gray-700/30"
                            >
                                <!-- Navigation -->
                                <nav class="space-y-1 mb-6">
                                    <button
                                        :class="[
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left btn-press',
                                            viewMode === 'all'
                                                ? `bg-${themeColor}-600/20 ${theme.textLight} ring-1 ring-${themeColor}-500/30`
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                        @click="handleViewAll"
                                    >
                                        <UIcon
                                            name="i-heroicons-musical-note"
                                            :class="[
                                                'w-5 h-5',
                                                viewMode === 'all' ? theme.text : '',
                                            ]"
                                        />
                                        <span>{{ t('music.local.allTracks') }}</span>
                                        <span class="ml-auto text-sm text-gray-500">
                                            {{ tracks.length }}
                                        </span>
                                    </button>
                                    <button
                                        :class="[
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left btn-press',
                                            viewMode === 'liked'
                                                ? `bg-${themeColor}-600/20 ${theme.textLight} ring-1 ring-${themeColor}-500/30`
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                        @click="handleViewLiked"
                                    >
                                        <UIcon
                                            name="i-heroicons-heart-solid"
                                            class="w-5 h-5 text-red-500"
                                        />
                                        <span>{{ t('music.local.likedTracks') }}</span>
                                        <span class="ml-auto text-sm text-gray-500">
                                            {{ getLikedTracks.length }}
                                        </span>
                                    </button>
                                </nav>

                                <!-- Playlists header -->
                                <div class="flex items-center justify-between mb-3">
                                    <h3
                                        class="text-sm font-semibold text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('music.local.playlists') }}
                                    </h3>
                                    <button
                                        class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                        @click="showCreatePlaylist = true"
                                    >
                                        <UIcon name="i-heroicons-plus" class="w-5 h-5" />
                                    </button>
                                </div>

                                <!-- Playlists list -->
                                <div class="space-y-1 max-h-64 overflow-y-auto">
                                    <div
                                        v-for="playlist in playlists"
                                        :key="playlist.id"
                                        :class="[
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left group btn-press',
                                            selectedPlaylist?.id === playlist.id
                                                ? `bg-${themeColor}-600/20 ${theme.textLight} ring-1 ring-${themeColor}-500/30`
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                    >
                                        <button
                                            class="flex items-center gap-3 flex-1 min-w-0"
                                            @click="handleSelectPlaylist(playlist)"
                                        >
                                            <div
                                                :class="[
                                                    'w-8 h-8 rounded flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                                                    theme.bg,
                                                ]"
                                            >
                                                <UIcon
                                                    name="i-heroicons-musical-note"
                                                    class="w-4 h-4 text-white"
                                                />
                                            </div>
                                            <span class="truncate flex-1">{{ playlist.name }}</span>
                                            <span class="text-sm text-gray-500">
                                                {{ playlist.trackCount }}
                                            </span>
                                        </button>
                                        <button
                                            class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            @click.stop="handleDeletePlaylist(playlist.id)"
                                        >
                                            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <!-- Create playlist modal -->
                                <div
                                    v-if="showCreatePlaylist"
                                    class="mt-4 p-3 bg-gray-700/40 backdrop-blur-sm rounded-lg border border-gray-600/30"
                                >
                                    <input
                                        v-model="newPlaylistName"
                                        type="text"
                                        :placeholder="t('music.local.playlistName')"
                                        :class="[
                                            'w-full bg-gray-800/80 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2',
                                            `focus:${theme.ring}`,
                                        ]"
                                        @keyup.enter="handleCreatePlaylist"
                                    />
                                    <div class="flex gap-2 mt-2">
                                        <UButton
                                            size="xs"
                                            variant="ghost"
                                            @click="showCreatePlaylist = false"
                                        >
                                            {{ t('common.cancel') }}
                                        </UButton>
                                        <UButton
                                            size="xs"
                                            :class="[
                                                theme.bg,
                                                `hover:${theme.bgLight}`,
                                                'btn-press',
                                            ]"
                                            :disabled="!newPlaylistName.trim()"
                                            @click="handleCreatePlaylist"
                                        >
                                            {{ t('common.create') }}
                                        </UButton>
                                    </div>
                                </div>

                                <!-- Folder actions -->
                                <div class="mt-6 pt-4 border-t border-gray-700 space-y-2">
                                    <button
                                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                                        @click="scanForTracks"
                                    >
                                        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                                        {{ t('music.local.rescan') }}
                                    </button>
                                    <button
                                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                                        @click="handleSelectFolder"
                                    >
                                        <UIcon name="i-heroicons-folder-open" class="w-4 h-4" />
                                        {{ t('music.local.changeFolder') }}
                                    </button>
                                </div>
                            </div>
                        </aside>

                        <!-- Main content: Track list -->
                        <main class="flex-1 min-w-0">
                            <!-- Fallback notice -->
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
                                            {{ t('music.local.fallbackTitle') }}
                                        </p>
                                        <p class="text-amber-300/70 text-sm mt-1">
                                            {{ t('music.local.fallbackDescription') }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Header -->
                            <div
                                class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
                            >
                                <div>
                                    <h1 class="text-3xl font-bold text-white">
                                        {{
                                            viewMode === 'liked'
                                                ? t('music.local.likedTracks')
                                                : viewMode === 'playlist' && selectedPlaylist
                                                  ? selectedPlaylist.name
                                                  : t('music.local.allTracks')
                                        }}
                                    </h1>
                                    <p class="text-gray-400 text-sm mt-1">
                                        {{ filteredTracks.length }} {{ t('music.local.tracks') }}
                                    </p>
                                </div>
                                <UInput
                                    v-model="localSearchQuery"
                                    icon="i-heroicons-magnifying-glass"
                                    size="md"
                                    :placeholder="t('music.local.searchPlaceholder')"
                                    class="w-full md:w-80"
                                />
                            </div>

                            <!-- Loading -->
                            <div v-if="localLoading" class="flex items-center justify-center py-20">
                                <UIcon
                                    name="i-heroicons-arrow-path"
                                    :class="['w-12 h-12 animate-spin', theme.text]"
                                />
                            </div>

                            <!-- Track list -->
                            <div
                                v-else-if="filteredTracks.length > 0"
                                class="bg-gray-800/20 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/30"
                            >
                                <!-- Header row -->
                                <div
                                    class="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-700/50"
                                >
                                    <span class="w-10 text-center">#</span>
                                    <span>{{ t('music.local.columnTitle') }}</span>
                                    <span class="hidden md:block">
                                        {{ t('music.local.columnAlbum') }}
                                    </span>
                                    <span class="w-16 text-center">
                                        <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                                    </span>
                                    <span class="w-24"></span>
                                </div>

                                <!-- Track rows -->
                                <div
                                    v-for="(track, index) in filteredTracks"
                                    :key="track.filePath"
                                    :class="[
                                        'group grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-2 transition-all',
                                        track.isAvailable === false
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'cursor-pointer',
                                        playbackState.currentTrack?.filePath === track.filePath
                                            ? `bg-${themeColor}-600/20`
                                            : track.isAvailable !== false
                                              ? 'hover:bg-gray-700/30'
                                              : '',
                                    ]"
                                    @dblclick="handlePlayTrack(track, index)"
                                >
                                    <!-- Index / Play icon -->
                                    <div class="w-10 flex items-center justify-center">
                                        <template v-if="track.isAvailable === false">
                                            <UIcon
                                                name="i-heroicons-exclamation-circle"
                                                class="w-4 h-4 text-amber-500"
                                            />
                                        </template>
                                        <template v-else>
                                            <span
                                                v-if="
                                                    playbackState.currentTrack?.filePath ===
                                                        track.filePath && playbackState.isPlaying
                                                "
                                                :class="theme.textLight"
                                            >
                                                <UIcon
                                                    name="i-heroicons-speaker-wave"
                                                    class="w-4 h-4 animate-pulse"
                                                />
                                            </span>
                                            <span v-else class="text-gray-400 group-hover:hidden">
                                                {{ index + 1 }}
                                            </span>
                                            <button
                                                class="hidden group-hover:block text-white"
                                                @click.stop="handlePlayTrack(track, index)"
                                            >
                                                <UIcon
                                                    name="i-heroicons-play-solid"
                                                    class="w-4 h-4"
                                                />
                                            </button>
                                        </template>
                                    </div>

                                    <!-- Title & Artist -->
                                    <div class="flex items-center gap-3 min-w-0">
                                        <div
                                            :class="[
                                                'w-10 h-10 rounded flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                                                track.isAvailable === false ? 'grayscale' : '',
                                                theme.bg,
                                            ]"
                                        >
                                            <UIcon
                                                name="i-heroicons-musical-note"
                                                class="w-5 h-5 text-white"
                                            />
                                        </div>
                                        <div class="min-w-0">
                                            <p
                                                :class="[
                                                    'font-medium truncate',
                                                    track.isAvailable === false
                                                        ? 'text-gray-500'
                                                        : playbackState.currentTrack?.filePath ===
                                                            track.filePath
                                                          ? theme.textLight
                                                          : 'text-white',
                                                ]"
                                            >
                                                {{ track.title || track.fileName }}
                                            </p>
                                            <p
                                                :class="[
                                                    'text-sm truncate',
                                                    track.isAvailable === false
                                                        ? 'text-gray-600'
                                                        : 'text-gray-400',
                                                ]"
                                            >
                                                {{ track.artist || t('music.local.unknownArtist') }}
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Album -->
                                    <div
                                        :class="[
                                            'text-sm truncate hidden md:block',
                                            track.isAvailable === false
                                                ? 'text-gray-600'
                                                : 'text-gray-400',
                                        ]"
                                    >
                                        {{ track.album || t('music.local.unknownAlbum') }}
                                    </div>

                                    <!-- Duration -->
                                    <div
                                        :class="[
                                            'w-16 text-sm text-center',
                                            track.isAvailable === false
                                                ? 'text-gray-600'
                                                : 'text-gray-400',
                                        ]"
                                    >
                                        {{ formatDuration(track.duration) }}
                                    </div>

                                    <!-- Actions -->
                                    <div
                                        class="w-24 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <!-- Available track actions -->
                                        <template v-if="track.isAvailable !== false">
                                            <button
                                                class="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
                                                @click.stop="handleToggleLike(track)"
                                            >
                                                <UIcon
                                                    :name="
                                                        track.isLiked
                                                            ? 'i-heroicons-heart-solid'
                                                            : 'i-heroicons-heart'
                                                    "
                                                    :class="[
                                                        'w-4 h-4',
                                                        track.isLiked
                                                            ? 'text-red-500'
                                                            : 'text-gray-400 hover:text-white',
                                                    ]"
                                                />
                                            </button>
                                            <button
                                                class="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                                                @click.stop="openAddToPlaylist(track)"
                                            >
                                                <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                                            </button>
                                            <button
                                                class="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                                                @click.stop="openTrackInfo(track)"
                                            >
                                                <UIcon
                                                    name="i-heroicons-information-circle"
                                                    class="w-4 h-4"
                                                />
                                            </button>
                                        </template>
                                        <!-- Unavailable track: only delete allowed -->
                                        <template v-else>
                                            <span class="text-xs text-amber-500 mr-2">
                                                {{ t('music.local.unavailable') }}
                                            </span>
                                        </template>
                                        <!-- Remove from playlist/liked -->
                                        <button
                                            v-if="viewMode === 'playlist'"
                                            class="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-400"
                                            @click.stop="handleRemoveFromPlaylist(track)"
                                        >
                                            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                                        </button>
                                        <button
                                            v-if="viewMode === 'liked'"
                                            class="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-400"
                                            @click.stop="handleRemoveLikedTrack(track)"
                                        >
                                            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Empty state -->
                            <div
                                v-else
                                class="flex flex-col items-center justify-center py-20 text-center"
                            >
                                <UIcon
                                    name="i-heroicons-musical-note"
                                    class="w-16 h-16 text-gray-600 mb-4"
                                />
                                <p class="text-gray-400 text-lg">
                                    {{
                                        viewMode === 'liked'
                                            ? t('music.local.noLikedTracks')
                                            : viewMode === 'playlist'
                                              ? t('music.local.noPlaylistTracks')
                                              : t('music.local.noTracks')
                                    }}
                                </p>
                            </div>
                        </main>
                    </div>
                </div>

                <!-- SPOTIFY TAB -->
                <div v-else-if="activeTab === 'spotify'">
                    <div
                        v-if="!spotifyAuthenticated"
                        class="flex flex-col items-center justify-center min-h-[60vh]"
                    >
                        <div class="text-center max-w-2xl">
                            <div class="mb-8">
                                <UIcon
                                    name="i-heroicons-musical-note"
                                    class="w-24 h-24 text-green-600 mx-auto mb-6"
                                />
                                <h1 class="text-4xl font-bold text-white mb-4">
                                    {{ t('music.hero.connectToSpotify') }}
                                </h1>
                                <p class="text-gray-400 text-lg mb-8">
                                    {{ t('music.hero.description') }}
                                </p>
                            </div>

                            <UButton
                                icon="i-simple-icons-spotify"
                                size="xl"
                                :label="t('music.hero.connectButton')"
                                class="bg-castium-green hover:bg-green-600 text-white font-semibold"
                                @click="connectSpotify"
                            />

                            <p class="text-gray-500 text-sm mt-6">
                                {{ t('music.hero.redirectNotice') }}
                            </p>
                        </div>
                    </div>

                    <div v-else>
                        <div class="mb-8">
                            <h1 class="text-4xl font-bold text-white mb-6">
                                {{ t('music.hero.yourMusic') }}
                            </h1>
                            <UInput
                                v-model="spotifySearchQuery"
                                icon="i-heroicons-magnifying-glass"
                                size="lg"
                                :placeholder="t('music.local.searchPlaceholder')"
                                class="max-w-2xl"
                            />
                        </div>

                        <div v-if="spotifyLoading" class="flex items-center justify-center py-20">
                            <UIcon
                                name="i-heroicons-arrow-path"
                                class="w-12 h-12 text-castium-green animate-spin"
                            />
                        </div>

                        <div v-else class="space-y-12">
                            <section v-if="spotifyUserPlaylists.length > 0">
                                <h2 class="text-2xl font-bold text-white mb-6">
                                    {{ t('music.hero.playlists') }}
                                </h2>
                                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    <MusicPlaylistCard
                                        v-for="playlist in spotifyUserPlaylists"
                                        :key="playlist.id"
                                        :playlist="playlist"
                                        @play="handlePlaySpotifyPlaylist"
                                    />
                                </div>
                            </section>

                            <section v-if="spotifyFeaturedPlaylists.length > 0">
                                <h2 class="text-2xl font-bold text-white mb-6">
                                    {{ t('music.hero.recommendedPlaylists') }}
                                </h2>
                                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    <MusicPlaylistCard
                                        v-for="playlist in spotifyFeaturedPlaylists"
                                        :key="playlist.id"
                                        :playlist="playlist"
                                        @play="handlePlaySpotifyPlaylist"
                                    />
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                <!-- CLOUD MUSIC TAB -->
                <div v-else-if="activeTab === 'upload'">
                    <!-- Hidden file input -->
                    <input
                        ref="cloudFileInputRef"
                        type="file"
                        accept="audio/*"
                        multiple
                        class="hidden"
                        @change="handleCloudFilesSelected"
                    />

                    <div class="flex gap-6">
                        <!-- Sidebar: Playlists -->
                        <aside class="w-64 flex-shrink-0">
                            <div
                                class="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 sticky top-24 border border-gray-700/30"
                            >
                                <!-- Navigation -->
                                <nav class="space-y-1 mb-6">
                                    <button
                                        :class="[
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left btn-press',
                                            cloudViewMode === 'all'
                                                ? `bg-${themeColor}-600/20 ${theme.textLight} ring-1 ring-${themeColor}-500/30`
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                        @click="handleCloudViewAll"
                                    >
                                        <UIcon
                                            name="i-heroicons-musical-note"
                                            :class="[
                                                'w-5 h-5',
                                                cloudViewMode === 'all' ? theme.text : '',
                                            ]"
                                        />
                                        <span>
                                            {{ t('music.cloud.allTracks') || 'All Tracks' }}
                                        </span>
                                        <span class="ml-auto text-sm text-gray-500">
                                            {{ cloudTracks.length }}
                                        </span>
                                    </button>
                                    <button
                                        :class="[
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left btn-press',
                                            cloudViewMode === 'liked'
                                                ? `bg-${themeColor}-600/20 ${theme.textLight} ring-1 ring-${themeColor}-500/30`
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                        @click="handleCloudViewLiked"
                                    >
                                        <UIcon
                                            name="i-heroicons-heart-solid"
                                            class="w-5 h-5 text-red-500"
                                        />
                                        <span>{{ t('music.cloud.likedTracks') || 'Liked' }}</span>
                                        <span class="ml-auto text-sm text-gray-500">
                                            {{ cloudLikedTracks.length }}
                                        </span>
                                    </button>
                                </nav>

                                <!-- Playlists header -->
                                <div class="flex items-center justify-between mb-3">
                                    <h3
                                        class="text-sm font-semibold text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('music.cloud.playlists') || 'Playlists' }}
                                    </h3>
                                    <button
                                        class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                        @click="showCloudCreatePlaylist = true"
                                    >
                                        <UIcon name="i-heroicons-plus" class="w-5 h-5" />
                                    </button>
                                </div>

                                <!-- Playlists list -->
                                <div class="space-y-1 max-h-64 overflow-y-auto">
                                    <div
                                        v-for="playlist in cloudPlaylists"
                                        :key="playlist.id"
                                        :class="[
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group',
                                            selectedCloudPlaylist?.id === playlist.id
                                                ? 'bg-blue-600/20 text-blue-400'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                    >
                                        <button
                                            class="flex items-center gap-3 flex-1 min-w-0"
                                            @click="handleCloudSelectPlaylist(playlist)"
                                        >
                                            <div
                                                class="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                                                :style="{ backgroundColor: playlist.coverColor }"
                                            >
                                                <UIcon
                                                    name="i-heroicons-musical-note"
                                                    class="w-4 h-4 text-white"
                                                />
                                            </div>
                                            <span class="truncate flex-1">{{ playlist.name }}</span>
                                            <span class="text-sm text-gray-500">
                                                {{ playlist.trackCount }}
                                            </span>
                                        </button>
                                        <button
                                            class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            @click.stop="handleCloudDeletePlaylist(playlist.id)"
                                        >
                                            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <!-- Create playlist modal -->
                                <div
                                    v-if="showCloudCreatePlaylist"
                                    class="mt-4 p-3 bg-gray-700/50 rounded-lg"
                                >
                                    <input
                                        v-model="newCloudPlaylistName"
                                        type="text"
                                        :placeholder="
                                            t('music.cloud.playlistName') || 'Playlist name'
                                        "
                                        class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        @keyup.enter="handleCloudCreatePlaylist"
                                    />
                                    <div class="flex gap-2 mt-2">
                                        <UButton
                                            size="xs"
                                            variant="ghost"
                                            @click="showCloudCreatePlaylist = false"
                                        >
                                            {{ t('common.cancel') }}
                                        </UButton>
                                        <UButton
                                            size="xs"
                                            class="bg-blue-600 hover:bg-blue-700"
                                            :disabled="!newCloudPlaylistName.trim()"
                                            @click="handleCloudCreatePlaylist"
                                        >
                                            {{ t('common.create') }}
                                        </UButton>
                                    </div>
                                </div>

                                <!-- Upload button -->
                                <div class="mt-6 pt-4 border-t border-gray-700">
                                    <button
                                        class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                        :disabled="cloudUploading"
                                        @click="handleCloudFileSelect"
                                    >
                                        <UIcon
                                            :name="
                                                cloudUploading
                                                    ? 'i-heroicons-arrow-path'
                                                    : 'i-heroicons-cloud-arrow-up'
                                            "
                                            :class="[
                                                'w-5 h-5',
                                                cloudUploading ? 'animate-spin' : '',
                                            ]"
                                        />
                                        {{
                                            cloudUploading
                                                ? t('music.cloud.uploading') || 'Uploading...'
                                                : t('music.cloud.uploadMusic') || 'Upload Music'
                                        }}
                                    </button>
                                </div>
                            </div>
                        </aside>

                        <!-- Main content: Track list -->
                        <main class="flex-1 min-w-0">
                            <!-- Upload progress -->
                            <div v-if="cloudUploadProgress.length > 0" class="mb-6 space-y-2">
                                <div
                                    v-for="progress in cloudUploadProgress"
                                    :key="progress.fileName"
                                    class="bg-gray-800/50 rounded-lg p-3"
                                >
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-white text-sm truncate">
                                            {{ progress.fileName }}
                                        </span>
                                        <span
                                            :class="[
                                                'text-xs px-2 py-0.5 rounded',
                                                progress.status === 'complete'
                                                    ? 'bg-green-600/20 text-green-400'
                                                    : progress.status === 'error'
                                                      ? 'bg-red-600/20 text-red-400'
                                                      : 'bg-blue-600/20 text-blue-400',
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
                                                'h-full transition-all duration-300',
                                                progress.status === 'complete'
                                                    ? 'bg-green-500'
                                                    : progress.status === 'error'
                                                      ? 'bg-red-500'
                                                      : 'bg-blue-500',
                                            ]"
                                            :style="{ width: `${progress.progress}%` }"
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- Header -->
                            <div
                                class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
                            >
                                <div>
                                    <h1 class="text-3xl font-bold text-white">
                                        {{
                                            cloudViewMode === 'liked'
                                                ? t('music.cloud.likedTracks') || 'Liked Tracks'
                                                : cloudViewMode === 'playlist' &&
                                                    selectedCloudPlaylist
                                                  ? selectedCloudPlaylist.name
                                                  : t('music.cloud.allTracks') || 'All Tracks'
                                        }}
                                    </h1>
                                    <p class="text-gray-400 text-sm mt-1">
                                        {{ filteredCloudTracks.length }}
                                        {{ t('music.local.tracks') || 'tracks' }}
                                    </p>
                                </div>
                                <UInput
                                    v-model="cloudSearchQuery"
                                    icon="i-heroicons-magnifying-glass"
                                    size="md"
                                    :placeholder="t('music.local.searchPlaceholder') || 'Search...'"
                                    class="w-full md:w-80"
                                />
                            </div>

                            <!-- Loading -->
                            <div v-if="cloudLoading" class="flex items-center justify-center py-20">
                                <UIcon
                                    name="i-heroicons-arrow-path"
                                    class="w-12 h-12 text-blue-500 animate-spin"
                                />
                            </div>

                            <!-- Track list -->
                            <div
                                v-else-if="filteredCloudTracks.length > 0"
                                class="bg-gray-800/30 rounded-xl overflow-hidden"
                            >
                                <!-- Header row -->
                                <div
                                    class="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-700/50"
                                >
                                    <span class="w-10 text-center">#</span>
                                    <span>{{ t('music.local.columnTitle') || 'Title' }}</span>
                                    <span class="hidden md:block">
                                        {{ t('music.local.columnAlbum') || 'Album' }}
                                    </span>
                                    <span class="w-16 text-center">
                                        <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                                    </span>
                                    <span class="w-32"></span>
                                </div>

                                <!-- Track rows -->
                                <div
                                    v-for="(track, index) in filteredCloudTracks"
                                    :key="track.id"
                                    :class="[
                                        'group grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-2 transition-colors cursor-pointer',
                                        cloudPlaybackState.currentTrack?.id === track.id
                                            ? 'bg-blue-600/20'
                                            : 'hover:bg-gray-700/30',
                                    ]"
                                    @dblclick="handleCloudPlayTrack(track, index)"
                                >
                                    <!-- Index / Play icon -->
                                    <div class="w-10 flex items-center justify-center">
                                        <span
                                            v-if="
                                                cloudPlaybackState.currentTrack?.id === track.id &&
                                                cloudPlaybackState.isPlaying
                                            "
                                            class="text-blue-400"
                                        >
                                            <UIcon
                                                name="i-heroicons-speaker-wave"
                                                class="w-4 h-4 animate-pulse"
                                            />
                                        </span>
                                        <span v-else class="text-gray-400 group-hover:hidden">
                                            {{ index + 1 }}
                                        </span>
                                        <button
                                            class="hidden group-hover:block text-white"
                                            @click.stop="handleCloudPlayTrack(track, index)"
                                        >
                                            <UIcon name="i-heroicons-play-solid" class="w-4 h-4" />
                                        </button>
                                    </div>

                                    <!-- Title & Artist -->
                                    <div class="flex items-center gap-3 min-w-0">
                                        <div
                                            class="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                                            :style="{ backgroundColor: getCloudTrackColor(track) }"
                                        >
                                            <UIcon
                                                name="i-heroicons-musical-note"
                                                class="w-5 h-5 text-white"
                                            />
                                        </div>
                                        <div class="min-w-0">
                                            <p
                                                :class="[
                                                    'font-medium truncate',
                                                    cloudPlaybackState.currentTrack?.id === track.id
                                                        ? 'text-blue-400'
                                                        : 'text-white',
                                                ]"
                                            >
                                                {{ track.title || track.fileName }}
                                            </p>
                                            <p class="text-sm truncate text-gray-400">
                                                {{
                                                    track.artist ||
                                                    t('music.local.unknownArtist') ||
                                                    'Unknown Artist'
                                                }}
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Album -->
                                    <div class="text-sm truncate hidden md:block text-gray-400">
                                        {{
                                            track.album ||
                                            t('music.local.unknownAlbum') ||
                                            'Unknown Album'
                                        }}
                                    </div>

                                    <!-- Duration -->
                                    <div class="w-16 text-sm text-center text-gray-400">
                                        {{ formatCloudDuration(track.duration) }}
                                    </div>

                                    <!-- Actions -->
                                    <div
                                        class="w-32 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <button
                                            class="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
                                            @click.stop="handleCloudToggleLike(track)"
                                        >
                                            <UIcon
                                                :name="
                                                    track.isLiked
                                                        ? 'i-heroicons-heart-solid'
                                                        : 'i-heroicons-heart'
                                                "
                                                :class="[
                                                    'w-4 h-4',
                                                    track.isLiked
                                                        ? 'text-red-500'
                                                        : 'text-gray-400 hover:text-white',
                                                ]"
                                            />
                                        </button>
                                        <button
                                            class="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                                            @click.stop="openCloudAddToPlaylist(track)"
                                        >
                                            <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                                        </button>
                                        <button
                                            class="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                                            @click.stop="openCloudTrackInfo(track)"
                                        >
                                            <UIcon
                                                name="i-heroicons-information-circle"
                                                class="w-4 h-4"
                                            />
                                        </button>
                                        <!-- Remove from playlist -->
                                        <button
                                            v-if="cloudViewMode === 'playlist'"
                                            class="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-400"
                                            @click.stop="handleCloudRemoveFromPlaylist(track)"
                                        >
                                            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                                        </button>
                                        <!-- Delete track -->
                                        <button
                                            class="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-400"
                                            @click.stop="confirmCloudDeleteTrack(track.id)"
                                        >
                                            <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Empty state -->
                            <div
                                v-else
                                class="flex flex-col items-center justify-center py-20 text-center"
                            >
                                <UIcon
                                    name="i-heroicons-cloud-arrow-up"
                                    class="w-16 h-16 text-gray-600 mb-4"
                                />
                                <p class="text-gray-400 text-lg mb-4">
                                    {{
                                        cloudViewMode === 'liked'
                                            ? t('music.cloud.noLikedTracks') ||
                                              'No liked tracks yet'
                                            : cloudViewMode === 'playlist'
                                              ? t('music.cloud.noPlaylistTracks') ||
                                                'No tracks in this playlist'
                                              : t('music.cloud.noTracks') || 'No music uploaded yet'
                                    }}
                                </p>
                                <UButton
                                    v-if="cloudViewMode === 'all'"
                                    icon="i-heroicons-cloud-arrow-up"
                                    class="bg-blue-600 hover:bg-blue-700"
                                    @click="handleCloudFileSelect"
                                >
                                    {{ t('music.cloud.uploadFirst') || 'Upload your first track' }}
                                </UButton>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>

        <!-- Fixed Player Bar for Local Music -->
        <div
            v-if="playbackState.currentTrack"
            class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-3 z-50"
        >
            <div class="max-w-7xl mx-auto flex items-center gap-4">
                <!-- Track info -->
                <div class="flex items-center gap-3 w-64 min-w-0">
                    <div
                        class="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                        :style="{ backgroundColor: getTrackColor(playbackState.currentTrack) }"
                    >
                        <UIcon name="i-heroicons-musical-note" class="w-6 h-6 text-white" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-white font-medium truncate text-sm">
                            {{
                                playbackState.currentTrack.title ||
                                playbackState.currentTrack.fileName
                            }}
                        </p>
                        <p class="text-gray-400 text-xs truncate">
                            {{
                                playbackState.currentTrack.artist || t('music.local.unknownArtist')
                            }}
                        </p>
                    </div>
                    <button
                        class="ml-2 p-1 rounded-full hover:bg-gray-800 transition-colors flex-shrink-0"
                        @click="handleToggleLike(playbackState.currentTrack)"
                    >
                        <UIcon
                            :name="
                                playbackState.currentTrack.isLiked
                                    ? 'i-heroicons-heart-solid'
                                    : 'i-heroicons-heart'
                            "
                            :class="[
                                'w-4 h-4',
                                playbackState.currentTrack.isLiked
                                    ? 'text-red-500'
                                    : 'text-gray-400',
                            ]"
                        />
                    </button>
                </div>

                <!-- Controls -->
                <div class="flex-1 flex flex-col items-center gap-2">
                    <div class="flex items-center gap-4">
                        <button
                            :class="[
                                'p-2 rounded-full transition-colors',
                                playbackState.isShuffled
                                    ? 'text-purple-400'
                                    : 'text-gray-400 hover:text-white',
                            ]"
                            @click="toggleShuffle"
                        >
                            <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4" />
                        </button>
                        <button
                            class="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
                            @click="previousTrack"
                        >
                            <UIcon name="i-heroicons-backward" class="w-5 h-5" />
                        </button>
                        <button
                            class="p-2 w-10 h-10 rounded-full bg-white text-gray-900 hover:scale-105 transition-transform flex items-center justify-center"
                            @click="togglePlay"
                        >
                            <UIcon
                                :name="
                                    playbackState.isPlaying
                                        ? 'i-heroicons-pause-solid'
                                        : 'i-heroicons-play-solid'
                                "
                                class="w-5 h-5"
                            />
                        </button>
                        <button
                            class="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
                            @click="nextTrack"
                        >
                            <UIcon name="i-heroicons-forward" class="w-5 h-5" />
                        </button>
                        <button
                            :class="[
                                'p-2 rounded-full transition-colors',
                                playbackState.repeatMode !== 'off'
                                    ? 'text-purple-400'
                                    : 'text-gray-400 hover:text-white',
                            ]"
                            @click="toggleRepeat"
                        >
                            <UIcon
                                :name="
                                    playbackState.repeatMode === 'one'
                                        ? 'i-heroicons-arrow-path'
                                        : 'i-heroicons-arrow-path'
                                "
                                class="w-4 h-4"
                            />
                            <span
                                v-if="playbackState.repeatMode === 'one'"
                                class="absolute text-[8px] font-bold"
                            >
                                1
                            </span>
                        </button>
                    </div>

                    <!-- Progress bar -->
                    <div class="flex items-center gap-2 w-full max-w-xl">
                        <span class="text-xs text-gray-400 w-10 text-right">
                            {{ formatDuration(playbackState.currentTime) }}
                        </span>
                        <div
                            class="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer group"
                            @click="handleSeek"
                        >
                            <div
                                class="h-full bg-white group-hover:bg-purple-500 rounded-full relative transition-colors"
                                :style="{ width: `${progressPercent}%` }"
                            >
                                <div
                                    class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                        <span class="text-xs text-gray-400 w-10">
                            {{ formatDuration(playbackState.duration) }}
                        </span>
                    </div>
                </div>

                <!-- Volume -->
                <div class="flex items-center gap-2 w-32">
                    <button
                        class="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
                        @click="toggleMute"
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
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        :value="playbackState.volume"
                        class="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                        @input="(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))"
                    />
                </div>
            </div>
        </div>

        <!-- Track Info Modal -->
        <div
            v-if="showTrackInfo && selectedTrack"
            class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            @click.self="closeTrackInfo"
        >
            <div class="bg-gray-900 rounded-xl max-w-lg w-full p-6">
                <div class="flex items-start justify-between mb-6">
                    <h2 class="text-xl font-bold text-white">{{ t('music.local.trackInfo') }}</h2>
                    <button
                        class="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                        @click="closeTrackInfo"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
                    </button>
                </div>

                <div class="flex gap-4 mb-6">
                    <div
                        class="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0"
                        :style="{ backgroundColor: getTrackColor(selectedTrack) }"
                    >
                        <UIcon name="i-heroicons-musical-note" class="w-12 h-12 text-white" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-white">
                            {{ selectedTrack.title || selectedTrack.fileName }}
                        </h3>
                        <p class="text-gray-400">
                            {{ selectedTrack.artist || t('music.local.unknownArtist') }}
                        </p>
                        <p class="text-gray-500 text-sm">
                            {{ selectedTrack.album || t('music.local.unknownAlbum') }}
                        </p>
                    </div>
                </div>

                <div class="space-y-3 text-sm">
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t('music.local.infoFile') }}</span>
                        <span class="text-white">{{ selectedTrack.fileName }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t('music.local.infoPath') }}</span>
                        <span class="text-white truncate ml-4 max-w-[250px]">
                            {{ selectedTrack.filePath }}
                        </span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t('music.local.infoDuration') }}</span>
                        <span class="text-white">{{ formatDuration(selectedTrack.duration) }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t('music.local.infoSize') }}</span>
                        <span class="text-white">{{ formatFileSize(selectedTrack.fileSize) }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t('music.local.infoFormat') }}</span>
                        <span class="text-white">{{ selectedTrack.mimeType || 'audio/mpeg' }}</span>
                    </div>
                    <div
                        v-if="selectedTrack.year"
                        class="flex justify-between py-2 border-b border-gray-800"
                    >
                        <span class="text-gray-400">{{ t('music.local.infoYear') }}</span>
                        <span class="text-white">{{ selectedTrack.year }}</span>
                    </div>
                    <div
                        v-if="selectedTrack.genre"
                        class="flex justify-between py-2 border-b border-gray-800"
                    >
                        <span class="text-gray-400">{{ t('music.local.infoGenre') }}</span>
                        <span class="text-white">{{ selectedTrack.genre }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add to Playlist Modal -->
        <div
            v-if="showAddToPlaylist && trackToAdd"
            class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            @click.self="showAddToPlaylist = false"
        >
            <div class="bg-gray-900 rounded-xl max-w-sm w-full p-6">
                <div class="flex items-start justify-between mb-6">
                    <h2 class="text-xl font-bold text-white">
                        {{ t('music.local.addToPlaylist') }}
                    </h2>
                    <button
                        class="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                        @click="showAddToPlaylist = false"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
                    </button>
                </div>

                <div v-if="playlists.length === 0" class="text-center py-8">
                    <UIcon
                        name="i-heroicons-musical-note"
                        class="w-12 h-12 text-gray-600 mx-auto mb-3"
                    />
                    <p class="text-gray-400">{{ t('music.local.noPlaylists') }}</p>
                </div>

                <div v-else class="space-y-2 max-h-64 overflow-y-auto">
                    <button
                        v-for="playlist in playlists"
                        :key="playlist.id"
                        class="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-gray-800 transition-colors"
                        @click="handleAddToPlaylist(playlist.id)"
                    >
                        <div
                            class="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                            :style="{ backgroundColor: playlist.coverColor }"
                        >
                            <UIcon name="i-heroicons-musical-note" class="w-5 h-5 text-white" />
                        </div>
                        <div class="min-w-0">
                            <p class="text-white font-medium truncate">{{ playlist.name }}</p>
                            <p class="text-gray-500 text-sm">
                                {{ playlist.trackCount }} {{ t('music.local.tracks') }}
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>

        <!-- Cloud Player Bar -->
        <div
            v-if="cloudPlaybackState.currentTrack && !playbackState.currentTrack"
            class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-3 z-50"
        >
            <div class="max-w-7xl mx-auto flex items-center gap-4">
                <!-- Track info -->
                <div class="flex items-center gap-3 w-64 min-w-0">
                    <div
                        class="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                        :style="{
                            backgroundColor: getCloudTrackColor(cloudPlaybackState.currentTrack),
                        }"
                    >
                        <UIcon name="i-heroicons-musical-note" class="w-6 h-6 text-white" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-white font-medium truncate text-sm">
                            {{
                                cloudPlaybackState.currentTrack.title ||
                                cloudPlaybackState.currentTrack.fileName
                            }}
                        </p>
                        <p class="text-gray-400 text-xs truncate">
                            {{
                                cloudPlaybackState.currentTrack.artist ||
                                t('music.local.unknownArtist') ||
                                'Unknown Artist'
                            }}
                        </p>
                    </div>
                    <button
                        class="ml-2 p-1 rounded-full hover:bg-gray-800 transition-colors flex-shrink-0"
                        @click="handleCloudToggleLike(cloudPlaybackState.currentTrack)"
                    >
                        <UIcon
                            :name="
                                cloudPlaybackState.currentTrack.isLiked
                                    ? 'i-heroicons-heart-solid'
                                    : 'i-heroicons-heart'
                            "
                            :class="[
                                'w-4 h-4',
                                cloudPlaybackState.currentTrack.isLiked
                                    ? 'text-red-500'
                                    : 'text-gray-400',
                            ]"
                        />
                    </button>
                </div>

                <!-- Controls -->
                <div class="flex-1 flex flex-col items-center gap-2">
                    <div class="flex items-center gap-4">
                        <button
                            :class="[
                                'p-2 rounded-full transition-colors',
                                cloudPlaybackState.isShuffled
                                    ? 'text-blue-400'
                                    : 'text-gray-400 hover:text-white',
                            ]"
                            @click="toggleCloudShuffle"
                        >
                            <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4" />
                        </button>
                        <button
                            class="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
                            @click="previousCloudTrack"
                        >
                            <UIcon name="i-heroicons-backward" class="w-5 h-5" />
                        </button>
                        <button
                            class="p-2 w-10 h-10 rounded-full bg-white text-gray-900 hover:scale-105 transition-transform flex items-center justify-center"
                            @click="toggleCloudPlay"
                        >
                            <UIcon
                                :name="
                                    cloudPlaybackState.isPlaying
                                        ? 'i-heroicons-pause-solid'
                                        : 'i-heroicons-play-solid'
                                "
                                class="w-5 h-5"
                            />
                        </button>
                        <button
                            class="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
                            @click="nextCloudTrack"
                        >
                            <UIcon name="i-heroicons-forward" class="w-5 h-5" />
                        </button>
                        <button
                            :class="[
                                'p-2 rounded-full transition-colors',
                                cloudPlaybackState.repeatMode !== 'off'
                                    ? 'text-blue-400'
                                    : 'text-gray-400 hover:text-white',
                            ]"
                            @click="toggleCloudRepeat"
                        >
                            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                        </button>
                    </div>

                    <!-- Progress bar -->
                    <div class="flex items-center gap-2 w-full max-w-xl">
                        <span class="text-xs text-gray-400 w-10 text-right">
                            {{ formatCloudDuration(cloudPlaybackState.currentTime) }}
                        </span>
                        <div
                            class="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer group"
                            @click="handleCloudSeek"
                        >
                            <div
                                class="h-full bg-white group-hover:bg-blue-500 rounded-full relative transition-colors"
                                :style="{ width: `${cloudProgressPercent}%` }"
                            >
                                <div
                                    class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                        <span class="text-xs text-gray-400 w-10">
                            {{ formatCloudDuration(cloudPlaybackState.duration) }}
                        </span>
                    </div>
                </div>

                <!-- Volume -->
                <div class="flex items-center gap-2 w-32">
                    <button
                        class="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
                        @click="toggleCloudMute"
                    >
                        <UIcon
                            :name="
                                cloudPlaybackState.isMuted || cloudPlaybackState.volume === 0
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
                        step="0.01"
                        :value="cloudPlaybackState.volume"
                        class="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                        @input="
                            (e) => setCloudVolume(parseFloat((e.target as HTMLInputElement).value))
                        "
                    />
                </div>
            </div>
        </div>

        <!-- Cloud Track Info Modal -->
        <div
            v-if="showCloudTrackInfo && selectedCloudTrack"
            class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            @click.self="closeCloudTrackInfo"
        >
            <div class="bg-gray-900 rounded-xl max-w-lg w-full p-6">
                <div class="flex items-start justify-between mb-6">
                    <h2 class="text-xl font-bold text-white">
                        {{ t('music.cloud.trackInfo') || 'Track Info' }}
                    </h2>
                    <button
                        class="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                        @click="closeCloudTrackInfo"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
                    </button>
                </div>

                <div class="flex gap-4 mb-6">
                    <div
                        class="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0"
                        :style="{ backgroundColor: getCloudTrackColor(selectedCloudTrack) }"
                    >
                        <UIcon name="i-heroicons-musical-note" class="w-12 h-12 text-white" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-white">
                            {{ selectedCloudTrack.title || selectedCloudTrack.fileName }}
                        </h3>
                        <p class="text-gray-400">
                            {{
                                selectedCloudTrack.artist ||
                                t('music.local.unknownArtist') ||
                                'Unknown Artist'
                            }}
                        </p>
                        <p class="text-gray-500 text-sm">
                            {{
                                selectedCloudTrack.album ||
                                t('music.local.unknownAlbum') ||
                                'Unknown Album'
                            }}
                        </p>
                    </div>
                </div>

                <div class="space-y-3 text-sm">
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t('music.local.infoFile') || 'File' }}</span>
                        <span class="text-white">{{ selectedCloudTrack.fileName }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">
                            {{ t('music.local.infoDuration') || 'Duration' }}
                        </span>
                        <span class="text-white">
                            {{ formatCloudDuration(selectedCloudTrack.duration) }}
                        </span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t('music.local.infoSize') || 'Size' }}</span>
                        <span class="text-white">
                            {{ formatCloudFileSize(selectedCloudTrack.fileSize) }}
                        </span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">
                            {{ t('music.local.infoFormat') || 'Format' }}
                        </span>
                        <span class="text-white">
                            {{ selectedCloudTrack.mimeType || 'audio/mpeg' }}
                        </span>
                    </div>
                    <div
                        v-if="selectedCloudTrack.year"
                        class="flex justify-between py-2 border-b border-gray-800"
                    >
                        <span class="text-gray-400">{{ t('music.local.infoYear') || 'Year' }}</span>
                        <span class="text-white">{{ selectedCloudTrack.year }}</span>
                    </div>
                    <div
                        v-if="selectedCloudTrack.genre"
                        class="flex justify-between py-2 border-b border-gray-800"
                    >
                        <span class="text-gray-400">
                            {{ t('music.local.infoGenre') || 'Genre' }}
                        </span>
                        <span class="text-white">{{ selectedCloudTrack.genre }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">
                            {{ t('music.cloud.playCount') || 'Play Count' }}
                        </span>
                        <span class="text-white">{{ selectedCloudTrack.playCount || 0 }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">
                            {{ t('music.cloud.uploadedAt') || 'Uploaded' }}
                        </span>
                        <span class="text-white">
                            {{ new Date(selectedCloudTrack.createdAt).toLocaleDateString() }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cloud Add to Playlist Modal -->
        <div
            v-if="showCloudAddToPlaylist && cloudTrackToAdd"
            class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            @click.self="showCloudAddToPlaylist = false"
        >
            <div class="bg-gray-900 rounded-xl max-w-sm w-full p-6">
                <div class="flex items-start justify-between mb-6">
                    <h2 class="text-xl font-bold text-white">
                        {{ t('music.local.addToPlaylist') || 'Add to Playlist' }}
                    </h2>
                    <button
                        class="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                        @click="showCloudAddToPlaylist = false"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
                    </button>
                </div>

                <div v-if="cloudPlaylists.length === 0" class="text-center py-8">
                    <UIcon
                        name="i-heroicons-musical-note"
                        class="w-12 h-12 text-gray-600 mx-auto mb-3"
                    />
                    <p class="text-gray-400">
                        {{ t('music.cloud.noPlaylists') || 'No playlists yet' }}
                    </p>
                </div>

                <div v-else class="space-y-2 max-h-64 overflow-y-auto">
                    <button
                        v-for="playlist in cloudPlaylists"
                        :key="playlist.id"
                        class="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-gray-800 transition-colors"
                        @click="handleCloudAddToPlaylist(playlist.id)"
                    >
                        <div
                            class="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                            :style="{ backgroundColor: playlist.coverColor }"
                        >
                            <UIcon name="i-heroicons-musical-note" class="w-5 h-5 text-white" />
                        </div>
                        <div class="min-w-0">
                            <p class="text-white font-medium truncate">{{ playlist.name }}</p>
                            <p class="text-gray-500 text-sm">
                                {{ playlist.trackCount }} {{ t('music.local.tracks') || 'tracks' }}
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>

        <!-- Cloud Delete Confirmation Modal -->
        <div
            v-if="showCloudDeleteConfirm"
            class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            @click.self="cancelCloudDelete"
        >
            <div class="bg-gray-900 rounded-xl max-w-sm w-full p-6">
                <div class="flex items-start justify-between mb-4">
                    <h2 class="text-xl font-bold text-white">
                        {{ t('music.cloud.deleteTrack') || 'Delete Track' }}
                    </h2>
                    <button
                        class="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                        @click="cancelCloudDelete"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
                    </button>
                </div>

                <p class="text-gray-400 mb-6">
                    {{
                        t('music.cloud.deleteConfirm') ||
                        'Are you sure you want to delete this track? This action cannot be undone.'
                    }}
                </p>

                <div class="flex justify-end gap-3">
                    <UButton variant="ghost" @click="cancelCloudDelete">
                        {{ t('common.cancel') || 'Cancel' }}
                    </UButton>
                    <UButton
                        color="error"
                        class="bg-red-600 hover:bg-red-700"
                        @click="handleCloudDeleteTrack"
                    >
                        {{ t('common.delete') || 'Delete' }}
                    </UButton>
                </div>
            </div>
        </div>

        <Footer mode="app" />
    </div>
</template>
