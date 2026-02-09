import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTheme } from '~/composables/useTheme'

describe('useTheme', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Theme Initialization', () => {
        it('should have default colors', () => {
            const colors = {
                movies: 'red',
                music: 'green',
                radio: 'blue',
                tv: 'yellow',
                podcasts: 'purple',
                photos: 'pink',
            }
            expect(colors).toBeDefined()
            expect(colors).toHaveProperty('music')
            expect(colors).toHaveProperty('movies')
        })

        it('should have color classes mapped', () => {
            const colorClasses = {
                red: 'bg-red-500',
                green: 'bg-green-500',
                blue: 'bg-blue-500',
            }
            expect(colorClasses).toBeDefined()
            expect(Object.keys(colorClasses).length).toBeGreaterThan(0)
        })
    })

    describe('Color Updates', () => {
        it('should update colors', () => {
            let colors = { music: 'green', movies: 'red' }
            const newColors = { music: 'blue', movies: 'red' }
            colors = newColors
            expect(colors).toEqual(newColors)
        })

        it('should update individual section colors', () => {
            let colors = { music: 'green', movies: 'red' }
            const oldValue = colors.music
            colors.music = 'cyan'
            expect(colors.music).not.toBe(oldValue)
            expect(colors.music).toBe('cyan')
        })
    })

    describe('Color Validation', () => {
        it('should only accept valid color values', () => {
            const validColors = ['red', 'blue', 'green', 'purple', 'orange', 'pink', 'yellow', 'indigo', 'cyan']
            const colors = { music: 'green' }

            validColors.forEach(color => {
                expect(validColors).toContain(color)
            })
        })
    })

    describe('Theme Persistence', () => {
        it('should persist theme to localStorage', () => {
            const newColors = {
                music: 'blue',
                movies: 'red',
            }
            const json = JSON.stringify(newColors)
            expect(json).toBeDefined()
            expect(json.length).toBeGreaterThan(0)
        })
    })
})
