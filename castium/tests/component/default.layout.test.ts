import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DefaultLayout from '~/layouts/default.vue'

describe('default.vue layout', () => {
    it('renders slot and GlobalPlayer', () => {
        const wrapper = mount(DefaultLayout, {
            slots: { default: '<div class="slot-content">Page</div>' },
            global: {
                stubs: { GlobalPlayer: { template: '<div class="global-player" />' } },
            },
        })
        expect(wrapper.find('.slot-content').exists()).toBe(true)
        expect(wrapper.find('.global-player').exists()).toBe(true)
        expect(wrapper.find('.antialiased').exists()).toBe(true)
    })
})
