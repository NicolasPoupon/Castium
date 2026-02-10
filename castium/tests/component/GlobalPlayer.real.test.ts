import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import GlobalPlayer from '~/components/GlobalPlayer.vue'
import { runMounted } from '../test-setup'

const buildPlayerContext = (overrides: Record<string, any> = {}) => {
    const playbackState = ref({
        currentTrack: {
            title: 'My Song',
            artist: 'My Artist',
            stationName: '',
            showName: '',
            coverArt: '',
        },
        currentTime: 50,
        duration: 200,
        isPlaying: false,
        isLoading: false,
        volume: 0.6,
        isMuted: false,
        playbackSpeed: 1,
        mediaType: 'music',
        ...overrides,
    })

    return {
        playbackState,
        isActive: ref(true),
        togglePlay: vi.fn(),
        stop: vi.fn(),
        seek: vi.fn(),
        skip: vi.fn(),
        setVolume: vi.fn(),
        toggleMute: vi.fn(),
        setPlaybackSpeed: vi.fn(),
        nextTrack: vi.fn(),
        previousTrack: vi.fn(),
        formatTime: vi.fn((n: number) => `${n}s`),
    }
}

describe('GlobalPlayer.vue (real component)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mountWithContext = (ctx: ReturnType<typeof buildPlayerContext>) => {
        vi.stubGlobal('useGlobalPlayer', () => ctx)

        const wrapper = mount(GlobalPlayer, {
            global: {
                stubs: {
                    Teleport: { template: '<div class="teleport"><slot /></div>' },
                    Transition: { template: '<div class="transition"><slot /></div>' },
                    UIcon: {
                        props: ['name'],
                        template: '<i class="u-icon" :data-name="name" />',
                    },
                },
            },
        })
        runMounted()
        return wrapper
    }

    it('renders basic track info and invokes playback controls', async () => {
        const ctx = buildPlayerContext({
            mediaType: 'music',
            currentTrack: { title: 'Track A', artist: 'Artist A', coverArt: '' },
        })
        const wrapper = mountWithContext(ctx)

        expect(wrapper.text()).toContain('Track A')
        expect(wrapper.text()).toContain('Artist A')

        const playButton = wrapper.findAll('button').find((b) =>
            b.find('[data-name="i-heroicons-play-solid"]').exists()
        )
        expect(playButton).toBeTruthy()
        await playButton!.trigger('click')
        expect(ctx.togglePlay).toHaveBeenCalledTimes(1)

        const previousButton = wrapper.findAll('button').find((b) =>
            b.find('[data-name="i-heroicons-backward"]').exists()
        )
        const nextButton = wrapper.findAll('button').find((b) =>
            b.find('[data-name="i-heroicons-forward"]').exists()
        )
        expect(previousButton).toBeTruthy()
        expect(nextButton).toBeTruthy()

        await previousButton!.trigger('click')
        await nextButton!.trigger('click')
        expect(ctx.previousTrack).toHaveBeenCalledTimes(1)
        expect(ctx.nextTrack).toHaveBeenCalledTimes(1)
    })

    it('renders podcast controls and skip actions', async () => {
        const ctx = buildPlayerContext({
            mediaType: 'podcast',
            currentTrack: { title: 'Podcast Ep', showName: 'Show Name', coverArt: '' },
        })
        const wrapper = mountWithContext(ctx)

        expect(wrapper.text()).toContain('Podcast Ep')
        expect(wrapper.text()).toContain('Show Name')
        expect(wrapper.text()).toContain('-15')
        expect(wrapper.text()).toContain('+30')

        const buttons = wrapper.findAll('button')
        const minus15 = buttons.find((b) => b.text().includes('-15'))
        const plus30 = buttons.find((b) => b.text().includes('+30'))
        expect(minus15).toBeTruthy()
        expect(plus30).toBeTruthy()

        await minus15!.trigger('click')
        await plus30!.trigger('click')
        expect(ctx.skip).toHaveBeenCalledWith(-15)
        expect(ctx.skip).toHaveBeenCalledWith(30)
    })

    it('hides time display in radio mode and shows fallback title', () => {
        const ctx = buildPlayerContext({
            mediaType: 'radio',
            currentTrack: null,
        })
        const wrapper = mountWithContext(ctx)

        expect(wrapper.text()).toContain('Unknown')
        expect(wrapper.text()).not.toContain('50s')
        expect(wrapper.text()).not.toContain('200s')
    })

    it('handles progress click and drag seeking', async () => {
        const ctx = buildPlayerContext({ mediaType: 'music', duration: 200 })
        const wrapper = mountWithContext(ctx)

        const progress = wrapper.find('.h-1.bg-gray-700.cursor-pointer.group')
        expect(progress.exists()).toBe(true)

        Object.defineProperty(progress.element, 'getBoundingClientRect', {
            value: () => ({ left: 0, width: 200 }),
            configurable: true,
        })

        await progress.trigger('click', { clientX: 100 })
        expect(ctx.seek).toHaveBeenCalledWith(100)

        await progress.trigger('mousedown')
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 250 }))
        expect(ctx.seek).toHaveBeenCalledWith(200)
        document.dispatchEvent(new MouseEvent('mouseup'))
    })

    it('opens speed and volume controls, applies actions, then closes on outside click', async () => {
        const ctx = buildPlayerContext({ mediaType: 'music', volume: 0.4, playbackSpeed: 1 })
        const wrapper = mountWithContext(ctx)

        const speedButton = wrapper.findAll('button').find((b) => b.text().trim() === '1x')
        expect(speedButton).toBeTruthy()
        await speedButton!.trigger('click')
        expect(wrapper.text()).toContain('1.5x')

        const speedChoice = wrapper.findAll('button').find((b) => b.text().trim() === '1.5x')
        expect(speedChoice).toBeTruthy()
        await speedChoice!.trigger('click')
        expect(ctx.setPlaybackSpeed).toHaveBeenCalledWith(1.5)

        const speakerIcon = wrapper.find('[data-name="i-heroicons-speaker-wave"]')
        expect(speakerIcon.exists()).toBe(true)
        ;(speakerIcon.element.closest('button') as HTMLButtonElement).click()
        await wrapper.vm.$nextTick()

        const volumeInput = wrapper.find('input.volume-slider')
        expect(volumeInput.exists()).toBe(true)
        Object.defineProperty(volumeInput.element, 'valueAsNumber', {
            value: 25,
            configurable: true,
        })
        await volumeInput.trigger('input')
        expect(ctx.setVolume).toHaveBeenCalledWith(0.25)

        const muteButton = wrapper.findAll('button').find((b) =>
            b.find('[data-name="i-heroicons-speaker-wave"]').exists() && b.classes().includes('w-full')
        )
        expect(muteButton).toBeTruthy()
        await muteButton!.trigger('click')
        expect(ctx.toggleMute).toHaveBeenCalledTimes(1)

        document.dispatchEvent(new MouseEvent('click'))
        await wrapper.vm.$nextTick()
        expect(wrapper.find('input.volume-slider').exists()).toBe(false)
    })

    it('handles loading and stop actions', async () => {
        const ctx = buildPlayerContext({ isLoading: true })
        const wrapper = mountWithContext(ctx)

        const playButton = wrapper.findAll('button').find((b) =>
            b.find('[data-name="i-heroicons-arrow-path"]').exists()
        )
        expect(playButton).toBeTruthy()
        expect(playButton!.attributes('disabled')).toBeDefined()

        const stopButton = wrapper.findAll('button').find((b) =>
            b.find('[data-name="i-heroicons-x-mark"]').exists()
        )
        expect(stopButton).toBeTruthy()
        await stopButton!.trigger('click')
        expect(ctx.stop).toHaveBeenCalledTimes(1)
    })
})
