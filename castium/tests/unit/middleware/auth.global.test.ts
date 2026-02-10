import { describe, it, expect, beforeEach, vi } from 'vitest'

let middlewareHandler: ((to: any) => Promise<any>) | null = null
vi.stubGlobal('defineNuxtRouteMiddleware', (fn: (to: any) => Promise<any>) => {
    middlewareHandler = fn
    return fn
})
vi.stubGlobal('import.meta', { server: false })

describe('auth.global middleware', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        vi.stubGlobal('navigateTo', vi.fn((path: string) => Promise.resolve({ path })))
        const mockInitAuth = vi.fn(() => Promise.resolve())
        vi.stubGlobal('useAuth', () => ({
            isAuthenticated: { value: false },
            initialized: { value: true },
            initAuth: mockInitAuth,
        }))
        await import('~/middleware/auth.global')
    })

    it('redirects to /auth/callback when on / with access_token in hash', async () => {
        const navigateTo = vi.mocked(globalThis.navigateTo as any)
        const to = { path: '/', hash: '#access_token=xyz', fullPath: '/', name: '', params: {}, query: {}, meta: {}, matched: [] }
        await middlewareHandler!(to)
        expect(navigateTo).toHaveBeenCalledWith('/auth/callback#access_token=xyz')
    })

    it('allows public routes when not logged in', async () => {
        const navigateTo = vi.mocked(globalThis.navigateTo as any)
        const to = { path: '/auth/login', hash: '', fullPath: '/auth/login', name: '', params: {}, query: {}, meta: {}, matched: [] }
        const result = await middlewareHandler!(to)
        expect(navigateTo).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
    })

    it('redirects to /auth/login when not logged in and accessing /app', async () => {
        const navigateTo = vi.mocked(globalThis.navigateTo as any)
        const to = { path: '/app/movies', hash: '', fullPath: '/app/movies', name: '', params: {}, query: {}, meta: {}, matched: [] }
        await middlewareHandler!(to)
        expect(navigateTo).toHaveBeenCalledWith('/auth/login')
    })

    it('redirects logged-in user from auth page to /app/movies', async () => {
        vi.stubGlobal('useAuth', () => ({
            isAuthenticated: { value: true },
            initialized: { value: true },
            initAuth: vi.fn(() => Promise.resolve()),
        }))
        vi.resetModules()
        middlewareHandler = null
        vi.stubGlobal('defineNuxtRouteMiddleware', (fn: (to: any) => Promise<any>) => {
            middlewareHandler = fn
            return fn
        })
        await import('~/middleware/auth.global')
        const navigateTo = vi.mocked(globalThis.navigateTo as any)
        const to = { path: '/auth/login', hash: '', fullPath: '/auth/login', name: '', params: {}, query: {}, meta: {}, matched: [] }
        await middlewareHandler!(to)
        expect(navigateTo).toHaveBeenCalledWith('/app/movies')
    })
})
