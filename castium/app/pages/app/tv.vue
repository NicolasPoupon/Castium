<script setup lang="ts">
/**
 * TV Page - Live TV Streaming with Categories and Languages
 * Browse by category or language, then view channels
 */
import Hls from 'hls.js'
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
    categories,
    languages,
    viewMode,
    selectedCategory,
    selectedLanguage,
    loadFavorites,
    loadChannelsByCategory,
    loadChannelsByLanguage,
    playChannel,
    stopPlayback,
    toggleFavorite,
    setSearchQuery,
    goBackToBrowse,
} = useIPTV()

// Local state
const searchInput = ref('')
const videoRef = ref<HTMLVideoElement | null>(null)
const hlsInstance = ref<Hls | null>(null)
const playerError = ref<string | null>(null)
const isBuffering = ref(false)
const activeTab = ref<'categories' | 'languages'>('categories')

// Watch search input with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (val) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        setSearchQuery(val)
    }, 300)
})

// Initialize
onMounted(async () => {
    await loadFavorites()
})

// Cleanup HLS on unmount
onUnmounted(() => {
    destroyHls()
})

// Destroy HLS instance
const destroyHls = () => {
    if (hlsInstance.value) {
        hlsInstance.value.destroy()
        hlsInstance.value = null
    }
}

// Play channel
const handlePlayChannel = async (channel: any) => {
    // Check if it's an external link (YouTube, Twitch, etc.)
    if (channel.url.includes('youtube.com') || channel.url.includes('twitch.tv')) {
        playerError.value = t('tv.player.externalLink')
        window.open(channel.url, '_blank')
        return
    }

    playerError.value = null
    isBuffering.value = true
    playChannel(channel)

    await nextTick()

    if (!videoRef.value) return

    destroyHls()

    try {
        if (channel.url.includes('.m3u8')) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                })

                hlsInstance.value = hls

                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('[HLS] Error:', data)
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                playerError.value = t('tv.player.networkError')
                                hls.startLoad()
                                break
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                playerError.value = t('tv.player.mediaError')
                                hls.recoverMediaError()
                                break
                            default:
                                playerError.value = t('tv.player.fatalError')
                                destroyHls()
                                break
                        }
                    }
                })

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    isBuffering.value = false
                    videoRef.value?.play().catch(console.error)
                })

                hls.loadSource(channel.url)
                hls.attachMedia(videoRef.value)
            } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
                videoRef.value.src = channel.url
                videoRef.value.play().catch(console.error)
                isBuffering.value = false
            } else {
                playerError.value = t('tv.player.hlsNotSupported')
                isBuffering.value = false
            }
        } else {
            videoRef.value.src = channel.url
            videoRef.value.play().catch((e) => {
                console.error('[Video] Play error:', e)
                playerError.value = t('tv.player.loadError')
            })
            isBuffering.value = false
        }
    } catch (e) {
        console.error('[Player] Error:', e)
        playerError.value = t('tv.player.loadError')
        isBuffering.value = false
    }
}

// Close player
const handleClosePlayer = () => {
    destroyHls()
    if (videoRef.value) {
        videoRef.value.pause()
        videoRef.value.src = ''
    }
    stopPlayback()
}

// Play favorite channel - needs to load its category first to get URL
const handlePlayFavorite = async (channel: any) => {
    // For favorites, we need to find the channel in a loaded category
    // For now, open a search with the channel name
    if (!channel.url) {
        // Try to find in current channels
        const found = channels.value.find(c => c.id === channel.id)
        if (found) {
            handlePlayChannel(found)
        } else {
            // Need to load category/language first
            playerError.value = t('tv.errors.selectCategoryFirst')
        }
    } else {
        handlePlayChannel(channel)
    }
}

