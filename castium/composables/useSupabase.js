import { createClient } from '@supabase/supabase-js'

let supabase = null

export const useSupabase = () => {
  if (!supabase) {
    const config = useRuntimeConfig()
    supabase = createClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey
    )
  }
  return supabase
}
