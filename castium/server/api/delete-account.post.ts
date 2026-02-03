import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
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

    // Create admin client to delete the user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    // Delete the user from auth.users using admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
        console.error('[delete-account] Failed to delete user:', deleteError)
        throw createError({
            statusCode: 500,
            message: 'Failed to delete user account: ' + deleteError.message,
        })
    }

    console.log('[delete-account] User deleted successfully')
    return { success: true, message: 'User account deleted' }
})
