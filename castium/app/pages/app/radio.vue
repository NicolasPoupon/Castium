<script setup lang="ts">
/**
 * Radio Page - Live Radio Streaming
 * Dynamic theme colors with modern radio-style design
 */
import { useI18n } from '#imports'
import type { ThemeColor } from '~/composables/useTheme'

definePageMeta({
    ssr: false,
})

const { t } = useI18n()
const { colors, colorClasses } = useTheme()

// Get theme classes for radio
const themeColor = computed(() => colors.value.radio as ThemeColor)
const theme = computed(() => colorClasses[themeColor.value] || colorClasses.yellow)

const {
    stations,
    favorites,
    loading,
    error,
    currentStation,
    isPlaying,
    filteredStations,
    countries,
    loadStations,
    playStation,
    stopPlayback,
    toggleFavorite,
    setSearchQuery,
    setSelectedCountry,
    setShowFavoritesOnly,
} = useRadio()

// Custom streams
const { radioStreams, loadStreams: loadCustomStreams } = useCustomStreams()
const showMyRadios = ref(false)

// Local state
const searchInput = ref('')
const selectedCountry = ref('')
const showFavoritesOnly = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)
const playerError = ref<string | null>(null)
const volume = ref(80)
const isMuted = ref(false)
const isBuffering = ref(false)

// Simple animation state (no WebAudio needed)
const animationBars = computed(() => {
    // Generate pseudo-random bars for visual effect when playing
    if (!isPlaying.value) return new Array(16).fill(4)
    return Array.from({ length: 16 }, (_, i) => 4 + Math.sin(Date.now() / 200 + i) * 12 + 8)
})

// Watch search input with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (val) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        setSearchQuery(val)
    }, 300)
})

// Watch country selection
watch(selectedCountry, (val) => {
    setSelectedCountry(val)
})

// Watch favorites filter
watch(showFavoritesOnly, (val) => {
    setShowFavoritesOnly(val)
})

// Initialize
onMounted(async () => {
    await Promise.all([loadStations(), loadCustomStreams()])
})

// Cleanup
onUnmounted(() => {
    if (audioRef.value) {
        audioRef.value.pause()
        audioRef.value.src = ''
    }
})

// Play custom stream (convert to station format)
const playCustomRadio = (stream: { id: string; name: string; url: string; logo?: string }) => {
    const station = {
        id: `custom-${stream.id}`,
        name: stream.name,
        logo: stream.logo || '',
        country: t('radio.myRadios'),
        language: '',
        url: stream.url,
        isFavorite: false,
    }
    playStation(station)
}

// Play station
const handlePlayStation = async (station: any) => {
    playerError.value = null
    isBuffering.value = true
    playStation(station)

    await nextTick()

    if (!audioRef.value) return

    try {
        // Use local proxy to avoid CORS/mixed-content issues
        const proxied = `/api/radio-proxy?url=${encodeURIComponent(station.url)}`

        // Prevent race conditions: pause previous playback before changing source
        try {
            await audioRef.value.pause()
        } catch (_e) {
            // ignore
        }

        // Reset and set crossOrigin for analyser (won't harm same-origin)
        audioRef.value.src = ''
        audioRef.value.crossOrigin = 'anonymous'
        audioRef.value.src = proxied
        audioRef.value.volume = volume.value / 100
        audioRef.value.muted = isMuted.value
        audioRef.value.load()

        await audioRef.value.play()
        // If user switched station while we loaded, don't continue
        if (currentStation?.value && currentStation.value.id !== station.id) {
            isBuffering.value = false
            return
        }

        isBuffering.value = false
    } catch (e: any) {
        // Ignore AbortError caused by rapid station switching
        if (e.name === 'AbortError') {
            isBuffering.value = false
            return
        }
        console.error('[Radio] Playback error:', e)
        playerError.value = t('radio.player.loadError')
        isBuffering.value = false
    }
}

// Close player
const handleClosePlayer = () => {
    if (audioRef.value) {
        audioRef.value.pause()
        audioRef.value.src = ''
    }
    stopPlayback()
}

// Volume change
const handleVolumeChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    volume.value = parseInt(target.value)
    if (audioRef.value) {
        audioRef.value.volume = volume.value / 100
    }
    if (volume.value > 0) {
        isMuted.value = false
    }
}

// Toggle mute
const toggleMute = () => {
    isMuted.value = !isMuted.value
    if (audioRef.value) {
        audioRef.value.muted = isMuted.value
    }
}

