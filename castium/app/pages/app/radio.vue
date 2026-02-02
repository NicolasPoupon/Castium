<script setup lang="ts">
/**
 * Radio Page - Live Radio Streaming
 * Gray theme with modern radio-style design
 */
import { useI18n } from '#imports'

definePageMeta({
    ssr: false,
})

const { t } = useI18n()

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

// Local state
const searchInput = ref('')
const selectedCountry = ref('')
const showFavoritesOnly = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)
const playerError = ref<string | null>(null)
const volume = ref(80)
const isMuted = ref(false)
const isBuffering = ref(false)

// Audio visualization
const audioContext = ref<AudioContext | null>(null)
const analyser = ref<AnalyserNode | null>(null)
const dataArray = ref<Uint8Array | null>(null)
const animationId = ref<number | null>(null)
const visualBars = ref<number[]>(new Array(32).fill(0))

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
    await loadStations()
})

// Cleanup
onUnmounted(() => {
    if (animationId.value) {
        cancelAnimationFrame(animationId.value)
    }
    if (audioContext.value) {
        audioContext.value.close()
    }
})

// Play station
const handlePlayStation = async (station: any) => {
    playerError.value = null
    isBuffering.value = true
    playStation(station)

    await nextTick()

    if (!audioRef.value) return

    try {
        audioRef.value.src = station.url
        audioRef.value.volume = volume.value / 100
        audioRef.value.muted = isMuted.value

        await audioRef.value.play()
        isBuffering.value = false

        // Setup audio visualization
        setupVisualization()
    } catch (e: any) {
        console.error('[Radio] Playback error:', e)
        playerError.value = t('radio.player.loadError')
        isBuffering.value = false
    }
}

// Setup audio visualization
const setupVisualization = () => {
    if (!audioRef.value || audioContext.value) return

    try {
        audioContext.value = new AudioContext()
        analyser.value = audioContext.value.createAnalyser()
        const source = audioContext.value.createMediaElementSource(audioRef.value)

        source.connect(analyser.value)
        analyser.value.connect(audioContext.value.destination)

        analyser.value.fftSize = 64
        const bufferLength = analyser.value.frequencyBinCount
        dataArray.value = new Uint8Array(bufferLength)

        updateVisualization()
    } catch (e) {
        console.error('[Radio] Visualization error:', e)
    }
}

// Update visualization bars
const updateVisualization = () => {
    if (!analyser.value || !dataArray.value || !isPlaying.value) return

    analyser.value.getByteFrequencyData(dataArray.value)

    for (let i = 0; i < 32; i++) {
        visualBars.value[i] = dataArray.value[i] / 255 * 100
    }

    animationId.value = requestAnimationFrame(updateVisualization)
}

