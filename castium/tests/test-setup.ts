import { config } from '@vue/test-utils'
import { ref, computed, watch } from 'vue'
import { vi } from 'vitest'

// Basic global config for Vue Test Utils (can be extended later)
config.global.stubs = {}

// Nuxt / auto-imports mocks so composables can run under Vitest
const stateMap = new Map<string, { value: unknown }>()
const useState = <T>(key: string, init?: () => T) => {
    if (!stateMap.has(key)) {
        stateMap.set(key, ref(init ? init() : undefined) as { value: unknown })
    }
    return stateMap.get(key) as { value: T }
}
const useRuntimeConfig = () => ({
    public: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        tmdbApiKey: 'test-tmdb-key',
    },
})
const navigateTo = vi.fn(() => Promise.resolve())
const useRouter = () => ({ push: vi.fn(), replace: vi.fn() })
const useRequestURL = () => ({ protocol: 'https:', host: 'localhost' })
const useI18n = () => ({ locale: ref('fr') })
const $fetch = vi.fn(() => Promise.resolve({}))

// Vue lifecycle (for useDataRefresh and similar)
const mountFns: (() => void)[] = []
const unmountFns: (() => void)[] = []
const onMounted = (fn: () => void) => { mountFns.push(fn) }
const onUnmounted = (fn: () => void) => { unmountFns.push(fn) }

// Expose for tests that need to run mounted callbacks
export function runMounted() {
    mountFns.forEach((f) => f())
    mountFns.length = 0
}
export function runUnmounted() {
    unmountFns.forEach((f) => f())
    unmountFns.length = 0
}

vi.stubGlobal('computed', computed)
vi.stubGlobal('watch', watch)
vi.stubGlobal('ref', ref)
vi.stubGlobal('useState', useState)
vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)
vi.stubGlobal('navigateTo', navigateTo)
vi.stubGlobal('useRouter', useRouter)
vi.stubGlobal('useRequestURL', useRequestURL)
vi.stubGlobal('useI18n', useI18n)
vi.stubGlobal('$fetch', $fetch)
vi.stubGlobal('onMounted', onMounted)
vi.stubGlobal('onUnmounted', onUnmounted)
