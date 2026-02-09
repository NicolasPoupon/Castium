<script setup lang="ts">
import { useI18n } from '#imports'
import type { LocalTrack, LocalPlaylist } from '~/composables/useLocalMusic'
import type { CloudTrack, CloudPlaylist } from '~/composables/useCloudMusic'
import type { ThemeColor } from '~/composables/useTheme'
import type { MediaTrack } from '~/composables/useGlobalPlayer'

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const { colors, colorClasses } = useTheme()

// Global player
const {
    playTrack: globalPlayTrack,
    stop: globalStop,
} = useGlobalPlayer()

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
    clearAuth: disconnectSpotifyAuth,
    getCurrentUser,
    getUserPlaylists,
    getPlaylistTracks: getSpotifyPlaylistTracks,
    getFeaturedPlaylists,
    search: spotifySearch,
    ensureWebPlaybackPlayer,
    startWebPlayback,
    queueTrack: queueSpotifyTrack,
    webPlaybackError: spotifyWebPlaybackError,
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
    clearLocalState: clearLocalMusic,
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
    clearState: clearCloudMusic,
} = useCloudMusic()

// Client-only flag for hydration
const isClient = ref(false)

// Active tab: 'local' | 'spotify' | 'upload'
const activeTab = ref<'local' | 'spotify' | 'upload'>('local')

// Spotify state
const spotifyUserPlaylists = ref<any[]>([])
const spotifyFeaturedPlaylists = ref<any[]>([])
const spotifyProfile = ref<any | null>(null)
const spotifyApiError = ref('')
const spotifyLoading = ref(false)
const spotifyPlaylistLoading = ref(false)
const spotifySearchQuery = ref('')
const spotifySearchLoading = ref(false)
const spotifySearchError = ref('')
const spotifySearchResults = ref<any[]>([])
let spotifySearchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const spotifySelectedPlaylistName = ref('')
const spotifyPlaylistTracks = ref<any[]>([])
const getSpotifyErrorMessage = (errorCode: string) => {
    switch (errorCode) {
        case 'access_denied':
            return 'Connexion Spotify annulée. Autorisez l’accès pour continuer.'
        case 'missing_code':
            return 'Code OAuth Spotify manquant.'
        case 'invalid_client':
            return 'Configuration Spotify invalide (client_id/client_secret).'
        case 'invalid_grant':
            return 'Redirect URI Spotify invalide ou code expiré.'
        default:
            return 'La connexion Spotify a échoué. Vérifiez la configuration OAuth.'
    }
}

const getSpotifyApiErrorMessage = (error: any) => {
    const status = error?.status || error?.statusCode
    const message = String(
        error?.data?.error?.message || error?.statusMessage || error?.message || ''
    )

    if (status === 403 && /premium required/i.test(message)) {
        return 'Spotify Premium est requis pour la lecture complète.'
    }
    if (status === 403) {
        return "Spotify a refusé l'accès (403). Vérifie que ton compte Spotify est ajouté dans le Dashboard (Users and Access) et que les scopes sont autorisés."
    }
    if (status === 404 && /no active device/i.test(message)) {
        return 'Aucun appareil Spotify actif. Relance la page et réessaie.'
    }
    if (message) return message
    if (error?.statusMessage) return String(error.statusMessage)
    if (error?.message) return String(error.message)
    return 'Erreur Spotify inconnue.'
}

const filteredSpotifyPlaylistTracks = computed(() => {
    return spotifyPlaylistTracks.value
})

const getSpotifyTrackUri = (track: any): string | null => {
    if (!track?.id) return null
    if (typeof track.uri === 'string' && track.uri.startsWith('spotify:')) return track.uri
    return `spotify:track:${track.id}`
}

const getPlayableSpotifyTracks = (tracks: any[]) =>
    tracks
        .map((track) => {
            const uri = getSpotifyTrackUri(track)
            if (!uri || !track?.id) return null
            return {
                id: track.id as string,
                uri,
            }
        })
        .filter((track): track is { id: string; uri: string } => !!track)

