import { describe, it, expect, beforeEach } from 'vitest'
import { localeRef } from '../../mocks/imports'

describe('useTmdbLanguage', () => {
    beforeEach(() => {
        localeRef.value = 'fr'
    })

    it('returns fr-FR for locale fr', async () => {
        const { useTmdbLanguage } = await import('~/composables/useTmdbLanguage')
        const { tmdbLanguage } = useTmdbLanguage()
        expect(tmdbLanguage.value).toBe('fr-FR')
    })

    it('returns pl-PL for locale pl', async () => {
        localeRef.value = 'pl'
        const { useTmdbLanguage } = await import('~/composables/useTmdbLanguage')
        const { tmdbLanguage } = useTmdbLanguage()
        expect(tmdbLanguage.value).toBe('pl-PL')
    })

    it('returns en-US for default locale', async () => {
        localeRef.value = 'en'
        const { useTmdbLanguage } = await import('~/composables/useTmdbLanguage')
        const { tmdbLanguage } = useTmdbLanguage()
        expect(tmdbLanguage.value).toBe('en-US')
    })
})
