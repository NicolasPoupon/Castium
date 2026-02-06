import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    try {
        console.log('[delete-account] API called')

        const authHeader = getHeader(event, 'authorization')

        if (!authHeader) {
            console.log('[delete-account] Missing auth header')
            throw createError({
                statusCode: 401,
                message: 'Missing authorization header',
            })
        }

        const config = useRuntimeConfig()
        const supabaseUrl = config.public.supabaseUrl
        const supabaseServiceKey = config.supabaseServiceKey

        console.log('[delete-account] Supabase URL:', supabaseUrl)
        console.log('[delete-account] Service key exists:', !!supabaseServiceKey)

        if (!supabaseServiceKey) {
            console.log('[delete-account] Service key not configured')
            throw createError({
                statusCode: 500,
                message: 'Service key not configured',
            })
        }

        if (!supabaseUrl) {
            console.log('[delete-account] Supabase URL not configured')
            throw createError({
                statusCode: 500,
                message: 'Supabase URL not configured',
            })
        }

        // Create client with user token to verify identity
        const supabaseUser = createClient(supabaseUrl, config.public.supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        })

        // Get the current user
        const {
            data: { user },
            error: userError,
        } = await supabaseUser.auth.getUser()

        if (userError || !user) {
            console.log('[delete-account] User error:', userError)
            throw createError({
                statusCode: 401,
                message: 'Invalid or expired token',
            })
        }

        console.log('[delete-account] User to delete:', user.id, user.email)

        // Create admin client to delete all user data
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })

        const userId = user.id

        // Delete all user data from all tables using admin client (bypasses RLS)
        const tables = [
            'custom_streams',
            'iptv_favorites',
            'radio_favorites',
            'local_liked_tracks',
            'local_recently_played',
            'local_playlists',
            'local_tracks',
            'cloud_liked_tracks',
            'cloud_playlists',
            'cloud_tracks',
            'local_podcasts',
            'cloud_podcasts',
            'videos',
            'profiles',
        ]

        for (const table of tables) {
            try {
                const column = table === 'profiles' ? 'id' : 'user_id'
                const { error } = await supabaseAdmin.from(table).delete().eq(column, userId)
                if (error) {
                    console.log(`[delete-account] Could not delete from ${table}:`, error.message)
                } else {
                    console.log(`[delete-account] Deleted from ${table}`)
                }
            } catch (e: any) {
                console.log(`[delete-account] Error deleting from ${table}:`, e?.message || e)
            }
        }

        // Delete the user from auth.users using admin API
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('[delete-account] Failed to delete user:', deleteError)
            throw createError({
                statusCode: 500,
                message: 'Failed to delete user account: ' + deleteError.message,
            })
        }

        console.log('[delete-account] User deleted successfully')
        return { success: true, message: 'User account deleted' }
    } catch (error: any) {
        console.error('[delete-account] Unhandled error:', error)
        // Re-throw if it's already a createError
        if (error.statusCode) {
            throw error
        }
        throw createError({
            statusCode: 500,
            message: 'Internal server error: ' + (error?.message || 'Unknown error'),
        })
    }
})
