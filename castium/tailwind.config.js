import colors from 'tailwindcss/colors'

export default {
    content: [
        './components/**/*.{vue,js,ts}',
        './layouts/**/*.vue',
        './pages/**/*.vue',
        './app/**/*.{vue,js,ts}',
        './plugins/**/*.{js,ts}',
    ],
    theme: {
        extend: {
            colors: {
                'castium-red': colors.red[800],
                'castium-green': '#00C16A',
                'ui-text': '#E2E8F0',
                'ui-text-dimmed': '#62748E',
                'bg-grey': colors.gray[800],
                'bg-blue': '#0F172B',
            },
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
