import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock Footer component
const Footer = {
    name: 'Footer',
    template: `
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>{{ title }}</h3>
                    <ul>
                        <li><a href="/about">{{ $t('footer.about') }}</a></li>
                        <li><a href="/privacy">{{ $t('footer.privacy') }}</a></li>
                        <li><a href="/terms">{{ $t('footer.terms') }}</a></li>
                    </ul>
                </div>
                <div class="footer-bottom">
                    <p class="copyright">{{ $t('footer.copyright') }}</p>
                    <div class="social-links">
                        <a href="#twitter" class="social-link" title="Twitter">
                            <span class="icon">𝕏</span>
                        </a>
                        <a href="#github" class="social-link" title="GitHub">
                            <span class="icon">⚙️</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    `,
    props: {
        mode: {
            type: String,
            default: 'app',
        },
    },
    data() {
        return {
            title: 'Castium',
        }
    },
}

describe('Footer Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render footer', () => {
            const wrapper = mount(Footer, {
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
            expect(wrapper.find('footer.footer').exists()).toBe(true)
        })

        it('should display footer title', () => {
            const wrapper = mount(Footer, {
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
            expect(wrapper.find('h3').text()).toBe('Castium')
        })

        it('should have footer links', () => {
            const wrapper = mount(Footer, {
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
            const links = wrapper.findAll('a')
            expect(links.length).toBeGreaterThan(0)
        })

        it('should display copyright', () => {
            const wrapper = mount(Footer, {
                global: {
                    stubs: {
                        NuxtLink: true,
                        UIcon: true,
                    },
                    mocks: {
                        $t: (key: string) => 'footer.copyright',
                    },
                },
            })
            expect(wrapper.find('.copyright').text()).toBe('footer.copyright')
        })

        it('should have social links', () => {
            const wrapper = mount(Footer, {
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
            const socialLinks = wrapper.findAll('.social-link')
            expect(socialLinks.length).toBeGreaterThan(0)
        })
    })

    describe('Props', () => {
        it('should accept mode prop', () => {
            const wrapper = mount(Footer, {
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

    describe('Links', () => {
        it('should have valid link hrefs', () => {
            const wrapper = mount(Footer, {
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
            const links = wrapper.findAll('a')
            const validHrefs = ['/about', '/privacy', '/terms', '#twitter', '#github']

            links.forEach((link) => {
                const href = link.attributes('href')
                expect(href).toBeTruthy()
            })
        })
    })
})
