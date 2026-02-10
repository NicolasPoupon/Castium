import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({ auth: {} })),
}))

describe('useSupabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.unstubAllGlobals()
        vi.stubGlobal('useRuntimeConfig', () => ({
            public: {
                supabaseUrl: 'https://test.supabase.co',
                supabaseAnonKey: 'test-anon-key',
            },
        }))
    })

    it('returns client when config is present', async () => {
        const { useSupabase } = await import('~/composables/useSupabase')
        const client = useSupabase()
        expect(client).toBeDefined()
        expect(client.auth).toBeDefined()
        expect(createClient).toHaveBeenCalledWith(
            'https://test.supabase.co',
            'test-anon-key',
            expect.objectContaining({
                auth: expect.objectContaining({
                    persistSession: true,
                    storageKey: 'castium-auth',
                }),
            })
        )
    })

    it('returns same singleton on second call', async () => {
        const { useSupabase } = await import('~/composables/useSupabase')
        const a = useSupabase()
        const b = useSupabase()
        expect(a).toBe(b)
    })

    it('throws when supabaseUrl is missing', async () => {
        vi.resetModules()
        vi.stubGlobal('useRuntimeConfig', () => ({
            public: { supabaseUrl: '', supabaseAnonKey: 'key' },
        }))
        const { useSupabase } = await import('~/composables/useSupabase')
        expect(() => useSupabase()).toThrow(/configuration is missing/)
    })
})
