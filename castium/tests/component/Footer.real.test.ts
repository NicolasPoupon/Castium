import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Footer from '~/components/Footer.vue'

describe('Footer.vue (real component)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('useI18n', () => ({
            t: (key: string) => key,
        }))
    })

    const createWrapper = (mode: 'landing' | 'app' = 'landing') =>
        mount(Footer, {
            props: { mode },
            global: {
                stubs: {
                    UFooter: {
                        template: `
                            <footer class="u-footer">
                                <div class="left"><slot name="left" /></div>
                                <div class="center"><slot /></div>
                                <div class="right"><slot name="right" /></div>
                            </footer>
                        `,
                    },
                    UNavigationMenu: {
                        props: ['items'],
                        template: `
                            <nav class="u-nav">
                                <a
                                    v-for="item in items"
                                    :key="item.label"
                                    class="u-nav-link"
                                    :href="item.to"
                                >
                                    {{ item.label }}
                                </a>
                            </nav>
                        `,
                    },
                    UButton: {
                        props: ['to'],
                        template: '<a class="social-btn" :href="to"><slot /></a>',
                    },
                },
            },
        })

    it('renders rights text with current year', () => {
        const wrapper = createWrapper('landing')
        const currentYear = new Date().getFullYear().toString()

        expect(wrapper.text()).toContain(currentYear)
        expect(wrapper.text()).toContain('footer.rights')
    })

    it('renders documentation/support/legal links from navigation items', () => {
        const wrapper = createWrapper('landing')
        const links = wrapper.findAll('.u-nav-link')

        expect(links).toHaveLength(5)
        expect(links[0].text()).toBe('footer.links.releases')
        expect(links[1].text()).toBe('footer.links.support')
        expect(links[2].text()).toBe('footer.links.documentation')
        expect(links[3].text()).toBe('footer.links.legal')
        expect(links[4].text()).toBe('footer.links.contact')
    })

    it('shows Discord + X + GitHub buttons in landing mode', () => {
        const wrapper = createWrapper('landing')
        const buttons = wrapper.findAll('.social-btn')
        const hrefs = buttons.map((b) => b.attributes('href'))

        expect(buttons).toHaveLength(3)
        expect(hrefs).toContain('https://discord.com')
        expect(hrefs).toContain('https://x.com')
        expect(hrefs).toContain('https://github.com/NicolasPoupon/Castium')
    })

    it('hides Discord button in app mode', () => {
        const wrapper = createWrapper('app')
        const buttons = wrapper.findAll('.social-btn')
        const hrefs = buttons.map((b) => b.attributes('href'))

        expect(buttons).toHaveLength(2)
        expect(hrefs).not.toContain('https://discord.com')
        expect(hrefs).toContain('https://x.com')
        expect(hrefs).toContain('https://github.com/NicolasPoupon/Castium')
    })
})
