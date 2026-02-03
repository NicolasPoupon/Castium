/**
 * Composable for managing custom M3U8 streams (radio and TV)
 * Allows users to add their own streams with a name and URL
 */

import { ref, computed } from 'vue'

export interface CustomStream {
    id: string
    user_id: string
    type: 'radio' | 'tv'
    name: string
    url: string
    logo?: string
    created_at: string
}

interface CustomStreamsState {
    radioStreams: CustomStream[]
    tvStreams: CustomStream[]
    loading: boolean
    error: string | null
}

// Singleton state
const state = ref<CustomStreamsState>({
    radioStreams: [],
    tvStreams: [],
    loading: false,
    error: null,
})

let loaded = false

export function useCustomStreams() {
    const supabase = useSupabase()
    const { user } = useAuth()

    // Load all custom streams for current user
    const loadStreams = async (): Promise<void> => {
        if (!user.value || loaded) return

        state.value.loading = true
        state.value.error = null

        try {
            const { data, error } = await supabase
                .from('custom_streams')
                .select('*')
                .eq('user_id', user.value.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            const streams = data as CustomStream[]
            state.value.radioStreams = streams.filter((s) => s.type === 'radio')
            state.value.tvStreams = streams.filter((s) => s.type === 'tv')
            loaded = true

            console.log(
                `[CustomStreams] Loaded ${state.value.radioStreams.length} radio, ${state.value.tvStreams.length} TV streams`,
            )
        } catch (e: any) {
            console.error('[CustomStreams] Failed to load:', e)
            state.value.error = e.message
        } finally {
            state.value.loading = false
        }
    }

    // Add a new custom stream
    const addStream = async (
        type: 'radio' | 'tv',
        name: string,
        url: string,
        logo?: string,
    ): Promise<boolean> => {
        if (!user.value) return false

        try {
            const { data, error } = await supabase
                .from('custom_streams')
                .insert({
                    user_id: user.value.id,
                    type,
                    name: name.trim(),
                    url: url.trim(),
                    logo: logo?.trim() || null,
                })
                .select()
                .single()

            if (error) throw error

            const stream = data as CustomStream
            if (type === 'radio') {
                state.value.radioStreams.unshift(stream)
            } else {
                state.value.tvStreams.unshift(stream)
            }

            console.log(`[CustomStreams] Added ${type} stream: ${name}`)
            return true
        } catch (e: any) {
            console.error('[CustomStreams] Failed to add:', e)
            state.value.error = e.message
            return false
        }
    }

    // Delete a custom stream
    const deleteStream = async (id: string, type: 'radio' | 'tv'): Promise<boolean> => {
        if (!user.value) return false

        try {
            const { error } = await supabase.from('custom_streams').delete().eq('id', id)

            if (error) throw error

            // Force reactivity by creating new arrays
            if (type === 'radio') {
                state.value.radioStreams = [...state.value.radioStreams.filter((s) => s.id !== id)]
            } else {
                state.value.tvStreams = [...state.value.tvStreams.filter((s) => s.id !== id)]
            }

            console.log(`[CustomStreams] Deleted stream: ${id}`)
            return true
        } catch (e: any) {
            console.error('[CustomStreams] Failed to delete:', e)
            state.value.error = e.message
            return false
        }
    }

    // Delete all streams of a type
    const deleteAllStreams = async (type: 'radio' | 'tv'): Promise<boolean> => {
        if (!user.value) return false

        try {
            const { error } = await supabase
                .from('custom_streams')
                .delete()
                .eq('user_id', user.value.id)
                .eq('type', type)

            if (error) throw error

            if (type === 'radio') {
                state.value.radioStreams = []
            } else {
                state.value.tvStreams = []
            }

            console.log(`[CustomStreams] Deleted all ${type} streams`)
            return true
        } catch (e: any) {
            console.error('[CustomStreams] Failed to delete all:', e)
            state.value.error = e.message
            return false
        }
    }

    // Update a custom stream
    const updateStream = async (
        id: string,
        type: 'radio' | 'tv',
        updates: { name?: string; url?: string; logo?: string },
    ): Promise<boolean> => {
        if (!user.value) return false

        try {
            const { error } = await supabase
                .from('custom_streams')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            const list = type === 'radio' ? state.value.radioStreams : state.value.tvStreams
            const idx = list.findIndex((s) => s.id === id)
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...updates }
            }

            return true
        } catch (e: any) {
            console.error('[CustomStreams] Failed to update:', e)
            state.value.error = e.message
            return false
        }
    }

    // Reset loaded state (for logout)
    const reset = () => {
        state.value.radioStreams = []
        state.value.tvStreams = []
        loaded = false
    }

    return {
        // State
        radioStreams: computed(() => state.value.radioStreams),
        tvStreams: computed(() => state.value.tvStreams),
        loading: computed(() => state.value.loading),
        error: computed(() => state.value.error),

        // Actions
        loadStreams,
        addStream,
        deleteStream,
        deleteAllStreams,
        updateStream,
        reset,
    }
}
