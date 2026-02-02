<script setup lang="ts">
/**
 * TV Page - Live IPTV Streaming
 * Dark brown theme with modern design
 */
import { useI18n } from '#imports'

definePageMeta({
    ssr: false,
})

const { t } = useI18n()

const {
    channels,
    favorites,
    loading,
    error,
    currentChannel,
    isPlaying,
    filteredChannels,
    groups,
    loadChannels,
    playChannel,
    stopPlayback,
    toggleFavorite,
    setSearchQuery,
    setSelectedGroup,
    setShowFavoritesOnly,
} = useIPTV()

// Local state
const searchInput = ref('')
const selectedGroup = ref('')
const showFavoritesOnly = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const playerError = ref<string | null>(null)
const isFullscreen = ref(false)
const volume = ref(100)
const isMuted = ref(false)

// HLS.js instance
let hls: any = null

// Watch search input with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (val) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        setSearchQuery(val)
    }, 300)
})

// Watch group selection
watch(selectedGroup, (val) => {
    setSelectedGroup(val)
})

// Watch favorites filter
watch(showFavoritesOnly, (val) => {
    setShowFavoritesOnly(val)
})

// Initialize
onMounted(async () => {
    await loadChannels()
})

// Cleanup
onUnmounted(() => {
    if (hls) {
        hls.destroy()
        hls = null
    }
})

// Play channel with HLS.js
const handlePlayChannel = async (channel: any) => {
    playerError.value = null
    playChannel(channel)

    await nextTick()

    if (!videoRef.value) return

    const url = channel.url

    // Check if URL is a YouTube or Twitch link (not directly playable)
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('twitch.tv')) {
        playerError.value = t('tv.player.externalLink')
        return
    }

    // Destroy previous HLS instance
    if (hls) {
        hls.destroy()
        hls = null
    }

    // Check if HLS.js is needed and available
    if (url.includes('.m3u8')) {
        try {
            const Hls = (await import('hls.js')).default

            if (Hls.isSupported()) {
                hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                })

                hls.loadSource(url)
                hls.attachMedia(videoRef.value)

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoRef.value?.play().catch((e) => {
                        console.error('[TV] Autoplay failed:', e)
                    })
                })

                hls.on(Hls.Events.ERROR, (_: any, data: any) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                playerError.value = t('tv.player.networkError')
                                hls?.startLoad()
                                break
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                playerError.value = t('tv.player.mediaError')
                                hls?.recoverMediaError()
                                break
                            default:
                                playerError.value = t('tv.player.fatalError')
                                break
                        }
                    }
                })
            } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                videoRef.value.src = url
                videoRef.value.play().catch((e) => {
                    console.error('[TV] Autoplay failed:', e)
                })
            } else {
                playerError.value = t('tv.player.hlsNotSupported')
            }
        } catch (e) {
            console.error('[TV] HLS.js error:', e)
            playerError.value = t('tv.player.loadError')
        }
    } else {
        // Direct video URL
        videoRef.value.src = url
        videoRef.value.play().catch((e) => {
            console.error('[TV] Autoplay failed:', e)
        })
    }
}

// Close player
const handleClosePlayer = () => {
    if (hls) {
        hls.destroy()
        hls = null
    }
    if (videoRef.value) {
        videoRef.value.pause()
        videoRef.value.src = ''
    }
    stopPlayback()
    playerError.value = null
}

// Toggle fullscreen
const toggleFullscreen = async () => {
    const container = document.getElementById('tv-player-container')
    if (!container) return

    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen()
            isFullscreen.value = false
        } else {
            await container.requestFullscreen()
            isFullscreen.value = true
        }
    } catch (e) {
        console.error('[TV] Fullscreen error:', e)
    }
}

// Handle volume
const handleVolumeChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    volume.value = Number(target.value)
    if (videoRef.value) {
        videoRef.value.volume = volume.value / 100
    }
    isMuted.value = volume.value === 0
}

// Toggle mute
const toggleMute = () => {
    isMuted.value = !isMuted.value
    if (videoRef.value) {
        videoRef.value.muted = isMuted.value
    }
}

// Open external link
const openExternalLink = (url: string) => {
    window.open(url, '_blank')
}

// Format group name for display
const formatGroupName = (group: string): string => {
    return group || 'Uncategorized'
}