// Close player
const handleClosePlayer = () => {
    if (animationId.value) {
        cancelAnimationFrame(animationId.value)
    }
    if (audioRef.value) {
        audioRef.value.pause()
        audioRef.value.src = ''
    }
    stopPlayback()
    visualBars.value = new Array(32).fill(0)
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
    const gradients = [
        'from-gray-600 to-gray-800',
        'from-slate-500 to-slate-700',
        'from-zinc-500 to-zinc-700',
        'from-neutral-500 to-neutral-700',
        'from-stone-500 to-stone-700',
    ]
    const index = name.charCodeAt(0) % gradients.length
    return gradients[index]
}
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col">
        <Navbar mode="app" />

        <div class="pt-20 pb-32 flex-1">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-lg shadow-gray-900/50">
                            <svg class="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                            </svg>
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
                        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            v-model="searchInput"
                            type="text"
                            :placeholder="t('radio.searchPlaceholder')"
                            class="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <!-- Country filter -->
                    <select
                        v-model="selectedCountry"
                        class="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all min-w-[180px]"
                    >
                        <option value="">{{ t('radio.allCountries') }}</option>
                        <option v-for="country in countries" :key="country" :value="country">
                            {{ country }}
                        </option>
                    </select>

                    <!-- Favorites toggle -->
                    <button
                        :class="[
                            'px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
                            showFavoritesOnly
                                ? 'bg-gray-600 text-white border border-gray-500'
                                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50',
                        ]"
                        @click="showFavoritesOnly = !showFavoritesOnly"
                    >
                        <svg class="w-5 h-5" :class="showFavoritesOnly ? 'text-red-400' : ''" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                        {{ t('radio.favorites') }}
                        <span v-if="favorites.length" class="ml-1 px-2 py-0.5 bg-gray-500 rounded-full text-xs">
                            {{ favorites.length }}
                        </span>
                    </button>
                </div>

                <!-- Loading state -->
                <div v-if="loading" class="flex items-center justify-center py-20">
                    <div class="text-center">
                        <div class="w-12 h-12 border-4 border-gray-700 border-t-gray-400 rounded-full animate-spin mx-auto mb-4"></div>
                        <p class="text-gray-400">{{ t('radio.loading') }}</p>
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
                    <button class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors" @click="loadStations">
                        {{ t('radio.retry') }}
                    </button>
                </div>

                <!-- Stations grid -->
                <div v-else>
                    <!-- Stats -->
                    <div class="mb-6 text-gray-400 text-sm">
                        {{ t('radio.stationCount', { count: filteredStations.length, total: stations.length }) }}
                    </div>

                    <!-- Empty state -->
                    <div v-if="filteredStations.length === 0" class="text-center py-20">
                        <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                            </svg>
                        </div>
                        <p class="text-gray-500">{{ t('radio.noStations') }}</p>
                    </div>

                    <!-- Stations list (modern radio style) -->
                    <div v-else class="grid gap-3">
                        <div
                            v-for="station in filteredStations"
                            :key="station.id"
                            class="group relative bg-gray-800/40 hover:bg-gray-800/70 rounded-2xl p-4 transition-all duration-300 cursor-pointer border border-gray-700/50 hover:border-gray-600"
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
                                            @error="($event.target as HTMLImageElement).style.display = 'none'"
                                        />
                                    </div>
                                    <div
                                        v-else
                                        :class="['w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold', getStationGradient(station.name)]"
                                    >
                                        {{ getStationInitials(station.name) }}
                                    </div>

                                    <!-- Play indicator -->
                                    <div class="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>

                                <!-- Station info -->
                                <div class="flex-1 min-w-0">
                                    <h3 class="text-white font-medium truncate">{{ station.name }}</h3>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-gray-500 text-sm truncate">{{ station.country }}</span>
                                        <span v-if="station.language" class="text-gray-600">•</span>
                                        <span v-if="station.language" class="text-gray-500 text-sm truncate">{{ station.language }}</span>
                                    </div>
                                </div>

                                <!-- Favorite button -->
                                <button
                                    class="p-2 rounded-full hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                                    @click.stop="toggleFavorite(station)"
                                >
                                    <svg
                                        class="w-5 h-5"
                                        :class="station.isFavorite ? 'text-red-400' : 'text-gray-400'"
                                        :fill="station.isFavorite ? 'currentColor' : 'none'"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </button>

                                <!-- Live indicator -->
                                <div class="flex items-center gap-1.5 px-2 py-1 bg-gray-700/50 rounded-full">
                                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span class="text-xs text-gray-400 uppercase font-medium">Live</span>
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
                    class="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 shadow-2xl"
                >
                    <div class="max-w-7xl mx-auto px-4 py-3">
                        <div class="flex items-center gap-4">
                            <!-- Station info -->
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                    v-if="currentStation.logo"
                                    class="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0"
                                >
                                    <img :src="currentStation.logo" :alt="currentStation.name" class="w-full h-full object-cover" />
                                </div>
                                <div v-else :class="['w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0', getStationGradient(currentStation.name)]">
                                    {{ getStationInitials(currentStation.name) }}
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-white font-medium truncate">{{ currentStation.name }}</h3>
                                    <p class="text-gray-400 text-sm truncate">{{ currentStation.country }}</p>
                                </div>
                            </div>

                            <!-- Visualization bars -->
                            <div class="hidden md:flex items-end gap-0.5 h-8">
                                <div
                                    v-for="(bar, i) in visualBars.slice(0, 16)"
                                    :key="i"
                                    class="w-1 bg-gradient-to-t from-gray-500 to-gray-300 rounded-full transition-all duration-75"
                                    :style="{ height: `${Math.max(4, bar * 0.32)}px` }"
                                ></div>
                            </div>

                            <!-- Buffering indicator -->
                            <div v-if="isBuffering" class="flex items-center gap-2 text-gray-400">
                                <div class="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin"></div>
                                <span class="text-sm">Buffering...</span>
                            </div>

                            <!-- Volume control -->
                            <div class="hidden sm:flex items-center gap-2">
                                <button class="p-2 rounded-full hover:bg-gray-700 transition-colors" @click="toggleMute">
                                    <svg v-if="isMuted || volume === 0" class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                    <svg v-else class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    :value="volume"
                                    class="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-400"
                                    @input="handleVolumeChange"
                                />
                            </div>

                            <!-- Favorite button -->
                            <button class="p-2 rounded-full hover:bg-gray-700 transition-colors" @click="toggleFavorite(currentStation)">
                                <svg
                                    class="w-5 h-5"
                                    :class="currentStation.isFavorite ? 'text-red-400' : 'text-gray-400'"
                                    :fill="currentStation.isFavorite ? 'currentColor' : 'none'"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>

                            <!-- Close button -->
                            <button class="p-2 rounded-full hover:bg-gray-700 transition-colors" @click="handleClosePlayer">
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
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
    transition: transform 0.3s ease, opacity 0.3s ease;
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
