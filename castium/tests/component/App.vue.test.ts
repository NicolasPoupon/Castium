import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '~/app.vue'

describe('App.vue', () => {
    it('renders NuxtLayout with main and NuxtPage', () => {
        const wrapper = mount(App, {
            global: {
                stubs: {
                    NuxtLayout: { template: '<div class="nuxt-layout"><slot /></div>' },
                    NuxtPage: { template: '<div class="nuxt-page" />' },
                    NuxtLoadingIndicator: { template: '<div class="loading" />' },
                },
            },
        })
        expect(wrapper.find('.nuxt-layout').exists()).toBe(true)
        expect(wrapper.find('main').exists()).toBe(true)
    })
})