// Get channel initials for placeholder
const getChannelInitials = (name: string): string => {
    return name.slice(0, 2).toUpperCase()
}
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col">
        <Navbar mode="app" />

        <div class="pt-20 pb-32 flex-1">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Header -->
                <div
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-900 to-stone-800 flex items-center justify-center"
                        >
                            <svg
                                class="w-5 h-5 text-amber-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-white">
                                {{ t('tv.title') }}
                            </h1>
                            <p class="text-stone-400 text-sm">
                                {{ t('tv.subtitle') }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="flex flex-wrap gap-4 items-center">
                    <!-- Search -->
                    <div class="relative flex-1 min-w-[200px] max-w-md">
                        <svg
                            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            v-model="searchInput"
                            type="text"
                            :placeholder="t('tv.searchPlaceholder')"
                            class="w-full pl-10 pr-4 py-3 bg-stone-800/50 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-transparent transition-all"
                        />
                    </div>

                    <!-- Group filter -->
                    <select
                        v-model="selectedGroup"
                        class="px-4 py-3 bg-stone-800/50 border border-stone-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-transparent transition-all min-w-[180px]"
                    >
                        <option value="">{{ t('tv.allGroups') }}</option>
                        <option v-for="group in groups" :key="group" :value="group">
                            {{ formatGroupName(group) }}
                        </option>
                    </select>

                    <!-- Favorites toggle -->
                    <button
                        :class="[
                            'px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
                            showFavoritesOnly
                                ? 'bg-amber-900 text-amber-200 border border-amber-700'
                                : 'bg-stone-800/50 text-stone-400 border border-stone-700 hover:bg-stone-700/50',
                        ]"
                        @click="showFavoritesOnly = !showFavoritesOnly"
                    >
                        <svg
                            class="w-5 h-5"
                            :class="showFavoritesOnly ? 'text-amber-400' : ''"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"
                            />
                        </svg>
                        {{ t('tv.favorites') }}
                        <span
                            v-if="favorites.length"
                            class="ml-1 px-2 py-0.5 bg-amber-800 rounded-full text-xs"
                        >
                            {{ favorites.length }}
                        </span>
                    </button>
                </div>

                <!-- Loading state -->
                <div v-if="loading" class="flex items-center justify-center py-20">
                    <div class="text-center">
                        <div
                            class="w-12 h-12 border-4 border-amber-800 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"
                        ></div>
                        <p class="text-stone-400">{{ t('tv.loading') }}</p>
                    </div>
                </div>

                <!-- Error state -->
                <div v-else-if="error" class="text-center py-20">
                    <div
                        class="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <svg
                            class="w-8 h-8 text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <p class="text-red-400 mb-4">{{ error }}</p>
                    <button
                        class="px-6 py-2 bg-amber-800 hover:bg-amber-700 text-white rounded-lg transition-colors"
                        @click="loadChannels"
                    >
                        {{ t('tv.retry') }}
                    </button>
                </div>

                <!-- Channels grid -->
                <div v-else>
                    <!-- Stats -->
                    <div class="mb-6 text-stone-400 text-sm">
                        {{
                            t('tv.channelCount', {
                                count: filteredChannels.length,
                                total: channels.length,
                            })
                        }}
                    </div>

                    <!-- Empty state -->
                    <div v-if="filteredChannels.length === 0" class="text-center py-20">
                        <div
                            class="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <svg
                                class="w-8 h-8 text-stone-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <p class="text-stone-500">{{ t('tv.noChannels') }}</p>
                    </div>

                    <!-- Channels -->
                    <div
                        v-else
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    >
                        <div
                            v-for="channel in filteredChannels"
                            :key="channel.id"
                            class="group relative bg-stone-800/40 rounded-xl border border-stone-700/50 overflow-hidden hover:border-amber-700/50 hover:bg-stone-800/60 transition-all duration-300 cursor-pointer animate-fade-in"
                            @click="handlePlayChannel(channel)"
                        >
                            <!-- Channel logo -->
                            <div
                                class="aspect-video bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center p-4 relative overflow-hidden"
                            >
                                <img
                                    v-if="channel.logo"
                                    :src="channel.logo"
                                    :alt="channel.name"
                                    class="max-w-full max-h-full object-contain"
                                    loading="lazy"
                                    @error="
                                        ($event.target as HTMLImageElement).style.display = 'none'
                                    "
                                />
                                <div
                                    v-else
                                    class="w-16 h-16 rounded-full bg-gradient-to-br from-amber-900 to-stone-800 flex items-center justify-center text-amber-400 font-bold text-lg"
                                >
                                    {{ getChannelInitials(channel.name) }}
                                </div>

                                <!-- Play overlay -->
                                <div
                                    class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <div
                                        class="w-12 h-12 rounded-full bg-amber-800 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform"
                                    >
                                        <svg
                                            class="w-6 h-6 text-white ml-1"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>

                                <!-- Favorite button -->
                                <button
                                    class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-800"
                                    @click.stop="toggleFavorite(channel)"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        :class="
                                            channel.isFavorite ? 'text-amber-400' : 'text-white'
                                        "
                                        :fill="channel.isFavorite ? 'currentColor' : 'none'"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <!-- Channel info -->
                            <div class="p-3">
                                <h3
                                    class="text-sm font-medium text-white truncate"
                                    :title="channel.name"
                                >
                                    {{ channel.name }}
                                </h3>
                                <p class="text-xs text-stone-500 truncate mt-1">
                                    {{ formatGroupName(channel.group) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Video Player Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div
                    v-if="isPlaying && currentChannel"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    @click.self="handleClosePlayer"
                >
                    <div
                        id="tv-player-container"
                        class="relative w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl animate-modal-in"
                        :class="{ 'max-w-none h-full': isFullscreen }"
                    >
                        <!-- Header -->
                        <div
                            class="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between"
                        >
                            <div class="flex items-center gap-3">
                                <img
                                    v-if="currentChannel.logo"
                                    :src="currentChannel.logo"
                                    :alt="currentChannel.name"
                                    class="w-10 h-10 object-contain bg-stone-800 rounded-lg p-1"
                                />
                                <div>
                                    <h2 class="text-white font-semibold">
                                        {{ currentChannel.name }}
                                    </h2>
                                    <p class="text-stone-400 text-sm">
                                        {{ formatGroupName(currentChannel.group) }}
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <!-- Favorite -->
                                <button
                                    class="p-2 rounded-lg bg-stone-800/50 hover:bg-amber-800 transition-colors"
                                    @click="toggleFavorite(currentChannel)"
                                >
                                    <svg
                                        class="w-5 h-5"
                                        :class="
                                            currentChannel.isFavorite
                                                ? 'text-amber-400'
                                                : 'text-white'
                                        "
                                        :fill="currentChannel.isFavorite ? 'currentColor' : 'none'"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                        />
                                    </svg>
                                </button>

                                <!-- Fullscreen -->
                                <button
                                    class="p-2 rounded-lg bg-stone-800/50 hover:bg-amber-800 transition-colors"
                                    @click="toggleFullscreen"
                                >
                                    <svg
                                        class="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            v-if="!isFullscreen"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                        />
                                        <path
                                            v-else
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>

                                <!-- Close -->
                                <button
                                    class="p-2 rounded-lg bg-stone-800/50 hover:bg-red-800 transition-colors"
                                    @click="handleClosePlayer"
                                >
                                    <svg
                                        class="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Video -->
                        <div class="aspect-video bg-black relative">
                            <video
                                ref="videoRef"
                                class="w-full h-full"
                                controls
                                autoplay
                                playsinline
                                :muted="isMuted"
                            />

                            <!-- Error overlay -->
                            <div
                                v-if="playerError"
                                class="absolute inset-0 flex flex-col items-center justify-center bg-black/80"
                            >
                                <svg
                                    class="w-16 h-16 text-amber-500 mb-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                                <p class="text-stone-400 text-center mb-4 max-w-md px-4">
                                    {{ playerError }}
                                </p>

                                <!-- External link button for YouTube/Twitch -->
                                <button
                                    v-if="
                                        currentChannel.url.includes('youtube') ||
                                        currentChannel.url.includes('twitch')
                                    "
                                    class="px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                    @click="openExternalLink(currentChannel.url)"
                                >
                                    <svg
                                        class="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                    </svg>
                                    {{ t('tv.player.openExternal') }}
                                </button>
                            </div>
                        </div>

                        <!-- Controls footer -->
                        <div
                            class="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity"
                        >
                            <!-- Volume -->
                            <div class="flex items-center gap-2">
                                <button
                                    class="p-2 text-white hover:text-amber-400 transition-colors"
                                    @click="toggleMute"
                                >
                                    <svg
                                        v-if="isMuted"
                                        class="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                        />
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                                        />
                                    </svg>
                                    <svg
                                        v-else
                                        class="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                        />
                                    </svg>
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    :value="volume"
                                    class="w-24 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    @input="handleVolumeChange"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
/* Animations */
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes modal-in {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.animate-fade-in {
    animation: fade-in 0.4s ease-out;
}

.animate-modal-in {
    animation: modal-in 0.3s ease-out;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

/* Range slider styling */
input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #d97706;
    cursor: pointer;
}

input[type='range']::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #d97706;
    cursor: pointer;
    border: none;
}

/* Fullscreen mode */
#tv-player-container:fullscreen {
    max-width: none !important;
    border-radius: 0 !important;
}

#tv-player-container:fullscreen .aspect-video {
    aspect-ratio: auto;
    height: 100vh;
}

/* Hide scrollbar but allow scrolling */
::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: #57534e;
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: #78716c;
}
</style>
