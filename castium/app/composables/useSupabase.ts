import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export const useSupabase = (): SupabaseClient => {
    if (supabaseClient) {
        return supabaseClient
    }

    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const supabaseAnonKey = config.public.supabaseAnonKey

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Supabase configuration is missing. Please set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
        )
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            storageKey: 'castium-auth',
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })

    return supabaseClient
}
