import { createClient } from '@supabase/supabase-js'

let supabase: ReturnType<typeof createClient> | null = null

export const useSupabase = () => {
    if (!supabase) {
        const config = useRuntimeConfig()
        const supabaseUrl = config.public.supabaseUrl
        const supabaseAnonKey = config.public.supabaseAnonKey

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error(
                'Supabase configuration is missing. Please set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
            )
        }

        supabase = createClient(supabaseUrl, supabaseAnonKey)
    }
    return supabase
}

