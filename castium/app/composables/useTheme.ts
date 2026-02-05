/**
 * Composable for managing category theme colors
 * Each category has a customizable color that persists in localStorage and Supabase
 */

import { ref, computed } from 'vue'

export interface CategoryColors {
    movies: string
    music: string
    podcasts: string
    tv: string
    radio: string
    lectures: string
    photos: string
}

// Default colors for each category
export const defaultColors: CategoryColors = {
    movies: 'red',
    music: 'green',
    podcasts: 'pink',
    tv: 'orange',
    radio: 'yellow',
    lectures: 'purple',
    photos: 'blue',
}

// Available color options
export const availableColors = [
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
] as const

export type ThemeColor = (typeof availableColors)[number]

// Tailwind color classes for each color
export const colorClasses: Record<
    ThemeColor,
    {
        bg: string
        bgLight: string
        bgDark: string
        text: string
        textLight: string
        border: string
        ring: string
        gradient: string
    }
> = {
    red: {
        bg: 'bg-red-500',
        bgLight: 'bg-red-400',
        bgDark: 'bg-red-600',
        text: 'text-red-500',
        textLight: 'text-red-400',
        border: 'border-red-500',
        ring: 'ring-red-500',
        gradient: 'from-red-500 to-red-700',
    },
    orange: {
        bg: 'bg-orange-500',
        bgLight: 'bg-orange-400',
        bgDark: 'bg-orange-600',
        text: 'text-orange-500',
        textLight: 'text-orange-400',
        border: 'border-orange-500',
        ring: 'ring-orange-500',
        gradient: 'from-orange-500 to-orange-700',
    },
    amber: {
        bg: 'bg-amber-500',
        bgLight: 'bg-amber-400',
        bgDark: 'bg-amber-600',
        text: 'text-amber-500',
        textLight: 'text-amber-400',
        border: 'border-amber-500',
        ring: 'ring-amber-500',
        gradient: 'from-amber-500 to-amber-700',
    },
    yellow: {
        bg: 'bg-yellow-500',
        bgLight: 'bg-yellow-400',
        bgDark: 'bg-yellow-600',
        text: 'text-yellow-500',
        textLight: 'text-yellow-400',
        border: 'border-yellow-500',
        ring: 'ring-yellow-500',
        gradient: 'from-yellow-500 to-yellow-700',
    },
    lime: {
        bg: 'bg-lime-500',
        bgLight: 'bg-lime-400',
        bgDark: 'bg-lime-600',
        text: 'text-lime-500',
        textLight: 'text-lime-400',
        border: 'border-lime-500',
        ring: 'ring-lime-500',
        gradient: 'from-lime-500 to-lime-700',
    },
    green: {
        bg: 'bg-green-500',
        bgLight: 'bg-green-400',
        bgDark: 'bg-green-600',
        text: 'text-green-500',
        textLight: 'text-green-400',
        border: 'border-green-500',
        ring: 'ring-green-500',
        gradient: 'from-green-500 to-green-700',
    },
    emerald: {
        bg: 'bg-emerald-500',
        bgLight: 'bg-emerald-400',
        bgDark: 'bg-emerald-600',
        text: 'text-emerald-500',
        textLight: 'text-emerald-400',
        border: 'border-emerald-500',
        ring: 'ring-emerald-500',
        gradient: 'from-emerald-500 to-emerald-700',
    },
    teal: {
        bg: 'bg-teal-500',
        bgLight: 'bg-teal-400',
        bgDark: 'bg-teal-600',
        text: 'text-teal-500',
        textLight: 'text-teal-400',
        border: 'border-teal-500',
        ring: 'ring-teal-500',
        gradient: 'from-teal-500 to-teal-700',
    },
    cyan: {
        bg: 'bg-cyan-500',
        bgLight: 'bg-cyan-400',
        bgDark: 'bg-cyan-600',
        text: 'text-cyan-500',
        textLight: 'text-cyan-400',
        border: 'border-cyan-500',
        ring: 'ring-cyan-500',
        gradient: 'from-cyan-500 to-cyan-700',
    },
    sky: {
        bg: 'bg-sky-500',
        bgLight: 'bg-sky-400',
        bgDark: 'bg-sky-600',
        text: 'text-sky-500',
        textLight: 'text-sky-400',
        border: 'border-sky-500',
        ring: 'ring-sky-500',
        gradient: 'from-sky-500 to-sky-700',
    },
    blue: {
        bg: 'bg-blue-500',
        bgLight: 'bg-blue-400',
        bgDark: 'bg-blue-600',
        text: 'text-blue-500',
        textLight: 'text-blue-400',
        border: 'border-blue-500',
        ring: 'ring-blue-500',
        gradient: 'from-blue-500 to-blue-700',
    },
    indigo: {
        bg: 'bg-indigo-500',
        bgLight: 'bg-indigo-400',
        bgDark: 'bg-indigo-600',
        text: 'text-indigo-500',
        textLight: 'text-indigo-400',
        border: 'border-indigo-500',
        ring: 'ring-indigo-500',
        gradient: 'from-indigo-500 to-indigo-700',
    },
    violet: {
        bg: 'bg-violet-500',
        bgLight: 'bg-violet-400',
        bgDark: 'bg-violet-600',
        text: 'text-violet-500',
        textLight: 'text-violet-400',
        border: 'border-violet-500',
        ring: 'ring-violet-500',
        gradient: 'from-violet-500 to-violet-700',
    },
    purple: {
        bg: 'bg-purple-500',
        bgLight: 'bg-purple-400',
        bgDark: 'bg-purple-600',
        text: 'text-purple-500',
        textLight: 'text-purple-400',
        border: 'border-purple-500',
        ring: 'ring-purple-500',
        gradient: 'from-purple-500 to-purple-700',
    },
    fuchsia: {
        bg: 'bg-fuchsia-500',
        bgLight: 'bg-fuchsia-400',
        bgDark: 'bg-fuchsia-600',
        text: 'text-fuchsia-500',
        textLight: 'text-fuchsia-400',
        border: 'border-fuchsia-500',
        ring: 'ring-fuchsia-500',
        gradient: 'from-fuchsia-500 to-fuchsia-700',
    },
    pink: {
        bg: 'bg-pink-500',
        bgLight: 'bg-pink-400',
        bgDark: 'bg-pink-600',
        text: 'text-pink-500',
        textLight: 'text-pink-400',
        border: 'border-pink-500',
        ring: 'ring-pink-500',
        gradient: 'from-pink-500 to-pink-700',
    },
    rose: {
        bg: 'bg-rose-500',
        bgLight: 'bg-rose-400',
        bgDark: 'bg-rose-600',
        text: 'text-rose-500',
        textLight: 'text-rose-400',
        border: 'border-rose-500',
        ring: 'ring-rose-500',
        gradient: 'from-rose-500 to-rose-700',
    },
}