const ensureSpotifyWebPlayer = async () => {
    try {
        await ensureWebPlaybackPlayer()
        return true
    } catch (error: any) {
        const message = getSpotifyApiErrorMessage(error)
        spotifyApiError.value = message
        toast.add({
            title: 'Lecture Spotify indisponible',
            description: message,
            color: 'warning',
        })
        return false
    }
}

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
    spotifyApiError.value = ''
    try {
        const [profile, user] = await Promise.all([getCurrentUser(), getUserPlaylists(20)])

        spotifyProfile.value = profile || null
        spotifyUserPlaylists.value = user.items || []
    } catch (error: any) {
        console.error('Error loading Spotify playlists:', error)
        spotifyApiError.value = getSpotifyApiErrorMessage(error)
        spotifyProfile.value = null
        spotifyUserPlaylists.value = []
        spotifyFeaturedPlaylists.value = []
        return
    }

    // Featured playlists are non-critical and can fail depending on Spotify API availability.
    try {
        const featured = await getFeaturedPlaylists(20)
        spotifyFeaturedPlaylists.value = featured.playlists?.items || []
    } catch (error: any) {
        spotifyFeaturedPlaylists.value = []
        console.warn('Spotify featured playlists unavailable:', error)
    } finally {
        spotifyLoading.value = false
    }
}

const handlePlaySpotifyPlaylist = async (playlistId: string) => {
    try {
        spotifyPlaylistLoading.value = true
        spotifyApiError.value = ''

        const playlist =
            spotifyUserPlaylists.value.find((p) => p.id === playlistId) ||
            spotifyFeaturedPlaylists.value.find((p) => p.id === playlistId)
        spotifySelectedPlaylistName.value = playlist?.name || 'Playlist Spotify'

        const items = await getSpotifyPlaylistTracks(playlistId, 100)
        spotifyPlaylistTracks.value = items || []

        const playableTracks = getPlayableSpotifyTracks(
            spotifyPlaylistTracks.value.map((item) => item?.track)
        )

        if (playableTracks.length === 0) {
            toast.add({
                title: 'Lecture impossible',
                description:
                    "Cette playlist Spotify n'a pas de titres lisibles.",
                color: 'warning',
            })
            return
        }

        const canPlay = await ensureSpotifyWebPlayer()
        if (!canPlay) return

        globalStop()
        const playlistUri = playlist?.uri
        if (playlistUri) {
            await startWebPlayback({ contextUri: playlistUri })
            return
        }
        await startWebPlayback({
            trackUris: playableTracks.map((track) => track.uri),
            startIndex: 0,
        })
    } catch (error: any) {
        console.error('Error playing Spotify playlist:', error)
        spotifyApiError.value = getSpotifyApiErrorMessage(error)
    } finally {
        spotifyPlaylistLoading.value = false
    }
}

const handlePlaySpotifyTrack = async (trackId: string) => {
    const playableTracks = getPlayableSpotifyTracks(
        spotifyPlaylistTracks.value.map((item) => item?.track)
    )
    const index = playableTracks.findIndex((track) => track.id === trackId)
    if (index < 0) {
        toast.add({
            title: 'Titre indisponible',
            description: 'Ce titre ne peut pas être lu avec Spotify.',
            color: 'warning',
        })
        return
    }

    const canPlay = await ensureSpotifyWebPlayer()
    if (!canPlay) return

    try {
        globalStop()
        await startWebPlayback({
            trackUris: playableTracks.map((track) => track.uri),
            startIndex: index,
        })
    } catch (error: any) {
        spotifyApiError.value = getSpotifyApiErrorMessage(error)
    }
}

const runSpotifySearch = async (query: string) => {
    const term = query.trim()
    if (term.length < 2) {
        spotifySearchResults.value = []
        spotifySearchError.value = ''
        return
    }

    spotifySearchLoading.value = true
    spotifySearchError.value = ''
    try {
        const result = await spotifySearch(term, 'track')
        spotifySearchResults.value = result?.tracks?.items || []
    } catch (error: any) {
        console.error('Spotify search error:', error)
        spotifySearchResults.value = []
        spotifySearchError.value = getSpotifyApiErrorMessage(error)
    } finally {
        spotifySearchLoading.value = false
    }
}

const handlePlaySpotifySearchTrack = async (trackId: string) => {
    const playableTracks = getPlayableSpotifyTracks(spotifySearchResults.value)
    const index = playableTracks.findIndex((track) => track.id === trackId)

    if (index < 0) {
        toast.add({
            title: 'Titre indisponible',
            description: 'Ce titre ne peut pas être lu avec Spotify.',
            color: 'warning',
        })
        return
    }

    const canPlay = await ensureSpotifyWebPlayer()
    if (!canPlay) return

    try {
        globalStop()
        await startWebPlayback({
            trackUris: playableTracks.map((track) => track.uri),
            startIndex: index,
        })
    } catch (error: any) {
        spotifyApiError.value = getSpotifyApiErrorMessage(error)
    }
}

