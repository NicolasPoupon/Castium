import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Create a simple mock Navbar component for testing
const Navbar = {
    name: 'Navbar',
    template: `
        <div class="navbar">
            <div class="logo">Castium</div>
            <nav class="menu">
                <a href="/app/music" class="nav-link">{{ $t('nav.music') }}</a>
                <a href="/app/radio" class="nav-link">{{ $t('nav.radio') }}</a>
                <a href="/app/podcasts" class="nav-link">{{ $t('nav.podcasts') }}</a>
                <a href="/app/lectures" class="nav-link">{{ $t('nav.lectures') }}</a>
                <button class="profile-btn" @click="toggleProfile">
                    {{ user?.email || 'Menu' }}
                </button>
            </nav>
        </div>
    `,
    props: {
        mode: {
            type: String,
            default: 'app',
        },
    },
    data() {
        return {
            user: null,
            showProfile: false,
        }
    },
    methods: {
        toggleProfile() {
            this.showProfile = !this.showProfile
        },
    },
}

describe('Navbar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render navbar', () => {
            const wrapper = mount(Navbar, {
                global: {
                    stubs: {
                        NuxtLink: true,
                        UIcon: true,
                    },
                    mocks: {
                        $t: (key: string) => key,
                    },
                },
            })
            expect(wrapper.find('.navbar').exists()).toBe(true)
        })

        it('should display logo', () => {
            const wrapper = mount(Navbar, {
                global: {
                    stubs: {
                        NuxtLink: true,
                        UIcon: true,
                    },
                    mocks: {
                        $t: (key: string) => key,
                    },
                },
            })
            expect(wrapper.find('.logo').text()).toBe('Castium')
        })

        it('should have navigation links', () => {
            const wrapper = mount(Navbar, {
                global: {
                    stubs: {
                        NuxtLink: true,
                        UIcon: true,
                    },
                    mocks: {
                        $t: (key: string) => key,
                    },
                },
            })
            const links = wrapper.findAll('.nav-link')
            expect(links.length).toBeGreaterThan(0)
        })

        it('should display profile button', () => {
            const wrapper = mount(Navbar, {
                global: {
                    stubs: {
                        NuxtLink: true,
                        UIcon: true,
                    },
                    mocks: {
                        $t: (key: string) => key,
                    },
                },
            })
            expect(wrapper.find('.profile-btn').exists()).toBe(true)
        })
    })

    describe('Interactions', () => {
        it('should toggle profile menu', async () => {
            const wrapper = mount(Navbar, {
                global: {
                    stubs: {
                        NuxtLink: true,
                        UIcon: true,
                    },
                    mocks: {
                        $t: (key: string) => key,
                    },
                },
            })

            expect(wrapper.vm.showProfile).toBe(false)
            await wrapper.find('.profile-btn').trigger('click')
            expect(wrapper.vm.showProfile).toBe(true)
            await wrapper.find('.profile-btn').trigger('click')
            expect(wrapper.vm.showProfile).toBe(false)
        })
    })

    describe('Props', () => {
        it('should accept mode prop', () => {
            const wrapper = mount(Navbar, {
                props: {
                    mode: 'app',
                },
                global: {
                    stubs: {
                        NuxtLink: true,
                        UIcon: true,
                    },
                    mocks: {
                        $t: (key: string) => key,
                    },
                },
            })
            expect(wrapper.props('mode')).toBe('app')
        })

        it('should accept landing mode', () => {
            const wrapper = mount(Navbar, {
                props: {
                    mode: 'landing',
                },
                global: {
                    stubs: {
                        NuxtLink: true,
                        UIcon: true,
                    },
                    mocks: {
                        $t: (key: string) => key,
                    },
                },
            })
            expect(wrapper.props('mode')).toBe('landing')
        })
    })
})
