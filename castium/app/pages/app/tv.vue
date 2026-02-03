<script setup lang="ts">
/**
 * TV Page - Live TV Streaming with Categories and Languages
 * Browse by category or language, then view channels
 * Dynamic theme colors with modern design
 */
import Hls from 'hls.js'
import { useI18n } from '#imports'
import type { ThemeColor } from '~/composables/useTheme'

definePageMeta({
    ssr: false,
})

const { t } = useI18n()
const { colors, colorClasses } = useTheme()

// Get theme classes for TV
const themeColor = computed(() => colors.value.tv as ThemeColor)
const theme = computed(() => colorClasses[themeColor.value] || colorClasses.orange)

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

// Custom streams
const { tvStreams, loadStreams: loadCustomStreams } = useCustomStreams()
const showMyChannels = ref(false)

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
    await Promise.all([loadFavorites(), loadCustomStreams()])
})

// Subscribe to data refresh events (for when user deletes data from settings)
const { onRefresh } = useDataRefresh()
const refreshTvData = async () => {
    console.log('[TV] Refreshing all data...')
    await loadFavorites()
    await loadCustomStreams()
}
onMounted(() => {
    const unsubscribe = onRefresh('tv', refreshTvData)
    onUnmounted(() => unsubscribe())
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

// Play custom TV stream
const playCustomChannel = (stream: { id: string; name: string; url: string; logo?: string }) => {
    const channel = {
        id: `custom-${stream.id}`,
        name: stream.name,
        logo: stream.logo || '',
        group: t('tv.myChannels'),
        url: stream.url,
        isFavorite: false,
    }
    handlePlayChannel(channel)
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

// Play favorite channel - use stored URL or try to find in loaded channels
const handlePlayFavorite = async (channel: any) => {
    // If favorite has URL stored, play directly
    if (channel.url) {
        handlePlayChannel(channel)
        return
    }

    // Fallback: try to find in current channels
    const found = channels.value.find((c) => c.id === channel.id)
    if (found) {
        handlePlayChannel(found)
    } else {
        // Need to load category/language first
        playerError.value = t('tv.errors.selectCategoryFirst')
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

// Get current selection (used in channels view pill)
const currentSelection = computed(() => {
    if (selectedCategory.value) {
        const cat = categories.find((c) => c.code === selectedCategory.value)
        return {
            icon: cat?.icon || 'i-heroicons-squares-2x2',
            label: cat?.name || selectedCategory.value,
        }
    }

    if (selectedLanguage.value) {
        const lang = languages.find((l) => l.code === selectedLanguage.value)
        return {
            icon: 'i-heroicons-language',
            label: lang?.name || selectedLanguage.value,
            code: lang?.code,
        }
    }

    return null
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col theme-transition">
        <Navbar mode="app" />

        <div class="pt-20 pb-32 flex-1">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Header -->
                <div
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
                >
                    <div class="flex items-center gap-3">
                        <div
                            :class="[
                                'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-all duration-300',
                                theme.gradient,
                            ]"
                        >
                            <UIcon name="i-heroicons-tv" class="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-white">{{ t('tv.title') }}</h1>
                            <p class="text-gray-400 text-sm">{{ t('tv.subtitle') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Favorites Section (always visible at top) -->
                <div v-if="favorites.length > 0" class="mb-8">
                    <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-heart-solid" class="w-5 h-5 text-red-400" />
                        {{ t('tv.favoritesTitle') }}
                    </h2>
                    <div
                        class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700"
                    >
                        <div
                            v-for="channel in favorites"
                            :key="channel.id"
                            :class="[
                                'flex-shrink-0 w-32 bg-gray-800/40 rounded-xl p-3 cursor-pointer hover:bg-gray-800/60 transition-all border backdrop-blur-sm card-hover',
                                `border-gray-700/30 hover:${theme.border}`,
                            ]"
                            @click="handlePlayFavorite(channel)"
                        >
                            <div
                                class="w-16 h-16 mx-auto mb-2 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden"
                            >
                                <img
                                    v-if="channel.logo"
                                    :src="channel.logo"
                                    :alt="channel.name"
                                    class="w-full h-full object-cover"
                                    loading="lazy"
                                    @error="
                                        ($event.target as HTMLImageElement).style.display = 'none'
                                    "
                                />
                                <span v-else class="text-white font-bold text-lg">
                                    {{ getChannelInitials(channel.name) }}
                                </span>
                            </div>
                            <p class="text-white text-xs text-center truncate">
                                {{ channel.name }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- My Channels Section (custom streams) -->
                <div v-if="tvStreams.length > 0" class="mb-8">
                    <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-tv" :class="['w-5 h-5', theme.text]" />
                        {{ t('tv.myChannels') }}
                    </h2>
                    <div
                        class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700"
                    >
                        <div
                            v-for="stream in tvStreams"
                            :key="stream.id"
                            :class="[
                                'flex-shrink-0 w-32 bg-gray-800/40 rounded-xl p-3 cursor-pointer hover:bg-gray-800/60 transition-all border backdrop-blur-sm card-hover',
                                `border-${themeColor}-600/30 hover:${theme.border}`,
                            ]"
                            @click="playCustomChannel(stream)"
                        >
                            <div
                                :class="[
                                    'w-16 h-16 mx-auto mb-2 rounded-lg bg-gradient-to-br flex items-center justify-center overflow-hidden',
                                    `from-${themeColor}-600/30 to-${themeColor}-800/30`,
                                ]"
                            >
                                <img
                                    v-if="stream.logo"
                                    :src="stream.logo"
                                    :alt="stream.name"
                                    class="w-full h-full object-cover"
                                    loading="lazy"
                                    @error="
                                        ($event.target as HTMLImageElement).style.display = 'none'
                                    "
                                />
                                <span v-else :class="['font-bold text-lg', theme.textLight]">
                                    {{ getChannelInitials(stream.name) }}
                                </span>
                            </div>
                            <p class="text-white text-xs text-center truncate">{{ stream.name }}</p>
                        </div>
                    </div>
                </div>

                <!-- Browse Mode -->
                <div v-if="viewMode === 'browse'">
                    <!-- Tabs -->
                    <div class="flex gap-2 mb-6">
                        <button
                            :class="[
                                'px-4 py-2 rounded-lg font-medium transition-all btn-press',
                                activeTab === 'categories'
                                    ? `${theme.bg} text-white`
                                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60',
                            ]"
                            @click="activeTab = 'categories'"
                        >
                            <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4 inline mr-2" />
                            {{ t('tv.browseByCategory') }}
                        </button>
                        <button
                            :class="[
                                'px-4 py-2 rounded-lg font-medium transition-all btn-press',
                                activeTab === 'languages'
                                    ? `${theme.bg} text-white`
                                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60',
                            ]"
                            @click="activeTab = 'languages'"
                        >
                            <UIcon name="i-heroicons-language" class="w-4 h-4 inline mr-2" />
                            {{ t('tv.browseByLanguage') }}
                        </button>
                    </div>

                    <!-- Categories Grid -->
                    <div
                        v-if="activeTab === 'categories'"
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    >
                        <div
                            v-for="category in categories"
                            :key="category.id"
                            :class="[
                                'bg-gray-800/40 hover:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 cursor-pointer transition-all border group card-hover',
                                `border-gray-700/30 hover:${theme.border} hover:shadow-lg hover:shadow-${themeColor}-900/20`,
                            ]"
                            @click="loadChannelsByCategory(category.code)"
                        >
                            <div
                                :class="[
                                    `w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform icon-bounce`,
                                    `bg-${themeColor}-500/20`,
                                ]"
                            >
                                <UIcon
                                    :name="category.icon"
                                    :class="['w-6 h-6', theme.textLight]"
                                />
                            </div>
                            <h3 class="text-white font-medium text-sm">{{ category.name }}</h3>
                            <p class="text-gray-500 text-xs mt-1">
                                {{ category.count }} {{ t('tv.channelsLabel') }}
                            </p>
                        </div>
                    </div>

                    <!-- Languages Grid -->
                    <div
                        v-if="activeTab === 'languages'"
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    >
                        <div
                            v-for="lang in languages"
                            :key="lang.id"
                            :class="[
                                'bg-gray-800/40 hover:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 cursor-pointer transition-all border group card-hover',
                                `border-gray-700/30 hover:${theme.border} hover:shadow-lg hover:shadow-${themeColor}-900/20`,
                            ]"
                            @click="loadChannelsByLanguage(lang.code)"
                        >
                            <div class="flex items-center justify-between gap-2 mb-3">
                                <div
                                    :class="[
                                        `w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform icon-bounce`,
                                        `bg-${themeColor}-500/20`,
                                    ]"
                                >
                                    <UIcon
                                        name="i-heroicons-language"
                                        :class="['w-6 h-6', theme.textLight]"
                                    />
                                </div>
                                <span
                                    :class="[
                                        'text-xs font-semibold tracking-wider px-2 py-1 rounded-lg ring-1',
                                        theme.textLight,
                                        `bg-${themeColor}-500/10 ring-${themeColor}-500/20`,
                                    ]"
                                >
                                    {{ lang.code.toUpperCase() }}
                                </span>
                            </div>
                            <h3 class="text-white font-medium text-sm">{{ lang.name }}</h3>
                            <p class="text-gray-500 text-xs mt-1">
                                {{ lang.count }} {{ t('tv.channelsLabel') }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Channels View -->
                <div v-else>
                    <!-- Back button and search -->
                    <div class="flex flex-wrap gap-4 items-center mb-6">
                        <button
                            class="flex items-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-lg transition-colors btn-press"
                            @click="goBackToBrowse"
                        >
                            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
                            {{ t('tv.back') }}
                        </button>

                        <div
                            v-if="currentSelection"
                            :class="[
                                'flex items-center gap-2 px-3 py-2 rounded-lg border',
                                `bg-${themeColor}-600/20 ${theme.textLight} border-${themeColor}-600/30`,
                            ]"
                        >
                            <UIcon :name="currentSelection.icon" class="w-5 h-5" />
                            <span class="font-medium">{{ currentSelection.label }}</span>
                            <span
                                v-if="'code' in currentSelection && currentSelection.code"
                                class="text-xs opacity-80"
                            >
                                {{ currentSelection.code.toUpperCase() }}
                            </span>
                        </div>

                        <div class="relative flex-1 min-w-[200px] max-w-md">
                            <UIcon
                                name="i-heroicons-magnifying-glass"
                                class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                            />
                            <input
                                v-model="searchInput"
                                type="text"
                                :placeholder="t('tv.searchPlaceholder')"
                                :class="[
                                    'w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all',
                                    `focus:${theme.ring}`,
                                ]"
                            />
                        </div>
                    </div>

                    <!-- Loading state -->
                    <div v-if="loading" class="flex items-center justify-center py-20">
                        <div class="text-center">
                            <div
                                :class="[
                                    'w-12 h-12 border-4 border-gray-700 rounded-full animate-spin mx-auto mb-4',
                                    `border-t-${themeColor}-500`,
                                ]"
                            ></div>
                            <p class="text-gray-400">{{ t('tv.loading') }}</p>
                        </div>
                    </div>

                    <!-- Error state -->
                    <div v-else-if="error" class="text-center py-20">
                        <div
                            class="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <UIcon
                                name="i-heroicons-exclamation-circle"
                                class="w-8 h-8 text-red-400"
                            />
                        </div>
                        <p class="text-red-400 mb-4">{{ error }}</p>
                        <button
                            class="px-6 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-lg transition-colors btn-press"
                            @click="goBackToBrowse"
                        >
                            {{ t('tv.back') }}
                        </button>
                    </div>

                    <!-- Channels list -->
                    <div v-else>
                        <div class="mb-4 text-gray-400 text-sm">
                            {{
                                t('tv.channelCount', {
                                    count: filteredChannels.length,
                                    total: channels.length,
                                })
                            }}
                        </div>

                        <div v-if="filteredChannels.length === 0" class="text-center py-20">
                            <p class="text-stone-500">{{ t('tv.noChannels') }}</p>
                        </div>

                        <div
                            v-else
                            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                        >
                            <div
                                v-for="channel in filteredChannels"
                                :key="channel.id"
                                :class="[
                                    'group bg-stone-800/40 hover:bg-stone-700/60 rounded-xl p-3 cursor-pointer transition-all border card-hover',
                                    `border-stone-700/50 hover:${theme.border}`,
                                ]"
                                @click="handlePlayChannel(channel)"
                            >
                                <div
                                    class="relative aspect-video mb-2 rounded-lg bg-stone-700 flex items-center justify-center overflow-hidden"
                                >
                                    <img
                                        v-if="channel.logo"
                                        :src="channel.logo"
                                        :alt="channel.name"
                                        class="w-full h-full object-contain p-2"
                                        loading="lazy"
                                        @error="
                                            ($event.target as HTMLImageElement).style.display =
                                                'none'
                                        "
                                    />
                                    <span v-else class="text-white font-bold text-xl">
                                        {{ getChannelInitials(channel.name) }}
                                    </span>

                                    <!-- Play overlay -->
                                    <div
                                        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <UIcon
                                            name="i-heroicons-play-solid"
                                            class="w-10 h-10 text-white"
                                        />
                                    </div>

                                    <!-- Favorite button -->
                                    <button
                                        class="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity btn-press"
                                        @click.stop="toggleFavorite(channel)"
                                    >
                                        <UIcon
                                            :name="
                                                channel.isFavorite
                                                    ? 'i-heroicons-heart-solid'
                                                    : 'i-heroicons-heart'
                                            "
                                            :class="[
                                                'w-4 h-4',
                                                channel.isFavorite ? 'text-red-400' : 'text-white',
                                            ]"
                                        />
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
                    <div
                        class="relative w-full max-w-5xl bg-stone-900 rounded-2xl overflow-hidden shadow-2xl scale-fade-enter-active"
                    >
                        <!-- Close button -->
                        <button
                            class="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors btn-press"
                            @click="handleClosePlayer"
                        >
                            <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-white" />
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
                                <div
                                    :class="[
                                        'w-12 h-12 border-4 border-stone-600 rounded-full animate-spin',
                                        `border-t-${themeColor}-500`,
                                    ]"
                                ></div>
                            </div>

                            <!-- Error message -->
                            <div
                                v-if="playerError"
                                class="absolute inset-0 flex items-center justify-center bg-black/80"
                            >
                                <div class="text-center p-4">
                                    <UIcon
                                        name="i-heroicons-exclamation-circle"
                                        class="w-12 h-12 text-red-400 mx-auto mb-4"
                                    />
                                    <p class="text-red-400">{{ playerError }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Channel info bar -->
                        <div class="p-4 bg-stone-800 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-10 h-10 rounded-lg bg-stone-700 flex items-center justify-center overflow-hidden"
                                >
                                    <img
                                        v-if="currentChannel.logo"
                                        :src="currentChannel.logo"
                                        :alt="currentChannel.name"
                                        class="w-full h-full object-cover"
                                    />
                                    <span v-else class="text-white font-bold text-sm">
                                        {{ getChannelInitials(currentChannel.name) }}
                                    </span>
                                </div>
                                <div>
                                    <h3 class="text-white font-medium">
                                        {{ currentChannel.name }}
                                    </h3>
                                    <p class="text-stone-400 text-sm">{{ currentChannel.group }}</p>
                                </div>
                            </div>

                            <!-- Favorite button -->
                            <button
                                class="p-2 rounded-full hover:bg-stone-700 transition-colors btn-press"
                                @click="toggleFavorite(currentChannel)"
                            >
                                <UIcon
                                    :name="
                                        currentChannel.isFavorite
                                            ? 'i-heroicons-heart-solid'
                                            : 'i-heroicons-heart'
                                    "
                                    :class="[
                                        'w-6 h-6',
                                        currentChannel.isFavorite
                                            ? 'text-red-400'
                                            : 'text-stone-400',
                                    ]"
                                />
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
