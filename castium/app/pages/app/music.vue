<script setup lang="ts">
import { useI18n } from '#imports'

const { t } = useI18n()
const {
    getAuthUrl,
    isAuthenticated,
    getUserPlaylists,
    getFeaturedPlaylists,
    play,
    pause,
    next,
    previous,
    search,
    getCurrentlyPlaying,
    playTrack,
    setVolume,
    seek,
} = useSpotify()

const userPlaylists = ref<any[]>([])
const featuredPlaylists = ref<any[]>([])
const isLoading = ref(false)
const isSearching = ref(false)
const searchQuery = ref('')
const searchResults = ref<any>(null)
const showSearch = ref(false)

const currentTrack = ref<any>(null)
const isPlaying = ref(false)
const progress = ref(0)
const duration = ref(0)
const pollInterval = ref<NodeJS.Timeout | null>(null)

const loadPlaylists = async () => {
    if (!isAuthenticated.value) return

    isLoading.value = true
    try {
        const [userRes, featuredRes] = await Promise.allSettled([
            getUserPlaylists(20),
            getFeaturedPlaylists(),
        ])

        if (userRes.status === 'fulfilled') {
            userPlaylists.value = userRes.value?.items ?? []
        } else {
            userPlaylists.value = []
        }

        if (featuredRes.status === 'fulfilled') {
            featuredPlaylists.value = featuredRes.value?.playlists?.items ?? []
        } else {
            featuredPlaylists.value = []
        }
    } catch (error) {
        console.error('Error loading playlists:', error)
    } finally {
        isLoading.value = false
    }
}

const pollPlaybackState = async () => {
    try {
        const state = await getCurrentlyPlaying()
        if (state?.item) {
            currentTrack.value = state.item
            isPlaying.value = state.is_playing
            progress.value = state.progress_ms || 0
            duration.value = state.item.duration_ms || 0
        }
    } catch (error) {
        console.error('Error polling playback state:', error)
    }
}

const startPolling = () => {
    if (pollInterval.value) clearInterval(pollInterval.value)
    pollInterval.value = setInterval(() => {
        if (isAuthenticated.value) {
            pollPlaybackState()
        }
    }, 1000)
}

const stopPolling = () => {
    if (pollInterval.value) {
        clearInterval(pollInterval.value)
        pollInterval.value = null
    }
}

const handleSearch = async () => {
    if (!searchQuery.value.trim()) {
        searchResults.value = null
        return
    }

    isSearching.value = true
    showSearch.value = true
    try {
        const results = await search(searchQuery.value, 'track,artist,album,playlist')
        searchResults.value = results
    } catch (error) {
        console.error('Error searching:', error)
        searchResults.value = null
    } finally {
        isSearching.value = false
    }
}

const handlePlayTrack = async (trackUri: string) => {
    try {
        await playTrack(trackUri)
        setTimeout(() => pollPlaybackState(), 500)
    } catch (error) {
        console.error('Error playing track:', error)
    }
}

const handlePlayPlaylist = async (playlistUri: string) => {
    try {
        await play(playlistUri)
        setTimeout(() => pollPlaybackState(), 500)
    } catch (error) {
        console.error('Error playing playlist:', error)
    }
}

const handlePlayClick = async () => {
    if (isPlaying.value) {
        await pause()
    } else {
        await play()
    }
    isPlaying.value = !isPlaying.value
}

const handleNextClick = async () => {
    await next()
    setTimeout(() => pollPlaybackState(), 500)
}

const handlePreviousClick = async () => {
    await previous()
    setTimeout(() => pollPlaybackState(), 500)
}

const handleSeek = async (positionMs: number) => {
    try {
        await seek(positionMs)
        progress.value = positionMs
    } catch (error) {
        console.error('Error seeking:', error)
    }
}

const handleVolumeChange = async (volume: number) => {
    try {
        await setVolume(volume)
    } catch (error) {
        console.error('Error setting volume:', error)
    }
}

const connectSpotify = () => {
    window.location.href = getAuthUrl()
}

const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = null
    showSearch.value = false
}

onMounted(() => {
    if (isAuthenticated.value) {
        loadPlaylists()
        startPolling()
    }
})

watch(isAuthenticated, (newValue) => {
    if (newValue) {
        loadPlaylists()
        startPolling()
    } else {
        stopPolling()
    }
})

onBeforeUnmount(() => {
    stopPolling()
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col">
        <Navbar mode="app" />
        <!-- <AppNav /> -->

        <div class="pt-24 pb-12">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <div
                    v-if="!isAuthenticated"
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

                <div v-else class="pb-32">
                    <div class="mb-8">
                        <h1 class="text-4xl font-bold text-white mb-6">
                            {{ t('music.hero.yourMusic') }}
                        </h1>
                        <div class="flex gap-2">
                            <div class="flex-1 max-w-2xl">
                                <UInput
                                    v-model="searchQuery"
                                    icon="i-heroicons-magnifying-glass"
                                    size="lg"
                                    placeholder="Rechercher un titre, un artiste ou un album..."
                                    @update:model-value="handleSearch"
                                    @keyup.enter="handleSearch"
                                />
                            </div>
                            <UButton
                                v-if="showSearch"
                                icon="i-heroicons-x-mark"
                                color="gray"
                                variant="ghost"
                                size="lg"
                                @click="clearSearch"
                            />
                        </div>
                    </div>

                    <div v-if="showSearch">
                        <MusicSearchResults
                            :is-loading="isSearching"
                            :search-results="searchResults"
                            @play-track="handlePlayTrack"
                            @play-playlist="handlePlayPlaylist"
                        />
                    </div>

                    <div v-else-if="isLoading" class="flex items-center justify-center py-20">
                        <UIcon
                            name="i-heroicons-arrow-path"
                            class="w-12 h-12 text-castium-green animate-spin"
                        />
                    </div>

                    <div v-else class="space-y-12">
                        <section v-if="userPlaylists.length > 0">
                            <h2 class="text-2xl font-bold text-white mb-6">
                                {{ t('music.hero.playlists') }}
                            </h2>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                <MusicPlaylistCard
                                    v-for="playlist in userPlaylists"
                                    :key="playlist.id"
                                    :playlist="playlist"
                                    @play="handlePlayPlaylist(playlist.uri)"
                                />
                            </div>
                        </section>

                        <section v-if="featuredPlaylists.length > 0">
                            <h2 class="text-2xl font-bold text-white mb-6">
                                {{ t('music.hero.recommendedPlaylists') }}
                            </h2>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                <MusicPlaylistCard
                                    v-for="playlist in featuredPlaylists"
                                    :key="playlist.id"
                                    :playlist="playlist"
                                    @play="handlePlayPlaylist(playlist.uri)"
                                />
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>

        <MusicPlayer
            :current-track="currentTrack"
            :is-playing="isPlaying"
            :progress="progress"
            :duration="duration"
            @play="handlePlayClick"
            @pause="handlePlayClick"
            @next="handleNextClick"
            @previous="handlePreviousClick"
            @seek="handleSeek"
            @volume-change="handleVolumeChange"
        />

        <Footer mode="app" />
    </div>
</template>
