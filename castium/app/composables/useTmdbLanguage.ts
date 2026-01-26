import { useI18n } from '#imports'

export const useTmdbLanguage = () => {
    const { locale } = useI18n()

    const tmdbLanguage = computed(() => {
        switch (locale.value) {
            case 'fr':
                return 'fr-FR'
            case 'pl':
                return 'pl-PL'
            default:
                return 'en-US'
        }
    })

    return { tmdbLanguage }
}
