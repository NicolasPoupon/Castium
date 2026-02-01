/**
 * Composable for IPTV channel management
 * Parses M3U playlist, handles favorites, and provides streaming
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

interface IPTVState {
    channels: IPTVChannel[]
    favorites: Set<string>
    loading: boolean
    error: string | null
    currentChannel: IPTVChannel | null
    isPlaying: boolean
    searchQuery: string
    selectedGroup: string
    showFavoritesOnly: boolean
}

interface UseIPTVReturn {
    // State
    channels: Ref<IPTVChannel[]>
    favorites: ComputedRef<IPTVChannel[]>
    loading: Ref<boolean>
    error: Ref<string | null>
    currentChannel: Ref<IPTVChannel | null>
    isPlaying: Ref<boolean>
    searchQuery: Ref<string>
    selectedGroup: Ref<string>
    showFavoritesOnly: Ref<boolean>

    // Computed
    filteredChannels: ComputedRef<IPTVChannel[]>
    groups: ComputedRef<string[]>

    // Actions
    loadChannels: () => Promise<void>
    playChannel: (channel: IPTVChannel) => void
    stopPlayback: () => void
    toggleFavorite: (channel: IPTVChannel) => Promise<void>
    setSearchQuery: (query: string) => void
    setSelectedGroup: (group: string) => void
    setShowFavoritesOnly: (show: boolean) => void
}

// Singleton state
const state = ref<IPTVState>({
    channels: [],
    favorites: new Set<string>(),
    loading: false,
    error: null,
    currentChannel: null,
    isPlaying: false,
    searchQuery: '',
    selectedGroup: '',
    showFavoritesOnly: false
})

// Parse M3U playlist
function parseM3U(content: string): Omit<IPTVChannel, 'isFavorite'>[] {
    const lines = content.split('\n')
    const channels: Omit<IPTVChannel, 'isFavorite'>[] = []

    let currentInfo: Partial<Omit<IPTVChannel, 'isFavorite'>> = {}

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (line.startsWith('#EXTINF:')) {
            // Parse channel info
            // Format: #EXTINF:-1 tvg-name="Name" tvg-logo="URL" tvg-id="ID" group-title="Group",Display Name

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

            currentInfo = {
                id: `${name}-${i}`.replace(/[^a-zA-Z0-9-]/g, '_'),
                name: name.replace(/\s*[ⓈⓎⓉⒼ]\s*/g, '').trim(), // Remove special markers
                logo: logoMatch?.[1] || '',
                group: groupMatch?.[1] || 'Uncategorized',
                tvgId: tvgIdMatch?.[1]
            }
        } else if (line && !line.startsWith('#') && currentInfo.name) {
            // This is the URL line
            currentInfo.url = line

            if (currentInfo.url && currentInfo.name) {
                channels.push(currentInfo as Omit<IPTVChannel, 'isFavorite'>)
            }

            currentInfo = {}
        }
    }

    return channels
}

export function useIPTV(): UseIPTVReturn {
    const supabase = useSupabase()
    const { user } = useAuth()

    // Load channels from the M3U file
    const loadChannels = async (): Promise<void> => {
        if (state.value.channels.length > 0) {
            // Already loaded, just refresh favorites
            await loadFavorites()
            return
        }

        state.value.loading = true
        state.value.error = null

        try {
            // Fetch the IPTV file
            const response = await fetch('/iptv/iptv.txt')
            if (!response.ok) {
                throw new Error('Failed to load IPTV playlist')
            }

            const content = await response.text()
            const parsedChannels = parseM3U(content)

            // Load favorites from database
            await loadFavorites()

            // Apply favorites to channels
            state.value.channels = parsedChannels.map(channel => ({
                ...channel,
                isFavorite: state.value.favorites.has(channel.id)
            }))

            console.log(`[IPTV] Loaded ${state.value.channels.length} channels`)
        } catch (e: any) {
            console.error('[IPTV] Failed to load channels:', e)
            state.value.error = e.message || 'Failed to load channels'
        } finally {
            state.value.loading = false
        }
    }

    // Load favorites from Supabase
    const loadFavorites = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error } = await supabase
                .from('iptv_favorites')
                .select('channel_id')
                .eq('user_id', user.value.id)

            if (error) throw error

            state.value.favorites = new Set(data?.map((f: any) => f.channel_id) || [])

            // Update channels with favorite status
            state.value.channels = state.value.channels.map(channel => ({
                ...channel,
                isFavorite: state.value.favorites.has(channel.id)
            }))
        } catch (e) {
            console.error('[IPTV] Failed to load favorites:', e)
        }
    }

    // Toggle favorite status
    const toggleFavorite = async (channel: IPTVChannel): Promise<void> => {
        if (!user.value) return

        const isCurrentlyFavorite = state.value.favorites.has(channel.id)

        try {
            if (isCurrentlyFavorite) {
                // Remove from favorites
                await supabase
                    .from('iptv_favorites')
                    .delete()
                    .eq('user_id', user.value.id)
                    .eq('channel_id', channel.id)

                state.value.favorites.delete(channel.id)
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

                state.value.favorites.add(channel.id)
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

    // Search and filter
    const setSearchQuery = (query: string): void => {
        state.value.searchQuery = query
    }

    const setSelectedGroup = (group: string): void => {
        state.value.selectedGroup = group
    }

    const setShowFavoritesOnly = (show: boolean): void => {
        state.value.showFavoritesOnly = show
    }

    // Computed: filtered channels
    const filteredChannels = computed<IPTVChannel[]>(() => {
        let result = state.value.channels

        // Filter by favorites
        if (state.value.showFavoritesOnly) {
            result = result.filter(c => c.isFavorite)
        }

        // Filter by group
        if (state.value.selectedGroup) {
            result = result.filter(c => c.group === state.value.selectedGroup)
        }

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

    // Computed: unique groups
    const groups = computed<string[]>(() => {
        const groupSet = new Set(state.value.channels.map(c => c.group))
        return Array.from(groupSet).sort()
    })

    // Computed: favorites list
    const favorites = computed<IPTVChannel[]>(() => {
        return state.value.channels.filter(c => c.isFavorite)
    })

    return {
        // State refs
        channels: computed(() => state.value.channels),
        favorites,
        loading: computed(() => state.value.loading),
        error: computed(() => state.value.error),
        currentChannel: computed(() => state.value.currentChannel),
        isPlaying: computed(() => state.value.isPlaying),
        searchQuery: computed(() => state.value.searchQuery),
        selectedGroup: computed(() => state.value.selectedGroup),
        showFavoritesOnly: computed(() => state.value.showFavoritesOnly),

        // Computed
        filteredChannels,
        groups,

        // Actions
        loadChannels,
        playChannel,
        stopPlayback,
        toggleFavorite,
        setSearchQuery,
        setSelectedGroup,
        setShowFavoritesOnly
    }
}
