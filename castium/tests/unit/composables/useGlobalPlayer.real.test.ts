import { describe, it, expect, beforeEach, vi } from 'vitest'

class MockAudio {
    src = ''
    currentTime = 0
    duration = 0
    volume = 1
    muted = false
    playbackRate = 1
    shouldFailPlay = false
    listeners = new Map<string, Array<(event?: any) => void>>()

    addEventListener = vi.fn((event: string, cb: (event?: any) => void) => {
        const list = this.listeners.get(event) || []
        list.push(cb)
        this.listeners.set(event, list)
    })

    removeEventListener = vi.fn((event: string, cb: (event?: any) => void) => {
        const list = this.listeners.get(event) || []
        this.listeners.set(
            event,
            list.filter((fn) => fn !== cb)
        )
    })

    dispatch(event: string, payload?: any) {
        const list = this.listeners.get(event) || []
        list.forEach((cb) => cb(payload))
    }

    load = vi.fn()

    play = vi.fn(async () => {
        if (this.shouldFailPlay) {
            throw new Error('play failed')
        }
        this.dispatch('play')
    })

    pause = vi.fn(() => {
        this.dispatch('pause')
    })
}

describe('useGlobalPlayer (real composable)', () => {
    let lastAudio: MockAudio | null
    let createObjectURL: ReturnType<typeof vi.fn>
    let revokeObjectURL: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
        vi.spyOn(console, 'error').mockImplementation(() => {})

        lastAudio = null
        createObjectURL = vi.fn(() => 'blob:mock-audio')
        revokeObjectURL = vi.fn()

        vi.stubGlobal('Audio', vi.fn(() => {
            lastAudio = new MockAudio()
            return lastAudio as unknown as HTMLAudioElement
        }))
        vi.stubGlobal('readonly', (value: unknown) => value)
        vi.stubGlobal('URL', {
            createObjectURL,
            revokeObjectURL,
        })
    })

    it('initializes audio, plays URL track, and updates reactive playback state from events', async () => {
        const { useGlobalPlayer } = await import('~/composables/useGlobalPlayer')
        const player = useGlobalPlayer()

        const trackChanged = vi.fn()
        const playStateChanged = vi.fn()
        player.onTrackChange(trackChanged)
        player.onPlayStateChange(playStateChanged)

        const track = { id: 't1', title: 'Song 1', type: 'music' as const, url: 'https://cdn/song.mp3' }
        await player.playTrack(track, [track], 0)

        expect(lastAudio).not.toBeNull()
        expect(lastAudio!.src).toBe('https://cdn/song.mp3')
        expect(lastAudio!.load).toHaveBeenCalledTimes(1)
        expect(lastAudio!.play).toHaveBeenCalledTimes(1)
        expect(player.playbackState.value.currentTrack?.id).toBe('t1')
        expect(player.playbackState.value.queueIndex).toBe(0)
        expect(player.playbackState.value.isPlaying).toBe(true)
        expect(player.isActive.value).toBe(true)
        expect(player.isCurrentTrack('t1')).toBe(true)
        expect(trackChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }))
        expect(playStateChanged).toHaveBeenCalledWith(true)

        lastAudio!.duration = 215
        lastAudio!.currentTime = 42
        lastAudio!.dispatch('durationchange')
        lastAudio!.dispatch('timeupdate')
        expect(player.playbackState.value.duration).toBe(215)
        expect(player.playbackState.value.currentTime).toBe(42)
    })

    it('handles seek/skip/volume/mute/speed and play-pause toggles with clamping', async () => {
        const { useGlobalPlayer } = await import('~/composables/useGlobalPlayer')
        const player = useGlobalPlayer()
        const track = { id: 't2', title: 'Song 2', type: 'music' as const, url: 'https://cdn/song2.mp3' }
        await player.playTrack(track, [track], 0)

        ;(player.playbackState.value as any).duration = 120
        ;(player.playbackState.value as any).currentTime = 50

        player.seek(500)
        expect(lastAudio!.currentTime).toBe(120)

        player.skip(-500)
        expect(lastAudio!.currentTime).toBe(0)

        player.setVolume(2)
        expect(player.playbackState.value.volume).toBe(1)
        expect(lastAudio!.volume).toBe(1)
        player.setVolume(-1)
        expect(player.playbackState.value.volume).toBe(0)

        player.toggleMute()
        expect(player.playbackState.value.isMuted).toBe(true)
        expect(lastAudio!.muted).toBe(true)

        player.setPlaybackSpeed(10)
        expect(player.playbackState.value.playbackSpeed).toBe(4)
        expect(lastAudio!.playbackRate).toBe(4)
        player.setPlaybackSpeed(0.1)
        expect(player.playbackState.value.playbackSpeed).toBe(0.25)

        const pauseCallsBeforeToggle = lastAudio!.pause.mock.calls.length
        await player.togglePlay()
        expect(lastAudio!.pause.mock.calls.length).toBe(pauseCallsBeforeToggle + 1)

        lastAudio!.dispatch('pause')
        await player.togglePlay()
        expect(lastAudio!.play).toHaveBeenCalledTimes(2)

        expect(player.formatTime(0)).toBe('0:00')
        expect(player.formatTime(125)).toBe('2:05')
        expect(player.formatTime(Number.NaN)).toBe('0:00')
    })

    it('navigates queue with next/previous, shuffle/repeat, and addToQueue options', async () => {
        const { useGlobalPlayer } = await import('~/composables/useGlobalPlayer')
        const player = useGlobalPlayer()

        const a = { id: 'a', title: 'A', type: 'music' as const, url: 'https://cdn/a.mp3' }
        const b = { id: 'b', title: 'B', type: 'music' as const, url: 'https://cdn/b.mp3' }
        const c = { id: 'c', title: 'C', type: 'music' as const, url: 'https://cdn/c.mp3' }

        await player.playTrack(a, [a, b], 0)
        await player.nextTrack()
        expect(player.playbackState.value.currentTrack?.id).toBe('b')
        expect(player.playbackState.value.queueIndex).toBe(1)

        ;(player.playbackState.value as any).currentTime = 4
        await player.previousTrack()
        expect(lastAudio!.currentTime).toBe(0)
        expect(player.playbackState.value.currentTrack?.id).toBe('b')

        ;(player.playbackState.value as any).currentTime = 0
        await player.previousTrack()
        expect(player.playbackState.value.currentTrack?.id).toBe('a')
        expect(player.playbackState.value.queueIndex).toBe(0)

        player.toggleShuffle()
        expect(player.playbackState.value.isShuffled).toBe(true)

        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
        await player.nextTrack()
        expect(player.playbackState.value.currentTrack?.id).toBe('b')
        randomSpy.mockRestore()

        expect(player.playbackState.value.repeatMode).toBe('off')
        player.toggleRepeat()
        expect(player.playbackState.value.repeatMode).toBe('all')
        player.toggleRepeat()
        expect(player.playbackState.value.repeatMode).toBe('one')
        player.toggleRepeat()
        expect(player.playbackState.value.repeatMode).toBe('off')

        await player.addToQueue(c, { playNext: true })
        expect(player.playbackState.value.queue.map((q) => q.id)).toContain('c')

        const queueBeforeDuplicate = player.playbackState.value.queue.length
        await player.addToQueue(c)
        expect(player.playbackState.value.queue.length).toBe(queueBeforeDuplicate)

        const d = { id: 'd', title: 'D', type: 'music' as const, url: 'https://cdn/d.mp3' }
        await player.addToQueue(d, { playNow: true })
        expect(player.playbackState.value.currentTrack?.id).toBe('d')
    })

    it('handles ended event branches and playback errors/cleanup', async () => {
        const { useGlobalPlayer } = await import('~/composables/useGlobalPlayer')
        const player = useGlobalPlayer()

        const a = { id: 'a', title: 'A', type: 'music' as const, url: 'https://cdn/a.mp3' }
        const b = { id: 'b', title: 'B', type: 'music' as const, url: 'https://cdn/b.mp3' }

        await player.playTrack(a, [a, b], 0)
        lastAudio!.dispatch('ended')
        expect(player.playbackState.value.currentTrack?.id).toBe('b')

        ;(player.playbackState.value as any).queue = []
        ;(player.playbackState.value as any).currentTime = 12
        lastAudio!.dispatch('ended')
        expect(lastAudio!.currentTime).toBe(0)

        const file = new File(['audio-data'], 'track.mp3', { type: 'audio/mpeg' })
        await player.playTrack({ id: 'f1', title: 'File Track', type: 'music', file }, [], 0)
        expect(createObjectURL).toHaveBeenCalled()
        player.stop()
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-audio')
        expect(player.playbackState.value.currentTrack).toBeNull()

        await player.playTrack({ id: 'no-src', title: 'No Source', type: 'music' }, [], 0)
        expect(player.playbackState.value.error).toBe('No audio source available')

        lastAudio!.shouldFailPlay = true
        await player.playTrack({ id: 'err', title: 'Error', type: 'music', url: 'https://cdn/err.mp3' }, [], 0)
        expect(player.playbackState.value.error).toBe('play failed')
    })

    it('addToQueue starts playback immediately when nothing is currently playing', async () => {
        const { useGlobalPlayer } = await import('~/composables/useGlobalPlayer')
        const player = useGlobalPlayer()
        const track = { id: 'first', title: 'First', type: 'music' as const, url: 'https://cdn/first.mp3' }

        await player.addToQueue(track)

        expect(player.playbackState.value.currentTrack?.id).toBe('first')
        expect(player.playbackState.value.queue).toHaveLength(1)
        expect(player.playbackState.value.queueIndex).toBe(0)
    })
})