// Get station initials for placeholder
const getStationInitials = (name: string): string => {
    const words = name.split(' ')
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

// Get random gradient for station without logo
const getStationGradient = (name: string): string => {
    // Use theme color for gradient
    const gradients = [
        theme.value.gradient,
        'from-gray-600 to-gray-800',
        'from-slate-500 to-slate-700',
        'from-zinc-500 to-zinc-700',
        'from-neutral-500 to-neutral-700',
    ]
    const index = name.charCodeAt(0) % gradients.length
    return gradients[index]
}
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
                            <UIcon
                                name="i-heroicons-radio"
                                :class="[
                                    'w-6 h-6',
                                    theme.textLight
                                        .replace('text-', 'text-')
                                        .replace('-400', '-100'),
                                ]"
                            />
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-white">{{ t('radio.title') }}</h1>
                            <p class="text-gray-400 text-sm">{{ t('radio.subtitle') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="flex flex-wrap gap-4 items-center mb-8">
                    <!-- Search -->
                    <div class="relative flex-1 min-w-[200px] max-w-md">
                        <UIcon
                            name="i-heroicons-magnifying-glass"
                            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                        />
                        <input
                            v-model="searchInput"
                            type="text"
                            :placeholder="t('radio.searchPlaceholder')"
                            :class="[
                                'w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all',
                                `focus:${theme.ring}`,
                            ]"
                        />
                    </div>

                    <!-- Country filter -->
                    <select
                        v-model="selectedCountry"
                        :class="[
                            'px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all min-w-[180px]',
                            `focus:${theme.ring}`,
                        ]"
                    >
                        <option value="">{{ t('radio.allCountries') }}</option>
                        <option v-for="country in countries" :key="country" :value="country">
                            {{ country }}
                        </option>
                    </select>

                    <!-- Favorites toggle -->
                    <button
                        :class="[
                            'px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 btn-press',
                            showFavoritesOnly
                                ? `${theme.bg} text-white border ${theme.border}`
                                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50',
                        ]"
                        @click="showFavoritesOnly = !showFavoritesOnly"
                    >
                        <UIcon
                            name="i-heroicons-heart-solid"
                            :class="['w-5 h-5', showFavoritesOnly ? 'text-white' : 'text-red-400']"
                        />
                        {{ t('radio.favorites') }}
                        <span
                            v-if="favorites.length"
                            :class="[
                                'ml-1 px-2 py-0.5 rounded-full text-xs',
                                showFavoritesOnly ? 'bg-white/20' : 'bg-gray-500',
                            ]"
                        >
                            {{ favorites.length }}
                        </span>
                    </button>

                    <!-- My Radios toggle -->
                    <button
                        v-if="radioStreams.length > 0"
                        :class="[
                            'px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 btn-press',
                            showMyRadios
                                ? `${theme.bg} text-white border ${theme.border}`
                                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50',
                        ]"
                        @click="showMyRadios = !showMyRadios"
                    >
                        <UIcon
                            name="i-heroicons-radio"
                            :class="['w-5 h-5', showMyRadios ? 'text-white' : theme.text]"
                        />
                        {{ t('radio.myRadios') }}
                        <span class="ml-1 px-2 py-0.5 bg-gray-500 rounded-full text-xs">
                            {{ radioStreams.length }}
                        </span>
                    </button>
                </div>

                <!-- My Radios Section -->
                <div v-if="showMyRadios && radioStreams.length > 0" class="mb-8">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-radio" :class="['w-5 h-5', theme.text]" />
                        {{ t('radio.myRadios') }}
                    </h3>
                    <div class="grid gap-3">
                        <div
                            v-for="stream in radioStreams"
                            :key="stream.id"
                            :class="[
                                'group relative rounded-2xl p-4 transition-all duration-300 cursor-pointer border card-hover',
                                `bg-${themeColor}-900/20 hover:bg-${themeColor}-900/40 border-${themeColor}-700/50 hover:border-${themeColor}-600`,
                            ]"
                            @click="playCustomRadio(stream)"
                        >
                            <div class="flex items-center gap-4">
                                <div
                                    :class="[
                                        'w-14 h-14 rounded-xl flex items-center justify-center',
                                        theme.bgDark,
                                    ]"
                                >
                                    <UIcon name="i-heroicons-radio" class="w-7 h-7 text-white" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-white font-medium truncate">
                                        {{ stream.name }}
                                    </h4>
                                    <p :class="['text-sm truncate', theme.textLight]">
                                        {{ t('radio.myRadios') }}
                                    </p>
                                </div>
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div
                                        :class="[
                                            'w-10 h-10 rounded-full flex items-center justify-center',
                                            theme.bg,
                                        ]"
                                    >
                                        <UIcon
                                            name="i-heroicons-play-solid"
                                            class="w-5 h-5 text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
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
                        <p class="text-gray-400">{{ t('radio.loading') }}</p>
                    </div>
                </div>

                <!-- Error state -->
                <div v-else-if="error" class="text-center py-20">
                    <div
                        class="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <UIcon name="i-heroicons-exclamation-circle" class="w-8 h-8 text-red-400" />
                    </div>
                    <p class="text-red-400 mb-4">{{ error }}</p>
                    <button
                        :class="[
                            'px-6 py-2 text-white rounded-lg transition-colors btn-press',
                            theme.bg,
                            `hover:${theme.bgLight}`,
                        ]"
                        @click="loadStations"
                    >
                        {{ t('radio.retry') }}
                    </button>
                </div>

                <!-- Stations grid -->
                <div v-else>
                    <!-- Stats -->
                    <div class="mb-6 text-gray-400 text-sm">
                        {{
                            t('radio.stationCount', {
                                count: filteredStations.length,
                                total: stations.length,
                            })
                        }}
                    </div>

                    <!-- Empty state -->
                    <div v-if="filteredStations.length === 0" class="text-center py-20">
                        <div
                            class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <UIcon name="i-heroicons-radio" class="w-8 h-8 text-gray-500" />
                        </div>
                        <p class="text-gray-500">{{ t('radio.noStations') }}</p>
                    </div>

                    <!-- Stations list (modern radio style) -->
                    <div v-else class="grid gap-3">
                        <div
                            v-for="station in filteredStations.slice(0, 100)"
                            :key="station.id"
                            class="group relative bg-gray-800/40 hover:bg-gray-800/70 rounded-2xl p-4 transition-all duration-300 cursor-pointer border border-gray-700/50 hover:border-gray-600 card-hover"
                            @click="handlePlayStation(station)"
                        >
                            <div class="flex items-center gap-4">
                                <!-- Station logo/avatar -->
                                <div class="relative flex-shrink-0">
                                    <div
                                        v-if="station.logo"
                                        class="w-14 h-14 rounded-xl bg-gray-700 flex items-center justify-center overflow-hidden"
                                    >
                                        <img
                                            :src="station.logo"
                                            :alt="station.name"
                                            class="w-full h-full object-cover"
                                            loading="lazy"
                                            @error="
                                                ($event.target as HTMLImageElement).style.display =
                                                    'none'
                                            "
                                        />
                                    </div>
                                    <div
                                        v-else
                                        :class="[
                                            'w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold',
                                            getStationGradient(station.name),
                                        ]"
                                    >
                                        {{ getStationInitials(station.name) }}
                                    </div>

                                    <!-- Play indicator -->
                                    <div
                                        class="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <UIcon
                                            name="i-heroicons-play-solid"
                                            class="w-6 h-6 text-white"
                                        />
                                    </div>
                                </div>

                                <!-- Station info -->
                                <div class="flex-1 min-w-0">
                                    <h3 class="text-white font-medium truncate">
                                        {{ station.name }}
                                    </h3>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-gray-500 text-sm truncate">
                                            {{ station.country }}
                                        </span>
                                        <span v-if="station.language" class="text-gray-600">•</span>
                                        <span
                                            v-if="station.language"
                                            class="text-gray-500 text-sm truncate"
                                        >
                                            {{ station.language }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Favorite button -->
                                <button
                                    class="p-2 rounded-full hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 btn-press"
                                    @click.stop="toggleFavorite(station)"
                                >
                                    <UIcon
                                        :name="
                                            station.isFavorite
                                                ? 'i-heroicons-heart-solid'
                                                : 'i-heroicons-heart'
                                        "
                                        :class="[
                                            'w-5 h-5',
                                            station.isFavorite ? 'text-red-400' : 'text-gray-400',
                                        ]"
                                    />
                                </button>

                                <!-- Live indicator -->
                                <div
                                    :class="[
                                        'flex items-center gap-1.5 px-2 py-1 rounded-full',
                                        `bg-${themeColor}-500/20`,
                                    ]"
                                >
                                    <span
                                        :class="[
                                            'w-2 h-2 rounded-full animate-pulse pulse-glow',
                                            theme.bg,
                                        ]"
                                    ></span>
                                    <span
                                        :class="['text-xs uppercase font-medium', theme.textLight]"
                                    >
                                        Live
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Audio element (hidden) -->
        <audio ref="audioRef" class="hidden" />

        <!-- Now Playing Bar -->
        <Teleport to="body">
            <Transition name="slide-up">
                <div
                    v-if="isPlaying && currentStation"
                    :class="[
                        'fixed bottom-0 left-0 right-0 z-50 border-t shadow-2xl theme-transition',
                        `bg-gradient-to-r from-gray-900 via-${themeColor}-900/30 to-gray-900 border-${themeColor}-800/50`,
                    ]"
                >
                    <div class="max-w-7xl mx-auto px-4 py-3">
                        <div class="flex items-center gap-4">
                            <!-- Station info -->
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                    v-if="currentStation.logo"
                                    class="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0"
                                >
                                    <img
                                        :src="currentStation.logo"
                                        :alt="currentStation.name"
                                        class="w-full h-full object-cover"
                                    />
                                </div>
                                <div
                                    v-else
                                    :class="[
                                        'w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0',
                                        getStationGradient(currentStation.name),
                                    ]"
                                >
                                    {{ getStationInitials(currentStation.name) }}
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-white font-medium truncate">
                                        {{ currentStation.name }}
                                    </h3>
                                    <p class="text-gray-400 text-sm truncate">
                                        {{ currentStation.country }}
                                    </p>
                                </div>
                            </div>

                            <!-- Animated equalizer bars (CSS only, no WebAudio) -->
                            <div v-if="isPlaying" class="hidden md:flex items-end gap-0.5 h-8">
                                <div
                                    v-for="i in 16"
                                    :key="i"
                                    :class="[
                                        'w-1 rounded-full animate-pulse',
                                        `bg-gradient-to-t ${theme.gradient}`,
                                    ]"
                                    :style="{
                                        height: `${8 + (i % 4) * 4}px`,
                                        animationDelay: `${i * 50}ms`,
                                    }"
                                ></div>
                            </div>

                            <!-- Buffering indicator -->
                            <div v-if="isBuffering" class="flex items-center gap-2 text-gray-400">
                                <div
                                    :class="[
                                        'w-4 h-4 border-2 border-gray-500 rounded-full animate-spin',
                                        `border-t-${themeColor}-400`,
                                    ]"
                                ></div>
                                <span class="text-sm">Buffering...</span>
                            </div>

                            <!-- Volume control -->
                            <div class="hidden sm:flex items-center gap-2">
                                <button
                                    class="p-2 rounded-full hover:bg-gray-700 transition-colors btn-press"
                                    @click="toggleMute"
                                >
                                    <UIcon
                                        v-if="isMuted || volume === 0"
                                        name="i-heroicons-speaker-x-mark"
                                        class="w-5 h-5 text-gray-400"
                                    />
                                    <UIcon
                                        v-else
                                        name="i-heroicons-speaker-wave"
                                        class="w-5 h-5 text-gray-400"
                                    />
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    :value="volume"
                                    :class="[
                                        'w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer',
                                        `accent-${themeColor}-400`,
                                    ]"
                                    @input="handleVolumeChange"
                                />
                            </div>

                            <!-- Favorite button -->
                            <button
                                class="p-2 rounded-full hover:bg-gray-700 transition-colors btn-press"
                                @click="toggleFavorite(currentStation)"
                            >
                                <UIcon
                                    :name="
                                        currentStation.isFavorite
                                            ? 'i-heroicons-heart-solid'
                                            : 'i-heroicons-heart'
                                    "
                                    :class="[
                                        'w-5 h-5',
                                        currentStation.isFavorite
                                            ? 'text-red-400'
                                            : 'text-gray-400',
                                    ]"
                                />
                            </button>

                            <!-- Close button -->
                            <button
                                class="p-2 rounded-full hover:bg-gray-700 transition-colors btn-press"
                                @click="handleClosePlayer"
                            >
                                <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <!-- Error message -->
                        <div v-if="playerError" class="mt-2 text-red-400 text-sm text-center">
                            {{ playerError }}
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
/* Slide up animation */
.slide-up-enter-active,
.slide-up-leave-active {
    transition:
        transform 0.3s ease,
        opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}

/* Range slider styling */
input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #9ca3af;
    cursor: pointer;
}

input[type='range']::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #9ca3af;
    cursor: pointer;
    border: none;
}
</style>
