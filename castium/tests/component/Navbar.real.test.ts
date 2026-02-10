import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import Navbar from '~/components/Navbar.vue'

const colorClasses = {
    green: { text: 'text-green-500', border: 'border-green-500' },
    blue: { text: 'text-blue-500', border: 'border-blue-500' },
    yellow: { text: 'text-yellow-500', border: 'border-yellow-500' },
    purple: { text: 'text-purple-500', border: 'border-purple-500' },
    pink: { text: 'text-pink-500', border: 'border-pink-500' },
    orange: { text: 'text-orange-500', border: 'border-orange-500' },
    red: { text: 'text-red-500', border: 'border-red-500' },
} as const

const colors = ref({
    movies: 'red',
    music: 'green',
    podcasts: 'pink',
    tv: 'orange',
    radio: 'yellow',
    lectures: 'purple',
    photos: 'blue',
})

describe('Navbar.vue (real component)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    const mountNavbar = ({
        path = '/app/radio',
        mode = 'app',
        userValue = {
            email: 'john.doe@example.com',
            user_metadata: { full_name: 'John Doe', avatar_url: 'https://img.example/avatar.png' },
        },
        signOutImpl = vi.fn().mockResolvedValue(undefined),
    }: {
        path?: string
        mode?: 'app' | 'landing'
        userValue?: any
        signOutImpl?: any
    } = {}) => {
        const push = vi.fn()
        const toastAdd = vi.fn()

        vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
        vi.stubGlobal('useRoute', () => ({ path }))
        vi.stubGlobal('useRouter', () => ({ push }))
        vi.stubGlobal('useAuth', () => ({ user: ref(userValue), signOut: signOutImpl }))
        vi.stubGlobal('useToast', () => ({ add: toastAdd }))
        vi.stubGlobal('useTheme', () => ({ colors, colorClasses }))

        const wrapper = mount(Navbar, {
            props: { mode },
            global: {
                mocks: {
                    $localePath: (value: string) => value,
                },
                stubs: {
                    NuxtLink: {
                        props: ['to'],
                        template: '<a class="nuxt-link" :href="to"><slot /></a>',
                    },
                    ClientOnly: {
                        template: '<div class="client-only"><slot /></div>',
                    },
                    UDropdownMenu: {
                        props: ['items'],
                        template: '<div class="dropdown"><slot /></div>',
                    },
                    UButton: {
                        props: ['to', 'label'],
                        template: '<button class="u-button" :data-to="to">{{ label }}<slot /></button>',
                    },
                    UAvatar: {
                        props: ['src', 'alt'],
                        template: '<img class="u-avatar" :src="src" :alt="alt" />',
                    },
                    UIcon: {
                        props: ['name'],
                        template: '<i class="u-icon" :data-icon="name" />',
                    },
                },
            },
        })

        return { wrapper, push, toastAdd, signOutImpl }
    }

    it('renders app tabs and marks active tab from current route', () => {
        const { wrapper } = mountNavbar({ path: '/app/radio', mode: 'app' })

        expect(wrapper.text()).toContain('navbar.selector.movies')
        expect(wrapper.text()).toContain('navbar.selector.radio')

        const radioTab = wrapper
            .findAll('.nuxt-link')
            .find((link) => link.attributes('href') === '/app/radio')

        expect(radioTab).toBeTruthy()
        expect(radioTab!.classes().join(' ')).toContain('text-white')
    })

    it('activeTab setter navigates to the selected route and ignores invalid values', async () => {
        const { wrapper, push } = mountNavbar({ path: '/app/movies', mode: 'app' })

        ;(wrapper.vm as any).activeTab = 'music'
        expect(push).toHaveBeenCalledWith('/app/music')

        ;(wrapper.vm as any).activeTab = null
        ;(wrapper.vm as any).activeTab = undefined
        ;(wrapper.vm as any).activeTab = 12 as any

        expect(push).toHaveBeenCalledTimes(1)
    })

    it('builds user identity helpers from profile metadata and email fallback', () => {
        const withName = mountNavbar({
            userValue: {
                email: 'john.doe@example.com',
                user_metadata: { full_name: 'John Doe', avatar_url: 'https://img.example/avatar.png' },
            },
        })
        expect((withName.wrapper.vm as any).userName).toBe('John Doe')
        expect((withName.wrapper.vm as any).userInitials).toBe('JD')
        expect((withName.wrapper.vm as any).userAvatar).toBe('https://img.example/avatar.png')

        const withEmailOnly = mountNavbar({
            userValue: { email: 'alice@example.com', user_metadata: { avatar_url: 'null' } },
        })
        expect((withEmailOnly.wrapper.vm as any).userName).toBe('alice')
        expect((withEmailOnly.wrapper.vm as any).userInitials).toBe('AL')
        expect((withEmailOnly.wrapper.vm as any).userAvatar).toBeNull()
    })

    it('logout menu action calls signOut and reports toast on failure', async () => {
        const failingSignOut = vi.fn().mockRejectedValue(new Error('boom'))
        const { wrapper, toastAdd } = mountNavbar({
            signOutImpl: failingSignOut,
            mode: 'app',
        })

        const logoutAction = (wrapper.vm as any).userMenuItems[1][0].onSelect
        await logoutAction()

        expect(failingSignOut).toHaveBeenCalledTimes(1)
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'navbar.user.logoutError',
                color: 'error',
            })
        )
    })

    it('renders login button in landing mode', () => {
        const { wrapper } = mountNavbar({ mode: 'landing', path: '/' })

        const buttons = wrapper.findAll('.u-button')
        expect(buttons.length).toBeGreaterThan(0)
        expect(wrapper.text()).toContain('Login')
    })
})
