import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Error from '~/error.vue'

describe('error.vue', () => {
    it('renders UApp and error content', () => {
        const wrapper = mount(Error, {
            global: {
                stubs: {
                    UApp: { template: '<div class="u-app"><slot /></div>' },
                    UHeader: { template: '<header class="u-header" />' },
                    UError: { template: '<div class="u-error" />' },
                    Footer: { template: '<footer class="footer" />' },
                },
            },
        })
        expect(wrapper.find('.u-app').exists()).toBe(true)
        expect(wrapper.find('.u-error').exists()).toBe(true)
        expect(wrapper.find('.footer').exists()).toBe(true)
    })
})
