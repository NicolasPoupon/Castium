/**
 * Composable for IPTV channel management
 * Supports category and language-based loading from iptv-org
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

// Types
export interface IPTVChannel {
    id: string
    name: string
    logo: string
    group: string
    url: string
    tvgId?: string
    isFavorite: boolean
}

export interface IPTVCategory {
    id: string
    name: string
    code: string
    count: number
    icon: string
}

export interface IPTVLanguage {
    id: string
    name: string
    code: string
    count: number
    flag?: string
}

interface IPTVState {
    channels: IPTVChannel[]
    favorites: IPTVChannel[]
    favoritesLoaded: boolean
    loading: boolean
    error: string | null
    currentChannel: IPTVChannel | null
    isPlaying: boolean
    searchQuery: string
    selectedCategory: string | null
    selectedLanguage: string | null
    viewMode: 'browse' | 'channels'
}

interface UseIPTVReturn {
    // State
    channels: Ref<IPTVChannel[]>
    favorites: Ref<IPTVChannel[]>
    loading: Ref<boolean>
    error: Ref<string | null>
    currentChannel: Ref<IPTVChannel | null>
    isPlaying: Ref<boolean>
    searchQuery: Ref<string>
    selectedCategory: Ref<string | null>
    selectedLanguage: Ref<string | null>
    viewMode: Ref<'browse' | 'channels'>

    // Data
    categories: IPTVCategory[]
    languages: IPTVLanguage[]

    // Computed
    filteredChannels: ComputedRef<IPTVChannel[]>

    // Actions
    loadFavorites: () => Promise<void>
    loadChannelsByCategory: (categoryCode: string) => Promise<void>
    loadChannelsByLanguage: (languageCode: string) => Promise<void>
    playChannel: (channel: IPTVChannel) => void
    stopPlayback: () => void
    toggleFavorite: (channel: IPTVChannel) => Promise<void>
    setSearchQuery: (query: string) => void
    goBackToBrowse: () => void
}

// Base URL for iptv-org playlists
const IPTV_BASE_URL = 'https://iptv-org.github.io/iptv'

// Categories with icons
const CATEGORIES: IPTVCategory[] = [
    { id: 'general', name: 'General', code: 'general', count: 2467, icon: '📺' },
    { id: 'entertainment', name: 'Entertainment', code: 'entertainment', count: 653, icon: '🎭' },
    { id: 'news', name: 'News', code: 'news', count: 932, icon: '📰' },
    { id: 'religious', name: 'Religious', code: 'religious', count: 740, icon: '🕊️' },
    { id: 'music', name: 'Music', code: 'music', count: 643, icon: '🎵' },
    { id: 'movies', name: 'Movies', code: 'movies', count: 412, icon: '🎬' },
    { id: 'sports', name: 'Sports', code: 'sports', count: 317, icon: '⚽' },
    { id: 'kids', name: 'Kids', code: 'kids', count: 257, icon: '🧸' },
    { id: 'series', name: 'Series', code: 'series', count: 221, icon: '📽️' },
    { id: 'education', name: 'Education', code: 'education', count: 185, icon: '📚' },
    { id: 'documentary', name: 'Documentary', code: 'documentary', count: 122, icon: '🎥' },
    { id: 'culture', name: 'Culture', code: 'culture', count: 170, icon: '🏛️' },
    { id: 'lifestyle', name: 'Lifestyle', code: 'lifestyle', count: 100, icon: '🌿' },
    { id: 'comedy', name: 'Comedy', code: 'comedy', count: 81, icon: '😂' },
    { id: 'business', name: 'Business', code: 'business', count: 75, icon: '💼' },
    { id: 'animation', name: 'Animation', code: 'animation', count: 62, icon: '🎨' },
    { id: 'family', name: 'Family', code: 'family', count: 54, icon: '👨‍👩‍👧‍👦' },
    { id: 'classic', name: 'Classic', code: 'classic', count: 51, icon: '📼' },
    { id: 'outdoor', name: 'Outdoor', code: 'outdoor', count: 46, icon: '🏕️' },
    { id: 'travel', name: 'Travel', code: 'travel', count: 43, icon: '✈️' },
    { id: 'cooking', name: 'Cooking', code: 'cooking', count: 32, icon: '🍳' },
    { id: 'science', name: 'Science', code: 'science', count: 24, icon: '🔬' },
    { id: 'auto', name: 'Auto', code: 'auto', count: 19, icon: '🚗' },
    { id: 'weather', name: 'Weather', code: 'weather', count: 16, icon: '🌤️' },
    { id: 'shop', name: 'Shop', code: 'shop', count: 84, icon: '🛒' },
    { id: 'relax', name: 'Relax', code: 'relax', count: 4, icon: '🧘' },
]

// Languages with flags
const LANGUAGES: IPTVLanguage[] = [
    { id: 'eng', name: 'English', code: 'eng', count: 2379, flag: '🇬🇧' },
    { id: 'spa', name: 'Spanish', code: 'spa', count: 1756, flag: '🇪🇸' },
    { id: 'fra', name: 'French', code: 'fra', count: 509, flag: '🇫🇷' },
    { id: 'rus', name: 'Russian', code: 'rus', count: 359, flag: '🇷🇺' },
    { id: 'ara', name: 'Arabic', code: 'ara', count: 351, flag: '🇸🇦' },
    { id: 'ita', name: 'Italian', code: 'ita', count: 343, flag: '🇮🇹' },
    { id: 'deu', name: 'German', code: 'deu', count: 326, flag: '🇩🇪' },
    { id: 'hin', name: 'Hindi', code: 'hin', count: 268, flag: '🇮🇳' },
    { id: 'por', name: 'Portuguese', code: 'por', count: 257, flag: '🇵🇹' },
    { id: 'tur', name: 'Turkish', code: 'tur', count: 235, flag: '🇹🇷' },
    { id: 'zho', name: 'Chinese', code: 'zho', count: 227, flag: '🇨🇳' },
    { id: 'fas', name: 'Persian', code: 'fas', count: 224, flag: '🇮🇷' },
    { id: 'nld', name: 'Dutch', code: 'nld', count: 183, flag: '🇳🇱' },
    { id: 'ind', name: 'Indonesian', code: 'ind', count: 168, flag: '🇮🇩' },
    { id: 'ell', name: 'Greek', code: 'ell', count: 115, flag: '🇬🇷' },
    { id: 'hun', name: 'Hungarian', code: 'hun', count: 104, flag: '🇭🇺' },
    { id: 'ron', name: 'Romanian', code: 'ron', count: 107, flag: '🇷🇴' },
    { id: 'kor', name: 'Korean', code: 'kor', count: 90, flag: '🇰🇷' },
    { id: 'pol', name: 'Polish', code: 'pol', count: 89, flag: '🇵🇱' },
]

// Singleton state
const state = ref<IPTVState>({
    channels: [],
    favorites: [],
    favoritesLoaded: false,
    loading: false,
    error: null,
    currentChannel: null,
    isPlaying: false,
    searchQuery: '',
    selectedCategory: null,
    selectedLanguage: null,
    viewMode: 'browse'
})

// Parse M3U playlist
function parseM3U(content: string, favoriteIds: Set<string>): IPTVChannel[] {
    const lines = content.split('\n')
    const channels: IPTVChannel[] = []

    let currentInfo: Partial<IPTVChannel> = {}

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (line.startsWith('#EXTINF:')) {
            // Extract tvg-name
            const nameMatch = line.match(/tvg-name="([^"]*)"/)
            // Extract tvg-logo
            const logoMatch = line.match(/tvg-logo="([^"]*)"/)
            // Extract tvg-id
            const tvgIdMatch = line.match(/tvg-id="([^"]*)"/)
            // Extract group-title
            const groupMatch = line.match(/group-title="([^"]*)"/)
            // Extract display name (after the comma)
            const displayNameMatch = line.match(/,([^,]+)$/)

            const name = nameMatch?.[1] || displayNameMatch?.[1] || 'Unknown'
            const id = `${name}-${i}`.replace(/[^a-zA-Z0-9-]/g, '_')

            currentInfo = {
                id,
                name: name.replace(/\s*[ⓈⓎⓉⒼ]\s*/g, '').trim(),
                logo: logoMatch?.[1] || '',
                group: groupMatch?.[1] || 'Uncategorized',
                tvgId: tvgIdMatch?.[1],
                isFavorite: favoriteIds.has(id)
            }
        } else if (line && !line.startsWith('#') && currentInfo.name) {
            currentInfo.url = line

            if (currentInfo.url && currentInfo.name) {
                channels.push(currentInfo as IPTVChannel)
            }

            currentInfo = {}
        }
    }

    return channels
}

