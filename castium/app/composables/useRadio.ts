/**
 * Composable for Radio station management
 * Uses radio-browser.info API with HLS streams for better CORS compatibility
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

// Types
export interface RadioStation {
    id: string
    name: string
    logo: string
    country: string
    language: string
    url: string
    isFavorite: boolean
}

// Radio Browser API response type
interface RadioBrowserStation {
    stationuuid: string
    name: string
    url_resolved: string
    favicon: string
    country: string
    countrycode: string
    language: string
    tags: string
    codec: string
    bitrate: number
    hls: number
    lastcheckok: number
    votes: number
    clickcount: number
}

interface RadioState {
    stations: RadioStation[]
    favorites: Set<string>
    loading: boolean
    error: string | null
    currentStation: RadioStation | null
    isPlaying: boolean
    searchQuery: string
    selectedCountry: string
    showFavoritesOnly: boolean
}

interface UseRadioReturn {
    // State
    stations: Ref<RadioStation[]>
    favorites: ComputedRef<RadioStation[]>
    loading: Ref<boolean>
    error: Ref<string | null>
    currentStation: Ref<RadioStation | null>
    isPlaying: Ref<boolean>
    searchQuery: Ref<string>
    selectedCountry: Ref<string>
    showFavoritesOnly: Ref<boolean>

    // Computed
    filteredStations: ComputedRef<RadioStation[]>
    countries: ComputedRef<string[]>

    // Actions
    loadStations: () => Promise<void>
    playStation: (station: RadioStation) => void
    stopPlayback: () => void
    toggleFavorite: (station: RadioStation) => Promise<void>
    setSearchQuery: (query: string) => void
    setSelectedCountry: (country: string) => void
    setShowFavoritesOnly: (show: boolean) => void
}

// Singleton state
const state = ref<RadioState>({
    stations: [],
    favorites: new Set<string>(),
    loading: false,
    error: null,
    currentStation: null,
    isPlaying: false,
    searchQuery: '',
    selectedCountry: '',
    showFavoritesOnly: false,
})

// Radio Browser API base URL (uses HLS streams which work better with CORS)
const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info'

// Transform API response to our RadioStation format
function transformStation(station: RadioBrowserStation): Omit<RadioStation, 'isFavorite'> {
    return {
        id: station.stationuuid,
        name: station.name,
        logo: station.favicon || '',
        country: station.country || 'Unknown',
        language: station.language || '',
        url: station.url_resolved || '',
    }
}

export function useRadio(): UseRadioReturn {
    const supabase = useSupabase()
    const { user } = useAuth()

    // Load stations from radio-browser.info API (HLS streams only)
    const loadStations = async (): Promise<void> => {
        if (state.value.stations.length > 0) {
            // Already loaded, just refresh favorites
            await loadFavorites()
            return
        }

        state.value.loading = true
        state.value.error = null

        try {
            // Fetch HLS radio stations from radio-browser.info
            // hls=1 filters for HLS streams which work better with CORS
            // lastcheckok=1 ensures the station is currently working
            // order=clickcount gives us the most popular stations first
            const params = new URLSearchParams({
                hidebroken: 'true',
                order: 'clickcount',
                reverse: 'true',
                limit: '500',
            })

            const response = await fetch(`${RADIO_BROWSER_API}/json/stations/search?${params}`, {
                headers: {
                    'User-Agent': 'Castium/1.0',
                },
            })

            if (!response.ok) {
                throw new Error('Failed to load radio stations from API')
            }

            const data: RadioBrowserStation[] = await response.json()

            // Filter for working stations and transform to our format
            const parsedStations = data
                .filter((s) => s.lastcheckok === 1 && s.url_resolved)
                .map(transformStation)

            // Load favorites from database
            await loadFavorites()

            // Apply favorites to stations
            state.value.stations = parsedStations.map((station) => ({
                ...station,
                isFavorite: state.value.favorites.has(station.id),
            }))

            console.log(
                `[Radio] Loaded ${state.value.stations.length} stations from radio-browser.info`
            )
        } catch (e: any) {
            console.error('[Radio] Failed to load stations:', e)
            state.value.error = e.message || 'Failed to load stations'
        } finally {
            state.value.loading = false
        }
    }

    // Load favorites from Supabase
    const loadFavorites = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error } = await supabase
                .from('radio_favorites')
                .select('station_id')
                .eq('user_id', user.value.id)

            if (error) throw error

            state.value.favorites = new Set(data?.map((f: any) => f.station_id) || [])

            // Update stations with favorite status
            state.value.stations = state.value.stations.map((station) => ({
                ...station,
                isFavorite: state.value.favorites.has(station.id),
            }))
        } catch (e) {
            console.error('[Radio] Failed to load favorites:', e)
        }
    }

    // Toggle favorite status
    const toggleFavorite = async (station: RadioStation): Promise<void> => {
        if (!user.value) return

        const isCurrentlyFavorite = state.value.favorites.has(station.id)

        try {
            if (isCurrentlyFavorite) {
                // Remove from favorites
                await supabase
                    .from('radio_favorites')
                    .delete()
                    .eq('user_id', user.value.id)
                    .eq('station_id', station.id)

                state.value.favorites.delete(station.id)
            } else {
                // Add to favorites
                await supabase.from('radio_favorites').insert({
                    user_id: user.value.id,
                    station_id: station.id,
                    station_name: station.name,
                    station_logo: station.logo,
                    station_country: station.country,
                })

                state.value.favorites.add(station.id)
            }

            // Update station in list
            const idx = state.value.stations.findIndex((s) => s.id === station.id)
            if (idx !== -1) {
                state.value.stations[idx] = {
                    ...state.value.stations[idx],
                    isFavorite: !isCurrentlyFavorite,
                }
            }

            // Update current station if it's the same
            if (state.value.currentStation?.id === station.id) {
                state.value.currentStation = {
                    ...state.value.currentStation,
                    isFavorite: !isCurrentlyFavorite,
                }
            }
        } catch (e) {
            console.error('[Radio] Failed to toggle favorite:', e)
        }
    }

    // Play a station
    const playStation = (station: RadioStation): void => {
        state.value.currentStation = station
        state.value.isPlaying = true
    }

    // Stop playback
    const stopPlayback = (): void => {
        state.value.currentStation = null
        state.value.isPlaying = false
    }

    // Search and filter
    const setSearchQuery = (query: string): void => {
        state.value.searchQuery = query
    }

    const setSelectedCountry = (country: string): void => {
        state.value.selectedCountry = country
    }

    const setShowFavoritesOnly = (show: boolean): void => {
        state.value.showFavoritesOnly = show
    }

    // Computed: filtered stations
    const filteredStations = computed<RadioStation[]>(() => {
        let result = state.value.stations

        // Filter by favorites
        if (state.value.showFavoritesOnly) {
            result = result.filter((s) => s.isFavorite)
        }

        // Filter by country
        if (state.value.selectedCountry) {
            result = result.filter((s) => s.country === state.value.selectedCountry)
        }

        // Filter by search
        if (state.value.searchQuery) {
            const query = state.value.searchQuery.toLowerCase()
            result = result.filter(
                (s) =>
                    s.name.toLowerCase().includes(query) ||
                    s.country.toLowerCase().includes(query) ||
                    s.language.toLowerCase().includes(query)
            )
        }

        return result
    })

    // Computed: unique countries
    const countries = computed<string[]>(() => {
        const countrySet = new Set(state.value.stations.map((s) => s.country))
        return Array.from(countrySet).sort()
    })

    // Computed: favorites list
    const favorites = computed<RadioStation[]>(() => {
        return state.value.stations.filter((s) => s.isFavorite)
    })

    return {
        // State refs
        stations: computed(() => state.value.stations),
        favorites,
        loading: computed(() => state.value.loading),
        error: computed(() => state.value.error),
        currentStation: computed(() => state.value.currentStation),
        isPlaying: computed(() => state.value.isPlaying),
        searchQuery: computed(() => state.value.searchQuery),
        selectedCountry: computed(() => state.value.selectedCountry),
        showFavoritesOnly: computed(() => state.value.showFavoritesOnly),

        // Computed
        filteredStations,
        countries,

        // Actions
        loadStations,
        playStation,
        stopPlayback,
        toggleFavorite,
        setSearchQuery,
        setSelectedCountry,
        setShowFavoritesOnly,
    }
}
