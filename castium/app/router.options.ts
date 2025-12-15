import type { RouterConfig } from '@nuxt/schema'

// https://router.vuejs.org/api/interfaces/routeroptions.html
export default <RouterConfig>{
    scrollBehavior(to, from, savedPosition) {
        // If the hash starts with #access_token=, it's a Supabase auth redirect.
        // We should not try to scroll to it as it's not a valid selector.
        if (to.hash && to.hash.startsWith('#access_token=')) {
            return { top: 0 }
        }

        if (savedPosition) {
            return savedPosition
        }

        if (to.hash) {
            return {
                el: to.hash,
                behavior: 'smooth',
            }
        }

        return { top: 0 }
    }
}
