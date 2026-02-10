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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4ad510bf-c1d6-40db-ba0b-8358497276ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSupabase.ts:createClient',message:'creating Supabase client',data:{},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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
