import { describe, it, expect } from 'vitest'
import routerConfig from '~/router.options'

describe('router.options', () => {
    const scrollBehavior = routerConfig.scrollBehavior!
    const to = (hash?: string) => ({ hash: hash ?? '', path: '/', fullPath: '/', name: '', params: {}, query: {}, meta: {}, matched: [] })
    const from = () => ({ path: '/', fullPath: '/', name: '', params: {}, query: {}, meta: {}, matched: [] })

    it('returns { top: 0 } when hash starts with #access_token= (Supabase auth)', () => {
        const result = scrollBehavior(to('#access_token=xyz'), from(), undefined)
        expect(result).toEqual({ top: 0 })
    })

    it('returns savedPosition when provided', () => {
        const saved = { left: 0, top: 100 }
        const result = scrollBehavior(to(), from(), saved)
        expect(result).toEqual(saved)
    })

    it('returns el + behavior when to.hash is a selector', () => {
        const result = scrollBehavior(to('#section'), from(), undefined)
        expect(result).toEqual({ el: '#section', behavior: 'smooth' })
    })

    it('returns { top: 0 } when no hash and no savedPosition', () => {
        const result = scrollBehavior(to(), from(), undefined)
        expect(result).toEqual({ top: 0 })
    })
})
