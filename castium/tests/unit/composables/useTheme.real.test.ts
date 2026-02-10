import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('useTheme (real composable)', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns default colors and methods', async () => {
        const { useTheme } = await import('~/composables/useTheme')
        const theme = useTheme()
        expect(theme.colors).toBeDefined()
        expect(theme.setColor).toBeDefined()
        expect(theme.resetColors).toBeDefined()
        expect(theme.resetCategory).toBeDefined()
        expect(theme.getColorClasses).toBeDefined()
        expect(theme.getColor).toBeDefined()
        expect(theme.availableColors).toBeDefined()
        expect(theme.defaultColors).toBeDefined()
        expect(theme.colorClasses).toBeDefined()
    })

    it('setColor updates color and persists to localStorage', async () => {
        const { useTheme } = await import('~/composables/useTheme')
        const theme = useTheme()
        theme.setColor('music', 'blue')
        expect(theme.getColor('music')).toBe('blue')
        expect(localStorage.getItem('castium-theme-colors')).toContain('"music":"blue"')
    })

    it('resetColors restores defaults', async () => {
        const { useTheme } = await import('~/composables/useTheme')
        const theme = useTheme()
        theme.setColor('movies', 'pink')
        theme.resetColors()
        expect(theme.getColor('movies')).toBe('red')
    })

    it('resetCategory restores single category default', async () => {
        const { useTheme } = await import('~/composables/useTheme')
        const theme = useTheme()
        theme.setColor('tv', 'green')
        theme.resetCategory('tv')
        expect(theme.getColor('tv')).toBe('orange')
    })

    it('getColorClasses returns classes for category', async () => {
        const { useTheme } = await import('~/composables/useTheme')
        const theme = useTheme()
        const classes = theme.getColorClasses('movies')
        expect(classes).toBeDefined()
        expect(classes.bg).toBeDefined()
        expect(classes.text).toBeDefined()
    })

    it('loads from localStorage on first use', async () => {
        vi.resetModules()
        localStorage.setItem('castium-theme-colors', JSON.stringify({ music: 'violet' }))
        const { useTheme } = await import('~/composables/useTheme')
        const theme = useTheme()
        expect(theme.getColor('music')).toBe('violet')
    })

    it('handles invalid localStorage gracefully', async () => {
        localStorage.setItem('castium-theme-colors', 'invalid-json')
        const { useTheme } = await import('~/composables/useTheme')
        const theme = useTheme()
        expect(theme.getColor('movies')).toBeDefined()
    })
})