const handleQueueSpotifySearchTrack = async (track: any) => {
    const trackUri = getSpotifyTrackUri(track)
    if (!trackUri) {
        toast.add({
            title: 'Titre indisponible',
            description: 'Ce titre ne peut pas être ajouté à la file Spotify.',
            color: 'warning',
        })
        return
    }

    const canPlay = await ensureSpotifyWebPlayer()
    if (!canPlay) return

    try {
        await queueSpotifyTrack(trackUri)
        toast.add({
            title: 'Ajouté à la file Spotify',
            description: track.name || 'Titre',
            color: 'success',
        })
    } catch (error: any) {
        spotifyApiError.value = getSpotifyApiErrorMessage(error)
    }
}

const connectSpotify = () => {
    try {
        window.location.href = getAuthUrl()
    } catch (error) {
        console.error('Spotify OAuth configuration error:', error)
        toast.add({
            title: 'Configuration Spotify invalide',
            description: 'Vérifiez les variables OAuth Spotify (client id / redirect URI).',
            color: 'error',
        })
    }
}

const disconnectSpotify = () => {
    disconnectSpotifyAuth()
    spotifyProfile.value = null
    spotifyUserPlaylists.value = []
    spotifyFeaturedPlaylists.value = []
    spotifyPlaylistTracks.value = []
    spotifySelectedPlaylistName.value = ''
    spotifyApiError.value = ''
    spotifySearchQuery.value = ''
    spotifySearchResults.value = []
    spotifySearchError.value = ''
    spotifySearchLoading.value = false
    toast.add({
        title: 'Compte Spotify déconnecté',
        color: 'success',
    })
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

// Convert LocalTrack to MediaTrack for global player
const localTrackToMediaTrack = (track: LocalTrack): MediaTrack => ({
    id: track.id,
    title: track.title || track.fileName,
    artist: track.artist,
    album: track.album,
    coverArt: track.coverArt,
    duration: track.duration,
    file: track.file,
    handle: track.handle,
    type: 'music',
    isCloud: false,
})

// Convert CloudTrack to MediaTrack for global player
const cloudTrackToMediaTrack = (track: CloudTrack): MediaTrack => ({
    id: track.id,
    title: track.title || track.fileName,
    artist: track.artist,
    album: track.album,
    coverArt: track.coverArt || undefined,
    duration: track.duration || undefined,
    url: track.publicUrl,
    type: 'music',
    isCloud: true,
})

const handlePlayTrack = (track: LocalTrack, index: number) => {
    // Only play if track is available
    if (!track.isAvailable) return
    // Filter to only available tracks for the queue
    const availableTracks = filteredTracks.value.filter((t) => t.isAvailable !== false)
    const newIndex = availableTracks.findIndex((t) => t.filePath === track.filePath)
    if (newIndex >= 0) {
        // Convert to MediaTracks and play via global player
        const mediaQueue = availableTracks.map(localTrackToMediaTrack)
        globalPlayTrack(mediaQueue[newIndex], mediaQueue, newIndex)
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
    // Convert to MediaTracks and play via global player
    const mediaQueue = trackList.map(cloudTrackToMediaTrack)
    globalPlayTrack(mediaQueue[index], mediaQueue, index)
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
    const requestedTab = route.query.tab
    if (requestedTab === 'local' || requestedTab === 'spotify' || requestedTab === 'upload') {
        activeTab.value = requestedTab
    }

    const spotifyError = typeof route.query.error === 'string' ? route.query.error : null
    if (spotifyError) {
        activeTab.value = 'spotify'
        toast.add({
            title: 'Erreur de connexion Spotify',
            description: getSpotifyErrorMessage(spotifyError),
            color: 'error',
        })
    }

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

// Subscribe to data refresh events (for when user deletes data from settings)
const { onRefresh } = useDataRefresh()
const refreshAllMusicData = async () => {
    console.log('[Music] Refreshing all data...')
    // Clear local music state first
    clearLocalMusic()
    // Clear cloud music state
    clearCloudMusic()
    // Try to restore folder access
    await restoreFolderAccess()
    await loadPlaylists()
    await loadLikedTracksFromDb()
    // Refresh cloud music
    await fetchCloudTracks()
    await fetchCloudPlaylists()
    await fetchCloudLikedTracks()
}
onMounted(() => {
    const unsubscribe = onRefresh('music', refreshAllMusicData)
    onUnmounted(() => unsubscribe())
})

watch(spotifyAuthenticated, (isAuth) => {
    if (isAuth) {
        loadSpotifyPlaylists()
    }
})

watch(spotifyWebPlaybackError, (message) => {
    if (message) {
        spotifyApiError.value = message
    }
})

watch(spotifySearchQuery, (query) => {
    if (spotifySearchDebounceTimer) {
        clearTimeout(spotifySearchDebounceTimer)
        spotifySearchDebounceTimer = null
    }

    const term = query.trim()
    if (!term) {
        spotifySearchResults.value = []
        spotifySearchError.value = ''
        spotifySearchLoading.value = false
        return
    }

    spotifySearchDebounceTimer = setTimeout(() => {
        runSpotifySearch(term)
    }, 350)
})

// Load cloud data when tab changes
watch(activeTab, async (tab) => {
    if (tab === 'upload') {
        await fetchCloudTracks()
        await fetchCloudPlaylists()
        await fetchCloudLikedTracks()
    }
})

onUnmounted(() => {
    if (spotifySearchDebounceTimer) {
        clearTimeout(spotifySearchDebounceTimer)
        spotifySearchDebounceTimer = null
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
                            <div
                                class="mb-4 rounded-lg border border-green-500/30 bg-green-600/10 px-4 py-3"
                            >
                                <div class="flex items-center justify-between gap-3">
                                    <p class="text-sm text-green-200">
                                        Bonjour
                                        <span class="font-semibold text-white">
                                            {{ spotifyProfile?.display_name || spotifyProfile?.id || 'Spotify user' }}
                                        </span>
                                        , ton compte Spotify est connecté.
                                    </p>
                                    <UButton
                                        size="xs"
                                        color="neutral"
                                        variant="outline"
                                        label="Déconnecter"
                                        @click="disconnectSpotify"
                                    />
                                </div>
                            </div>

                            <div
                                v-if="spotifyApiError"
                                class="mb-4 rounded-lg border border-red-500/30 bg-red-600/10 px-4 py-3"
                            >
                                <p class="text-sm text-red-200">{{ spotifyApiError }}</p>
                            </div>

                            <h1 class="text-4xl font-bold text-white mb-6 text-center">
                                {{ t('music.hero.yourMusic') }}
                            </h1>
                            <div class="flex justify-center">
                                <UInput
                                    v-model="spotifySearchQuery"
                                    icon="i-heroicons-magnifying-glass"
                                    size="lg"
                                    placeholder="Rechercher un titre Spotify..."
                                    class="w-full max-w-3xl"
                                />
                            </div>
                        </div>

                        <div v-if="spotifyLoading" class="flex items-center justify-center py-20">
                            <UIcon
                                name="i-heroicons-arrow-path"
                                class="w-12 h-12 text-castium-green animate-spin"
                            />
                        </div>

                        <div v-else class="space-y-12">
                            <section v-if="spotifySearchQuery.trim().length > 0" class="space-y-4">
                                <h2 class="text-2xl font-bold text-white text-center">
                                    Résultats Spotify
                                </h2>

                                <div
                                    v-if="spotifySearchLoading"
                                    class="flex items-center justify-center py-8"
                                >
                                    <UIcon
                                        name="i-heroicons-arrow-path"
                                        class="w-8 h-8 text-castium-green animate-spin"
                                    />
                                </div>

                                <div
                                    v-else-if="spotifySearchError"
                                    class="rounded-lg border border-red-500/30 bg-red-600/10 px-4 py-3"
                                >
                                    <p class="text-sm text-red-200">{{ spotifySearchError }}</p>
                                </div>

                                <div
                                    v-else-if="spotifySearchResults.length > 0"
                                    class="space-y-2 rounded-lg border border-gray-700 bg-gray-800/30 p-3"
                                >
                                    <div
                                        v-for="track in spotifySearchResults"
                                        :key="track.id"
                                        class="flex items-center gap-3 rounded-md p-2 hover:bg-gray-700/40 transition-colors"
                                    >
                                        <button
                                            class="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                                            :disabled="!track.id"
                                            @click="track.id && handlePlaySpotifySearchTrack(track.id)"
                                        >
                                            <UIcon name="i-heroicons-play-solid" class="w-4 h-4 ml-0.5" />
                                        </button>

                                        <img
                                            v-if="track.album?.images?.[2]?.url || track.album?.images?.[0]?.url"
                                            :src="track.album?.images?.[2]?.url || track.album?.images?.[0]?.url"
                                            :alt="track.name"
                                            class="w-10 h-10 rounded object-cover"
                                        />

                                        <div class="min-w-0 flex-1">
                                            <p class="text-white text-sm truncate">
                                                {{ track.name || 'Titre inconnu' }}
                                            </p>
                                            <p class="text-gray-400 text-xs truncate">
                                                {{
                                                    (track.artists || [])
                                                        .map((a) => a.name)
                                                        .join(', ') || 'Artiste inconnu'
                                                }}
                                            </p>
                                        </div>

                                        <button
                                            class="px-2 py-1 rounded border border-gray-600 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                            :disabled="!track.id"
                                            @click="handleQueueSpotifySearchTrack(track)"
                                        >
                                            Ajouter file
                                        </button>

                                        <span
                                            v-if="!track.id"
                                            class="text-[11px] text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded px-2 py-0.5"
                                        >
                                            Non lisible
                                        </span>
                                    </div>
                                </div>

                                <div
                                    v-else
                                    class="rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-6 text-center"
                                >
                                    <p class="text-gray-300 text-sm">Aucun titre trouvé.</p>
                                </div>
                            </section>

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

                            <section v-if="spotifySelectedPlaylistName" class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <h2 class="text-2xl font-bold text-white">
                                        {{ spotifySelectedPlaylistName }}
                                    </h2>
                                    <span class="text-sm text-gray-400">
                                        {{ filteredSpotifyPlaylistTracks.length }} titres
                                    </span>
                                </div>

                                <div
                                    v-if="spotifyPlaylistLoading"
                                    class="flex items-center justify-center py-8"
                                >
                                    <UIcon
                                        name="i-heroicons-arrow-path"
                                        class="w-8 h-8 text-castium-green animate-spin"
                                    />
                                </div>

                                <div
                                    v-else-if="filteredSpotifyPlaylistTracks.length > 0"
                                    class="space-y-2 rounded-lg border border-gray-700 bg-gray-800/30 p-3"
                                >
                                    <div
                                        v-for="(item, index) in filteredSpotifyPlaylistTracks"
                                        :key="item?.track?.id || index"
                                        class="flex items-center gap-3 rounded-md p-2 hover:bg-gray-700/40 transition-colors"
                                    >
                                        <button
                                            class="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                                            :disabled="!item?.track?.id"
                                            @click="item?.track?.id && handlePlaySpotifyTrack(item.track.id)"
                                        >
                                            <UIcon name="i-heroicons-play-solid" class="w-4 h-4 ml-0.5" />
                                        </button>

                                        <img
                                            v-if="item?.track?.album?.images?.[2]?.url || item?.track?.album?.images?.[0]?.url"
                                            :src="
                                                item?.track?.album?.images?.[2]?.url ||
                                                item?.track?.album?.images?.[0]?.url
                                            "
                                            :alt="item?.track?.name"
                                            class="w-10 h-10 rounded object-cover"
                                        />

                                        <div class="min-w-0 flex-1">
                                            <p class="text-white text-sm truncate">
                                                {{ item?.track?.name || 'Titre inconnu' }}
                                            </p>
                                            <p class="text-gray-400 text-xs truncate">
                                                {{
                                                    (item?.track?.artists || [])
                                                        .map((a) => a.name)
                                                        .join(', ') || 'Artiste inconnu'
                                                }}
                                            </p>
                                        </div>

                                        <span
                                            v-if="!item?.track?.id"
                                            class="text-[11px] text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded px-2 py-0.5"
                                        >
                                            Non lisible
                                        </span>
                                    </div>
                                </div>
                            </section>

                            <section
                                v-if="
                                    !spotifyApiError &&
                                    !spotifySelectedPlaylistName &&
                                    spotifyUserPlaylists.length === 0 &&
                                    spotifyFeaturedPlaylists.length === 0
                                "
                                class="rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-6 text-center"
                            >
                                <p class="text-gray-300 text-sm">
                                    Connecté, mais aucune playlist à afficher pour le moment.
                                </p>
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
    </div>
</template>
