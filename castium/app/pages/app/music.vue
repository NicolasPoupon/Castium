<script setup lang="ts">
import { useI18n } from "#imports"
import type { LocalTrack, LocalPlaylist } from "~/composables/useLocalMusic"

const { t } = useI18n()

definePageMeta({
    title: "Music",
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

// Client-only flag for hydration
const isClient = ref(false)

// Active tab: 'local' | 'spotify'
const activeTab = ref<"local" | "spotify">("local")

// Spotify state
const spotifyUserPlaylists = ref<any[]>([])
const spotifyFeaturedPlaylists = ref<any[]>([])
const spotifyLoading = ref(false)
const spotifySearchQuery = ref("")

// Local music state
const localSearchQuery = ref("")
const showCreatePlaylist = ref(false)
const newPlaylistName = ref("")
const selectedPlaylist = ref<LocalPlaylist | null>(null)
const playlistTracks = ref<LocalTrack[]>([])
const viewMode = ref<"all" | "liked" | "playlist">("all")
const showTrackInfo = ref(false)
const selectedTrack = ref<LocalTrack | null>(null)
const showAddToPlaylist = ref(false)
const trackToAdd = ref<LocalTrack | null>(null)

// Filter local tracks by search
const filteredTracks = computed(() => {
    const trackList = viewMode.value === "liked"
        ? getLikedTracks.value
        : viewMode.value === "playlist"
            ? playlistTracks.value
            : tracks.value

    if (!localSearchQuery.value) return trackList
    const query = localSearchQuery.value.toLowerCase()
    return trackList.filter((t) =>
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
        const [user, featured] = await Promise.all([
            getUserPlaylists(20),
            getFeaturedPlaylists(),
        ])

        spotifyUserPlaylists.value = user.items || []
        spotifyFeaturedPlaylists.value = featured.playlists?.items || []
    } catch (error) {
        console.error("Error loading Spotify playlists:", error)
    } finally {
        spotifyLoading.value = false
    }
}

const handlePlaySpotifyPlaylist = async (playlistId: string) => {
    try {
        await spotifyPlay(`spotify:playlist:${playlistId}`)
    } catch (error) {
        console.error("Error playing Spotify playlist:", error)
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
    newPlaylistName.value = ""
    showCreatePlaylist.value = false
}

const handleDeletePlaylist = async (playlistId: string) => {
    await deletePlaylist(playlistId)
    if (selectedPlaylist.value?.id === playlistId) {
        selectedPlaylist.value = null
        viewMode.value = "all"
    }
}

const handleSelectPlaylist = async (playlist: LocalPlaylist) => {
    selectedPlaylist.value = playlist
    viewMode.value = "playlist"
    playlistTracks.value = await getPlaylistTracks(playlist.id)
}

const handleViewLiked = () => {
    selectedPlaylist.value = null
    viewMode.value = "liked"
}

const handleViewAll = () => {
    selectedPlaylist.value = null
    viewMode.value = "all"
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
    if (viewMode.value === "liked") {
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

// Get thumbnail color based on track
const getTrackColor = (track: LocalTrack) => {
    const colors = [
        "#dc2626", "#ea580c", "#d97706", "#65a30d", "#16a34a",
        "#0891b2", "#2563eb", "#7c3aed", "#c026d3", "#e11d48",
    ]
    const index = (track.title?.length || track.fileName.length) % colors.length
    return colors[index]
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
})

watch(spotifyAuthenticated, (isAuth) => {
    if (isAuth) {
        loadSpotifyPlaylists()
    }
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col">
        <Navbar mode="app" />

        <div class="pt-24 pb-32">
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
                        {{ t("music.tabs.local") }}
                    </button>
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2',
                            activeTab === 'spotify'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                        ]"
                        @click="activeTab = 'spotify'"
                    >
                        <UIcon name="i-heroicons-musical-note" class="w-5 h-5" />
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
                                    class="w-24 h-24 text-purple-500 mx-auto mb-6"
                                />
                                <h1 class="text-4xl font-bold text-white mb-4">
                                    {{ t("music.local.title") }}
                                </h1>
                                <p class="text-gray-400 text-lg mb-8">
                                    {{ t("music.local.description") }}
                                </p>
                            </div>

                            <!-- Reauthorization button -->
                            <div
                                v-if="needsReauthorization && savedFolderName"
                                class="mb-6"
                            >
                                <p class="text-gray-300 mb-4">
                                    {{ t("music.local.previousFolder") }}:
                                    <span class="text-purple-400 font-medium">
                                        {{ savedFolderName }}
                                    </span>
                                </p>
                                <UButton
                                    icon="i-heroicons-arrow-path"
                                    size="xl"
                                    :label="t('music.local.reauthorize')"
                                    :loading="localLoading"
                                    class="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                    @click="handleReauthorize"
                                />
                                <p class="text-gray-500 text-sm mt-4">
                                    {{ t("music.local.orSelectNew") }}
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
                                        ? 'border-purple-600 text-purple-400 hover:bg-purple-600/20'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white font-semibold'
                                "
                                @click="handleSelectFolder"
                            />

                            <p class="text-gray-500 text-sm mt-6">
                                {{ t("music.local.permissionNotice") }}
                            </p>
                        </div>
                    </div>

                    <!-- Music library -->
                    <div v-else class="flex gap-6">
                        <!-- Sidebar: Playlists -->
                        <aside class="w-64 flex-shrink-0">
                            <div class="bg-gray-800/50 rounded-xl p-4 sticky top-24">
                                <!-- Navigation -->
                                <nav class="space-y-1 mb-6">
                                    <button
                                        :class="[
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                                            viewMode === 'all'
                                                ? 'bg-purple-600/20 text-purple-400'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                        @click="handleViewAll"
                                    >
                                        <UIcon name="i-heroicons-musical-note" class="w-5 h-5" />
                                        <span>{{ t("music.local.allTracks") }}</span>
                                        <span class="ml-auto text-sm text-gray-500">{{ tracks.length }}</span>
                                    </button>
                                    <button
                                        :class="[
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                                            viewMode === 'liked'
                                                ? 'bg-purple-600/20 text-purple-400'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                        @click="handleViewLiked"
                                    >
                                        <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-500" />
                                        <span>{{ t("music.local.likedTracks") }}</span>
                                        <span class="ml-auto text-sm text-gray-500">{{ getLikedTracks.length }}</span>
                                    </button>
                                </nav>

                                <!-- Playlists header -->
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                                        {{ t("music.local.playlists") }}
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
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group',
                                            selectedPlaylist?.id === playlist.id
                                                ? 'bg-purple-600/20 text-purple-400'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50',
                                        ]"
                                    >
                                        <button
                                            class="flex items-center gap-3 flex-1 min-w-0"
                                            @click="handleSelectPlaylist(playlist)"
                                        >
                                            <div
                                                class="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                                                :style="{ backgroundColor: playlist.coverColor }"
                                            >
                                                <UIcon name="i-heroicons-musical-note" class="w-4 h-4 text-white" />
                                            </div>
                                            <span class="truncate flex-1">{{ playlist.name }}</span>
                                            <span class="text-sm text-gray-500">{{ playlist.trackCount }}</span>
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
                                    class="mt-4 p-3 bg-gray-700/50 rounded-lg"
                                >
                                    <input
                                        v-model="newPlaylistName"
                                        type="text"
                                        :placeholder="t('music.local.playlistName')"
                                        class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        @keyup.enter="handleCreatePlaylist"
                                    />
                                    <div class="flex gap-2 mt-2">
                                        <UButton
                                            size="xs"
                                            variant="ghost"
                                            @click="showCreatePlaylist = false"
                                        >
                                            {{ t("common.cancel") }}
                                        </UButton>
                                        <UButton
                                            size="xs"
                                            class="bg-purple-600 hover:bg-purple-700"
                                            :disabled="!newPlaylistName.trim()"
                                            @click="handleCreatePlaylist"
                                        >
                                            {{ t("common.create") }}
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
                                        {{ t("music.local.rescan") }}
                                    </button>
                                    <button
                                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                                        @click="handleSelectFolder"
                                    >
                                        <UIcon name="i-heroicons-folder-open" class="w-4 h-4" />
                                        {{ t("music.local.changeFolder") }}
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
                                            {{ t("music.local.fallbackTitle") }}
                                        </p>
                                        <p class="text-amber-300/70 text-sm mt-1">
                                            {{ t("music.local.fallbackDescription") }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Header -->
                            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                                <div>
                                    <h1 class="text-3xl font-bold text-white">
                                        {{ viewMode === 'liked'
                                            ? t("music.local.likedTracks")
                                            : viewMode === 'playlist' && selectedPlaylist
                                                ? selectedPlaylist.name
                                                : t("music.local.allTracks")
                                        }}
                                    </h1>
                                    <p class="text-gray-400 text-sm mt-1">
                                        {{ filteredTracks.length }} {{ t("music.local.tracks") }}
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
                            <div
                                v-if="localLoading"
                                class="flex items-center justify-center py-20"
                            >
                                <UIcon
                                    name="i-heroicons-arrow-path"
                                    class="w-12 h-12 text-purple-500 animate-spin"
                                />
                            </div>

                            <!-- Track list -->
                            <div v-else-if="filteredTracks.length > 0" class="bg-gray-800/30 rounded-xl overflow-hidden">
                                <!-- Header row -->
                                <div class="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-700/50">
                                    <span class="w-10 text-center">#</span>
                                    <span>{{ t("music.local.columnTitle") }}</span>
                                    <span class="hidden md:block">{{ t("music.local.columnAlbum") }}</span>
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
                                        'group grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-2 transition-colors',
                                        track.isAvailable === false
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'cursor-pointer',
                                        playbackState.currentTrack?.filePath === track.filePath
                                            ? 'bg-purple-600/20'
                                            : track.isAvailable !== false ? 'hover:bg-gray-700/30' : '',
                                    ]"
                                    @dblclick="handlePlayTrack(track, index)"
                                >
                                    <!-- Index / Play icon -->
                                    <div class="w-10 flex items-center justify-center">
                                        <template v-if="track.isAvailable === false">
                                            <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 text-amber-500" />
                                        </template>
                                        <template v-else>
                                            <span
                                                v-if="playbackState.currentTrack?.filePath === track.filePath && playbackState.isPlaying"
                                                class="text-purple-400"
                                            >
                                                <UIcon name="i-heroicons-speaker-wave" class="w-4 h-4 animate-pulse" />
                                            </span>
                                            <span v-else class="text-gray-400 group-hover:hidden">
                                                {{ index + 1 }}
                                            </span>
                                            <button
                                                class="hidden group-hover:block text-white"
                                                @click.stop="handlePlayTrack(track, index)"
                                            >
                                                <UIcon name="i-heroicons-play-solid" class="w-4 h-4" />
                                            </button>
                                        </template>
                                    </div>

                                    <!-- Title & Artist -->
                                    <div class="flex items-center gap-3 min-w-0">
                                        <div
                                            :class="[
                                                'w-10 h-10 rounded flex items-center justify-center flex-shrink-0',
                                                track.isAvailable === false ? 'grayscale' : '',
                                            ]"
                                            :style="{ backgroundColor: getTrackColor(track) }"
                                        >
                                            <UIcon name="i-heroicons-musical-note" class="w-5 h-5 text-white" />
                                        </div>
                                        <div class="min-w-0">
                                            <p
                                                :class="[
                                                    'font-medium truncate',
                                                    track.isAvailable === false
                                                        ? 'text-gray-500'
                                                        : playbackState.currentTrack?.filePath === track.filePath
                                                            ? 'text-purple-400'
                                                            : 'text-white',
                                                ]"
                                            >
                                                {{ track.title || track.fileName }}
                                            </p>
                                            <p :class="['text-sm truncate', track.isAvailable === false ? 'text-gray-600' : 'text-gray-400']">
                                                {{ track.artist || t("music.local.unknownArtist") }}
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Album -->
                                    <div :class="['text-sm truncate hidden md:block', track.isAvailable === false ? 'text-gray-600' : 'text-gray-400']">
                                        {{ track.album || t("music.local.unknownAlbum") }}
                                    </div>

                                    <!-- Duration -->
                                    <div :class="['w-16 text-sm text-center', track.isAvailable === false ? 'text-gray-600' : 'text-gray-400']">
                                        {{ formatDuration(track.duration) }}
                                    </div>

                                    <!-- Actions -->
                                    <div class="w-24 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <!-- Available track actions -->
                                        <template v-if="track.isAvailable !== false">
                                            <button
                                                class="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
                                                @click.stop="handleToggleLike(track)"
                                            >
                                                <UIcon
                                                    :name="track.isLiked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                                                    :class="[
                                                        'w-4 h-4',
                                                        track.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-white',
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
                                                <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
                                            </button>
                                        </template>
                                        <!-- Unavailable track: only delete allowed -->
                                        <template v-else>
                                            <span class="text-xs text-amber-500 mr-2">{{ t("music.local.unavailable") }}</span>
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
                                    {{ viewMode === 'liked'
                                        ? t("music.local.noLikedTracks")
                                        : viewMode === 'playlist'
                                            ? t("music.local.noPlaylistTracks")
                                            : t("music.local.noTracks")
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
                                    {{ t("music.hero.connectToSpotify") }}
                                </h1>
                                <p class="text-gray-400 text-lg mb-8">
                                    {{ t("music.hero.description") }}
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
                                {{ t("music.hero.redirectNotice") }}
                            </p>
                        </div>
                    </div>

                    <div v-else>
                        <div class="mb-8">
                            <h1 class="text-4xl font-bold text-white mb-6">
                                {{ t("music.hero.yourMusic") }}
                            </h1>
                            <UInput
                                v-model="spotifySearchQuery"
                                icon="i-heroicons-magnifying-glass"
                                size="lg"
                                :placeholder="t('music.local.searchPlaceholder')"
                                class="max-w-2xl"
                            />
                        </div>

                        <div
                            v-if="spotifyLoading"
                            class="flex items-center justify-center py-20"
                        >
                            <UIcon
                                name="i-heroicons-arrow-path"
                                class="w-12 h-12 text-castium-green animate-spin"
                            />
                        </div>

                        <div v-else class="space-y-12">
                            <section v-if="spotifyUserPlaylists.length > 0">
                                <h2 class="text-2xl font-bold text-white mb-6">
                                    {{ t("music.hero.playlists") }}
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
                                    {{ t("music.hero.recommendedPlaylists") }}
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
            </div>
        </div>

        <!-- Fixed Player Bar -->
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
                            {{ playbackState.currentTrack.title || playbackState.currentTrack.fileName }}
                        </p>
                        <p class="text-gray-400 text-xs truncate">
                            {{ playbackState.currentTrack.artist || t("music.local.unknownArtist") }}
                        </p>
                    </div>
                    <button
                        class="ml-2 p-1 rounded-full hover:bg-gray-800 transition-colors flex-shrink-0"
                        @click="handleToggleLike(playbackState.currentTrack)"
                    >
                        <UIcon
                            :name="playbackState.currentTrack.isLiked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                            :class="[
                                'w-4 h-4',
                                playbackState.currentTrack.isLiked ? 'text-red-500' : 'text-gray-400',
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
                                playbackState.isShuffled ? 'text-purple-400' : 'text-gray-400 hover:text-white',
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
                                :name="playbackState.isPlaying ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
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
                                playbackState.repeatMode !== 'off' ? 'text-purple-400' : 'text-gray-400 hover:text-white',
                            ]"
                            @click="toggleRepeat"
                        >
                            <UIcon
                                :name="playbackState.repeatMode === 'one' ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-path'"
                                class="w-4 h-4"
                            />
                            <span
                                v-if="playbackState.repeatMode === 'one'"
                                class="absolute text-[8px] font-bold"
                            >1</span>
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
                            :name="playbackState.isMuted || playbackState.volume === 0
                                ? 'i-heroicons-speaker-x-mark'
                                : playbackState.volume < 0.5
                                    ? 'i-heroicons-speaker-wave'
                                    : 'i-heroicons-speaker-wave'"
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
                    <h2 class="text-xl font-bold text-white">{{ t("music.local.trackInfo") }}</h2>
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
                        <p class="text-gray-400">{{ selectedTrack.artist || t("music.local.unknownArtist") }}</p>
                        <p class="text-gray-500 text-sm">{{ selectedTrack.album || t("music.local.unknownAlbum") }}</p>
                    </div>
                </div>

                <div class="space-y-3 text-sm">
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t("music.local.infoFile") }}</span>
                        <span class="text-white">{{ selectedTrack.fileName }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t("music.local.infoPath") }}</span>
                        <span class="text-white truncate ml-4 max-w-[250px]">{{ selectedTrack.filePath }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t("music.local.infoDuration") }}</span>
                        <span class="text-white">{{ formatDuration(selectedTrack.duration) }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t("music.local.infoSize") }}</span>
                        <span class="text-white">{{ formatFileSize(selectedTrack.fileSize) }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t("music.local.infoFormat") }}</span>
                        <span class="text-white">{{ selectedTrack.mimeType || 'audio/mpeg' }}</span>
                    </div>
                    <div v-if="selectedTrack.year" class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t("music.local.infoYear") }}</span>
                        <span class="text-white">{{ selectedTrack.year }}</span>
                    </div>
                    <div v-if="selectedTrack.genre" class="flex justify-between py-2 border-b border-gray-800">
                        <span class="text-gray-400">{{ t("music.local.infoGenre") }}</span>
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
                    <h2 class="text-xl font-bold text-white">{{ t("music.local.addToPlaylist") }}</h2>
                    <button
                        class="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
                        @click="showAddToPlaylist = false"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
                    </button>
                </div>

                <div v-if="playlists.length === 0" class="text-center py-8">
                    <UIcon name="i-heroicons-musical-note" class="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p class="text-gray-400">{{ t("music.local.noPlaylists") }}</p>
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
                            <p class="text-gray-500 text-sm">{{ playlist.trackCount }} {{ t("music.local.tracks") }}</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>

        <Footer mode="app" />
    </div>
</template>