// Get channel initials for placeholder
const getChannelInitials = (name: string): string => {
    const words = name.split(' ')
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

// Get current selection label
const currentSelectionLabel = computed(() => {
    if (selectedCategory.value) {
        const cat = categories.find(c => c.code === selectedCategory.value)
        return cat ? `${cat.icon} ${cat.name}` : selectedCategory.value
    }
    if (selectedLanguage.value) {
        const lang = languages.find(l => l.code === selectedLanguage.value)
        return lang ? `${lang.flag} ${lang.name}` : selectedLanguage.value
    }
    return ''
})
</script>

<template>
    <div class="min-h-screen bg-stone-900 flex flex-col">
        <Navbar mode="app" />

        <div class="pt-20 pb-32 flex-1">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-900/50">
                            <svg class="w-6 h-6 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-white">{{ t('tv.title') }}</h1>
                            <p class="text-stone-400 text-sm">{{ t('tv.subtitle') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Favorites Section (always visible at top) -->
                <div v-if="favorites.length > 0" class="mb-8">
                    <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                        {{ t('tv.favoritesTitle') }}
                    </h2>
                    <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-700">
                        <div
                            v-for="channel in favorites"
                            :key="channel.id"
                            class="flex-shrink-0 w-32 bg-stone-800/50 rounded-xl p-3 cursor-pointer hover:bg-stone-700/50 transition-all border border-stone-700/50 hover:border-amber-600/50"
                            @click="handlePlayFavorite(channel)"
                        >
                            <div class="w-16 h-16 mx-auto mb-2 rounded-lg bg-stone-700 flex items-center justify-center overflow-hidden">
                                <img
                                    v-if="channel.logo"
                                    :src="channel.logo"
                                    :alt="channel.name"
                                    class="w-full h-full object-cover"
                                    loading="lazy"
                                    @error="($event.target as HTMLImageElement).style.display = 'none'"
                                />
                                <span v-else class="text-white font-bold text-lg">{{ getChannelInitials(channel.name) }}</span>
                            </div>
                            <p class="text-white text-xs text-center truncate">{{ channel.name }}</p>
                        </div>
                    </div>
                </div>

                <!-- Browse Mode -->
                <div v-if="viewMode === 'browse'">
                    <!-- Tabs -->
                    <div class="flex gap-2 mb-6">
                        <button
                            :class="[
                                'px-4 py-2 rounded-lg font-medium transition-all',
                                activeTab === 'categories'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            ]"
                            @click="activeTab = 'categories'"
                        >
                            {{ t('tv.browseByCategory') }}
                        </button>
                        <button
                            :class="[
                                'px-4 py-2 rounded-lg font-medium transition-all',
                                activeTab === 'languages'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            ]"
                            @click="activeTab = 'languages'"
                        >
                            {{ t('tv.browseByLanguage') }}
                        </button>
                    </div>

                    <!-- Categories Grid -->
                    <div v-if="activeTab === 'categories'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        <div
                            v-for="category in categories"
                            :key="category.id"
                            class="bg-stone-800/50 hover:bg-stone-700/70 rounded-2xl p-4 cursor-pointer transition-all border border-stone-700/50 hover:border-amber-600/50 hover:shadow-lg hover:shadow-amber-900/20 group"
                            @click="loadChannelsByCategory(category.code)"
                        >
                            <div class="text-4xl mb-3 group-hover:scale-110 transition-transform">{{ category.icon }}</div>
                            <h3 class="text-white font-medium text-sm">{{ category.name }}</h3>
                            <p class="text-stone-500 text-xs mt-1">{{ category.count }} {{ t('tv.channelsLabel') }}</p>
                        </div>
                    </div>

                    <!-- Languages Grid -->
                    <div v-if="activeTab === 'languages'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        <div
                            v-for="lang in languages"
                            :key="lang.id"
                            class="bg-stone-800/50 hover:bg-stone-700/70 rounded-2xl p-4 cursor-pointer transition-all border border-stone-700/50 hover:border-amber-600/50 hover:shadow-lg hover:shadow-amber-900/20 group"
                            @click="loadChannelsByLanguage(lang.code)"
                        >
                            <div class="text-4xl mb-3 group-hover:scale-110 transition-transform">{{ lang.flag }}</div>
                            <h3 class="text-white font-medium text-sm">{{ lang.name }}</h3>
                            <p class="text-stone-500 text-xs mt-1">{{ lang.count }} {{ t('tv.channelsLabel') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Channels View -->
                <div v-else>
                    <!-- Back button and search -->
                    <div class="flex flex-wrap gap-4 items-center mb-6">
                        <button
                            class="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors"
                            @click="goBackToBrowse"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {{ t('tv.back') }}
                        </button>

                        <div class="flex items-center gap-2 px-3 py-2 bg-amber-600/20 text-amber-400 rounded-lg border border-amber-600/30">
                            <span class="text-lg">{{ currentSelectionLabel.split(' ')[0] }}</span>
                            <span class="font-medium">{{ currentSelectionLabel.split(' ').slice(1).join(' ') }}</span>
                        </div>

                        <div class="relative flex-1 min-w-[200px] max-w-md">
                            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                v-model="searchInput"
                                type="text"
                                :placeholder="t('tv.searchPlaceholder')"
                                class="w-full pl-10 pr-4 py-2 bg-stone-800/50 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <!-- Loading state -->
                    <div v-if="loading" class="flex items-center justify-center py-20">
                        <div class="text-center">
                            <div class="w-12 h-12 border-4 border-stone-700 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-stone-400">{{ t('tv.loading') }}</p>
                        </div>
                    </div>

                    <!-- Error state -->
                    <div v-else-if="error" class="text-center py-20">
                        <div class="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p class="text-red-400 mb-4">{{ error }}</p>
                        <button class="px-6 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors" @click="goBackToBrowse">
                            {{ t('tv.back') }}
                        </button>
                    </div>

                    <!-- Channels list -->
                    <div v-else>
                        <div class="mb-4 text-stone-400 text-sm">
                            {{ t('tv.channelCount', { count: filteredChannels.length, total: channels.length }) }}
                        </div>

                        <div v-if="filteredChannels.length === 0" class="text-center py-20">
                            <p class="text-stone-500">{{ t('tv.noChannels') }}</p>
                        </div>

                        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            <div
                                v-for="channel in filteredChannels"
                                :key="channel.id"
                                class="group bg-stone-800/40 hover:bg-stone-700/60 rounded-xl p-3 cursor-pointer transition-all border border-stone-700/50 hover:border-amber-600/50"
                                @click="handlePlayChannel(channel)"
                            >
                                <div class="relative aspect-video mb-2 rounded-lg bg-stone-700 flex items-center justify-center overflow-hidden">
                                    <img
                                        v-if="channel.logo"
                                        :src="channel.logo"
                                        :alt="channel.name"
                                        class="w-full h-full object-contain p-2"
                                        loading="lazy"
                                        @error="($event.target as HTMLImageElement).style.display = 'none'"
                                    />
                                    <span v-else class="text-white font-bold text-xl">{{ getChannelInitials(channel.name) }}</span>

                                    <!-- Play overlay -->
                                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>

                                    <!-- Favorite button -->
                                    <button
                                        class="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        @click.stop="toggleFavorite(channel)"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            :class="channel.isFavorite ? 'text-red-400' : 'text-white'"
                                            :fill="channel.isFavorite ? 'currentColor' : 'none'"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </button>
                                </div>
                                <p class="text-white text-sm truncate">{{ channel.name }}</p>
                                <p class="text-stone-500 text-xs truncate">{{ channel.group }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Video element (hidden) -->
        <video ref="videoRef" class="hidden" playsinline />

        <!-- Now Playing Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="isPlaying && currentChannel"
                    class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    @click.self="handleClosePlayer"
                >
                    <div class="relative w-full max-w-5xl bg-stone-900 rounded-2xl overflow-hidden shadow-2xl">
                        <!-- Close button -->
                        <button
                            class="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                            @click="handleClosePlayer"
                        >
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <!-- Video container -->
                        <div class="relative aspect-video bg-black">
                            <video
                                ref="videoRef"
                                class="w-full h-full"
                                autoplay
                                playsinline
                                controls
                            />

                            <!-- Buffering indicator -->
                            <div
                                v-if="isBuffering"
                                class="absolute inset-0 flex items-center justify-center bg-black/50"
                            >
                                <div class="w-12 h-12 border-4 border-stone-600 border-t-amber-500 rounded-full animate-spin"></div>
                            </div>

                            <!-- Error message -->
                            <div
                                v-if="playerError"
                                class="absolute inset-0 flex items-center justify-center bg-black/80"
                            >
                                <div class="text-center p-4">
                                    <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p class="text-red-400">{{ playerError }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Channel info bar -->
                        <div class="p-4 bg-stone-800 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-stone-700 flex items-center justify-center overflow-hidden">
                                    <img
                                        v-if="currentChannel.logo"
                                        :src="currentChannel.logo"
                                        :alt="currentChannel.name"
                                        class="w-full h-full object-cover"
                                    />
                                    <span v-else class="text-white font-bold text-sm">{{ getChannelInitials(currentChannel.name) }}</span>
                                </div>
                                <div>
                                    <h3 class="text-white font-medium">{{ currentChannel.name }}</h3>
                                    <p class="text-stone-400 text-sm">{{ currentChannel.group }}</p>
                                </div>
                            </div>

                            <!-- Favorite button -->
                            <button
                                class="p-2 rounded-full hover:bg-stone-700 transition-colors"
                                @click="toggleFavorite(currentChannel)"
                            >
                                <svg
                                    class="w-6 h-6"
                                    :class="currentChannel.isFavorite ? 'text-red-400' : 'text-stone-400'"
                                    :fill="currentChannel.isFavorite ? 'currentColor' : 'none'"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
/* Fade animation */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
    height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
    background: #44403c;
    border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #57534e;
}
</style>
