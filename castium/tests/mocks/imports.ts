import { ref } from 'vue'

export const localeRef = ref('fr')
export const useI18n = () => ({ locale: localeRef })