export function useIPTV(): UseIPTVReturn {
    const supabase = useSupabase()
    const { user } = useAuth()

    // Load favorites from Supabase
    const loadFavorites = async (): Promise<void> => {
        if (!user.value || state.value.favoritesLoaded) return

        try {
            const { data, error } = await supabase
                .from('iptv_favorites')
                .select('channel_id, channel_name, channel_logo, channel_group')
                .eq('user_id', user.value.id)

            if (error) throw error

            // Reconstruct favorite channels
            state.value.favorites = (data || []).map((f: any) => ({
                id: f.channel_id,
                name: f.channel_name,
                logo: f.channel_logo || '',
                group: f.channel_group || '',
                url: '', // Will be loaded when category is selected
                isFavorite: true
            }))

            state.value.favoritesLoaded = true
            console.log(`[IPTV] Loaded ${state.value.favorites.length} favorites`)
        } catch (e) {
            console.error('[IPTV] Failed to load favorites:', e)
        }
    }

    // Load channels by category
    const loadChannelsByCategory = async (categoryCode: string): Promise<void> => {
        state.value.loading = true
        state.value.error = null
        state.value.selectedCategory = categoryCode
        state.value.selectedLanguage = null
        state.value.channels = []

        try {
            const url = `${IPTV_BASE_URL}/categories/${categoryCode}.m3u`
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(`Failed to load category: ${categoryCode}`)
            }

            const content = await response.text()
            const favoriteIds = new Set(state.value.favorites.map(f => f.id))
            state.value.channels = parseM3U(content, favoriteIds)
            state.value.viewMode = 'channels'

            console.log(`[IPTV] Loaded ${state.value.channels.length} channels from category: ${categoryCode}`)
        } catch (e: any) {
            console.error('[IPTV] Failed to load channels:', e)
            state.value.error = e.message || 'Failed to load channels'
        } finally {
            state.value.loading = false
        }
    }

    // Load channels by language
    const loadChannelsByLanguage = async (languageCode: string): Promise<void> => {
        state.value.loading = true
        state.value.error = null
        state.value.selectedLanguage = languageCode
        state.value.selectedCategory = null
        state.value.channels = []

        try {
            const url = `${IPTV_BASE_URL}/languages/${languageCode}.m3u`
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(`Failed to load language: ${languageCode}`)
            }

            const content = await response.text()
            const favoriteIds = new Set(state.value.favorites.map(f => f.id))
            state.value.channels = parseM3U(content, favoriteIds)
            state.value.viewMode = 'channels'

            console.log(`[IPTV] Loaded ${state.value.channels.length} channels from language: ${languageCode}`)
        } catch (e: any) {
            console.error('[IPTV] Failed to load channels:', e)
            state.value.error = e.message || 'Failed to load channels'
        } finally {
            state.value.loading = false
        }
    }

    // Toggle favorite status
    const toggleFavorite = async (channel: IPTVChannel): Promise<void> => {
        if (!user.value) return

        const isCurrentlyFavorite = state.value.favorites.some(f => f.id === channel.id)

        try {
            if (isCurrentlyFavorite) {
                // Remove from favorites
                await supabase
                    .from('iptv_favorites')
                    .delete()
                    .eq('user_id', user.value.id)
                    .eq('channel_id', channel.id)

                state.value.favorites = state.value.favorites.filter(f => f.id !== channel.id)
            } else {
                // Add to favorites
                await supabase
                    .from('iptv_favorites')
                    .insert({
                        user_id: user.value.id,
                        channel_id: channel.id,
                        channel_name: channel.name,
                        channel_logo: channel.logo,
                        channel_group: channel.group
                    })

                state.value.favorites.push({ ...channel, isFavorite: true })
            }

            // Update channel in list
            const idx = state.value.channels.findIndex(c => c.id === channel.id)
            if (idx !== -1) {
                state.value.channels[idx] = {
                    ...state.value.channels[idx],
                    isFavorite: !isCurrentlyFavorite
                }
            }

            // Update current channel if it's the same
            if (state.value.currentChannel?.id === channel.id) {
                state.value.currentChannel = {
                    ...state.value.currentChannel,
                    isFavorite: !isCurrentlyFavorite
                }
            }
        } catch (e) {
            console.error('[IPTV] Failed to toggle favorite:', e)
        }
    }

    // Play a channel
    const playChannel = (channel: IPTVChannel): void => {
        state.value.currentChannel = channel
        state.value.isPlaying = true
    }

    // Stop playback
    const stopPlayback = (): void => {
        state.value.currentChannel = null
        state.value.isPlaying = false
    }

    // Search
    const setSearchQuery = (query: string): void => {
        state.value.searchQuery = query
    }

    // Go back to browse mode
    const goBackToBrowse = (): void => {
        state.value.viewMode = 'browse'
        state.value.selectedCategory = null
        state.value.selectedLanguage = null
        state.value.channels = []
        state.value.searchQuery = ''
    }

    // Computed: filtered channels
    const filteredChannels = computed<IPTVChannel[]>(() => {
        let result = state.value.channels

        // Filter by search
        if (state.value.searchQuery) {
            const query = state.value.searchQuery.toLowerCase()
            result = result.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.group.toLowerCase().includes(query)
            )
        }

        return result
    })

    return {
        // State refs
        channels: computed(() => state.value.channels),
        favorites: computed(() => state.value.favorites),
        loading: computed(() => state.value.loading),
        error: computed(() => state.value.error),
        currentChannel: computed(() => state.value.currentChannel),
        isPlaying: computed(() => state.value.isPlaying),
        searchQuery: computed(() => state.value.searchQuery),
        selectedCategory: computed(() => state.value.selectedCategory),
        selectedLanguage: computed(() => state.value.selectedLanguage),
        viewMode: computed(() => state.value.viewMode),

        // Data
        categories: CATEGORIES,
        languages: LANGUAGES,

        // Computed
        filteredChannels,

        // Actions
        loadFavorites,
        loadChannelsByCategory,
        loadChannelsByLanguage,
        playChannel,
        stopPlayback,
        toggleFavorite,
        setSearchQuery,
        goBackToBrowse
    }
}