// Singleton state
const colors = ref<CategoryColors>({ ...defaultColors })
const loaded = ref(false)

export function useTheme() {
    // Load colors from localStorage on first use
    const loadColors = () => {
        if (loaded.value) return

        try {
            const stored = localStorage.getItem('castium-theme-colors')
            if (stored) {
                const parsed = JSON.parse(stored)
                colors.value = { ...defaultColors, ...parsed }
            }
        } catch (e) {
            console.error('[Theme] Failed to load colors:', e)
        }

        loaded.value = true
    }

    // Save colors to localStorage
    const saveColors = () => {
        try {
            localStorage.setItem('castium-theme-colors', JSON.stringify(colors.value))
        } catch (e) {
            console.error('[Theme] Failed to save colors:', e)
        }
    }

    // Set color for a category
    const setColor = (category: keyof CategoryColors, color: ThemeColor) => {
        colors.value[category] = color
        saveColors()
    }

    // Reset all colors to defaults
    const resetColors = () => {
        colors.value = { ...defaultColors }
        saveColors()
    }

    // Reset single category to default
    const resetCategory = (category: keyof CategoryColors) => {
        colors.value[category] = defaultColors[category]
        saveColors()
    }

    // Get color classes for a category
    const getColorClasses = (category: keyof CategoryColors) => {
        const color = colors.value[category] as ThemeColor
        return colorClasses[color] || colorClasses.green
    }

    // Get raw color value
    const getColor = (category: keyof CategoryColors): ThemeColor => {
        return colors.value[category] as ThemeColor
    }

    // Initialize on first call
    loadColors()

    return {
        colors: computed(() => colors.value),
        setColor,
        resetColors,
        resetCategory,
        getColorClasses,
        getColor,
        availableColors,
        defaultColors,
        colorClasses,
    }
}
