/**
 * Global Audio Player Composable
 * Centralized audio management for music, radio, and podcasts
 * Ensures only one audio source plays at a time
 */

export type MediaType = 'music' | 'radio' | 'podcast'

export interface MediaTrack {
    id: string
    title: string
    artist?: string
    album?: string
    coverArt?: string
    duration?: number
    url?: string // For cloud/radio tracks
    file?: File // For local tracks
    handle?: FileSystemFileHandle // For local tracks
    type: MediaType
    // Additional metadata
    showName?: string // For podcasts
    stationName?: string // For radio
    isCloud?: boolean
}

export interface GlobalPlaybackState {
    isPlaying: boolean
    currentTrack: MediaTrack | null
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    playbackSpeed: number
    isShuffled: boolean
    repeatMode: 'off' | 'all' | 'one'
    queue: MediaTrack[]
    queueIndex: number
    mediaType: MediaType | null
    isLoading: boolean
    error: string | null
}

// Global singleton state
const audioElement = ref<HTMLAudioElement | null>(null)
const objectUrl = ref<string | null>(null)

const playbackState = ref<GlobalPlaybackState>({
    isPlaying: false,
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    playbackSpeed: 1,
    isShuffled: false,
    repeatMode: 'off',
    queue: [],
    queueIndex: -1,
    mediaType: null,
    isLoading: false,
    error: null,
})

// Event callbacks for external listeners
const onTrackChangeCallbacks = new Set<(track: MediaTrack | null) => void>()
const onPlayStateChangeCallbacks = new Set<(isPlaying: boolean) => void>()

export function useGlobalPlayer() {
    // Initialize audio element
    const initAudio = () => {
        if (typeof window === 'undefined') return

        if (!audioElement.value) {
            audioElement.value = new Audio()
            audioElement.value.volume = playbackState.value.volume
            audioElement.value.playbackRate = playbackState.value.playbackSpeed

            // Event listeners
            audioElement.value.addEventListener('timeupdate', () => {
                if (audioElement.value) {
                    playbackState.value.currentTime = audioElement.value.currentTime
                }
            })

            audioElement.value.addEventListener('durationchange', () => {
                if (audioElement.value) {
                    playbackState.value.duration = audioElement.value.duration || 0
                }
            })

            audioElement.value.addEventListener('ended', () => {
                handleTrackEnded()
            })

            audioElement.value.addEventListener('play', () => {
                playbackState.value.isPlaying = true
                playbackState.value.isLoading = false
                notifyPlayStateChange(true)
            })

            audioElement.value.addEventListener('pause', () => {
                playbackState.value.isPlaying = false
                notifyPlayStateChange(false)
            })

            audioElement.value.addEventListener('error', (e) => {
                console.error('Audio error:', e)
                playbackState.value.error = 'Error loading audio'
                playbackState.value.isLoading = false
                playbackState.value.isPlaying = false
            })

            audioElement.value.addEventListener('loadstart', () => {
                playbackState.value.isLoading = true
                playbackState.value.error = null
            })

            audioElement.value.addEventListener('canplay', () => {
                playbackState.value.isLoading = false
            })
        }
    }

    // Notify external listeners
    const notifyTrackChange = (track: MediaTrack | null) => {
        onTrackChangeCallbacks.forEach((cb) => cb(track))
    }

    const notifyPlayStateChange = (isPlaying: boolean) => {
        onPlayStateChangeCallbacks.forEach((cb) => cb(isPlaying))
    }

    // Stop any current playback
    const stop = () => {
        if (audioElement.value) {
            audioElement.value.pause()
            audioElement.value.currentTime = 0
            audioElement.value.src = ''
        }

        // Clean up object URL
        if (objectUrl.value) {
            URL.revokeObjectURL(objectUrl.value)
            objectUrl.value = null
        }

        playbackState.value.isPlaying = false
        playbackState.value.currentTrack = null
        playbackState.value.currentTime = 0
        playbackState.value.duration = 0
        playbackState.value.mediaType = null
        playbackState.value.error = null

        notifyTrackChange(null)
    }

    // Play a track
    const playTrack = async (
        track: MediaTrack,
        queue: MediaTrack[] = [],
        queueIndex: number = 0
    ): Promise<void> => {
        initAudio()
        if (!audioElement.value) return

        // Stop current playback first
        stop()

        try {
            playbackState.value.isLoading = true
            playbackState.value.error = null
            playbackState.value.currentTrack = track
            playbackState.value.queue = queue
            playbackState.value.queueIndex = queueIndex
            playbackState.value.mediaType = track.type

            let audioSrc: string | null = null

            // Determine audio source
            if (track.url) {
                // Cloud track or radio stream
                audioSrc = track.url
            } else if (track.file) {
                // Local file from input
                objectUrl.value = URL.createObjectURL(track.file)
                audioSrc = objectUrl.value
            } else if (track.handle) {
                // File System Access API handle
                const file = await track.handle.getFile()
                objectUrl.value = URL.createObjectURL(file)
                audioSrc = objectUrl.value
            }

            if (!audioSrc) {
                throw new Error('No audio source available')
            }

            audioElement.value.src = audioSrc
            audioElement.value.load()
            await audioElement.value.play()

            notifyTrackChange(track)
        } catch (error: any) {
            console.error('Error playing track:', error)
            playbackState.value.error = error.message || 'Failed to play track'
            playbackState.value.isLoading = false
            playbackState.value.isPlaying = false
        }
    }

    // Toggle play/pause
    const togglePlay = async (): Promise<void> => {
        if (!audioElement.value) return

        if (playbackState.value.isPlaying) {
            audioElement.value.pause()
        } else {
            try {
                await audioElement.value.play()
            } catch (error) {
                console.error('Error resuming playback:', error)
            }
        }
    }

    // Pause
    const pause = () => {
        if (audioElement.value) {
            audioElement.value.pause()
        }
    }

    // Resume
    const resume = async () => {
        if (audioElement.value && playbackState.value.currentTrack) {
            try {
                await audioElement.value.play()
            } catch (error) {
                console.error('Error resuming:', error)
            }
        }
    }

    // Seek to position
    const seek = (time: number) => {
        if (audioElement.value) {
            audioElement.value.currentTime = Math.max(
                0,
                Math.min(time, playbackState.value.duration)
            )
        }
    }

    // Skip forward/backward
    const skip = (seconds: number) => {
        if (audioElement.value) {
            seek(playbackState.value.currentTime + seconds)
        }
    }

    // Set volume (0-1)
    const setVolume = (volume: number) => {
        playbackState.value.volume = Math.max(0, Math.min(1, volume))
        if (audioElement.value) {
            audioElement.value.volume = playbackState.value.volume
        }
    }

    // Toggle mute
    const toggleMute = () => {
        playbackState.value.isMuted = !playbackState.value.isMuted
        if (audioElement.value) {
            audioElement.value.muted = playbackState.value.isMuted
        }
    }

    // Set playback speed
    const setPlaybackSpeed = (speed: number) => {
        playbackState.value.playbackSpeed = Math.max(0.25, Math.min(4, speed))
        if (audioElement.value) {
            audioElement.value.playbackRate = playbackState.value.playbackSpeed
        }
    }

    // Next track
    const nextTrack = async () => {
        const { queue, queueIndex, isShuffled } = playbackState.value

        if (queue.length === 0) {
            // No queue - replay current track
            seek(0)
            await resume()
            return
        }

        let nextIndex: number

        if (isShuffled) {
            nextIndex = Math.floor(Math.random() * queue.length)
        } else if (queueIndex < queue.length - 1) {
            nextIndex = queueIndex + 1
        } else {
            // End of queue - go back to first track
            nextIndex = 0
        }

        const nextTrackItem = queue[nextIndex]
        if (nextTrackItem) {
            await playTrack(nextTrackItem, queue, nextIndex)
        }
    }

    // Previous track
    const previousTrack = async () => {
        const { queue, queueIndex, currentTime } = playbackState.value

        // If more than 3 seconds in, restart current track
        if (currentTime > 3) {
            seek(0)
            return
        }

        if (queue.length === 0) return

        const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1
        const prevTrackItem = queue[prevIndex]

        if (prevTrackItem) {
            await playTrack(prevTrackItem, queue, prevIndex)
        }
    }

    // Handle track ended
    const handleTrackEnded = async () => {
        const { queue, queueIndex } = playbackState.value

        if (queue.length > 0 && queueIndex < queue.length - 1) {
            // There's a next track in the queue
            await nextTrack()
        } else if (queue.length > 0) {
            // End of queue - go back to first track
            await playTrack(queue[0], queue, 0)
        } else {
            // No queue - replay the same track
            seek(0)
            await resume()
        }
    }

    // Toggle shuffle
    const toggleShuffle = () => {
        playbackState.value.isShuffled = !playbackState.value.isShuffled
    }

    // Toggle repeat mode
    const toggleRepeat = () => {
        const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one']
        const currentIndex = modes.indexOf(playbackState.value.repeatMode)
        playbackState.value.repeatMode = modes[(currentIndex + 1) % modes.length]
    }

    // Subscribe to track changes
    const onTrackChange = (callback: (track: MediaTrack | null) => void) => {
        onTrackChangeCallbacks.add(callback)
        return () => onTrackChangeCallbacks.delete(callback)
    }

    // Subscribe to play state changes
    const onPlayStateChange = (callback: (isPlaying: boolean) => void) => {
        onPlayStateChangeCallbacks.add(callback)
        return () => onPlayStateChangeCallbacks.delete(callback)
    }

    // Format time
    const formatTime = (seconds: number): string => {
        if (!seconds || !isFinite(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Check if a specific track is currently playing
    const isCurrentTrack = (trackId: string): boolean => {
        return playbackState.value.currentTrack?.id === trackId
    }

    // Check if player is active
    const isActive = computed(() => playbackState.value.currentTrack !== null)

    return {
        // State
        playbackState: readonly(playbackState),
        isActive,

        // Controls
        playTrack,
        stop,
        togglePlay,
        pause,
        resume,
        seek,
        skip,
        setVolume,
        toggleMute,
        setPlaybackSpeed,
        nextTrack,
        previousTrack,
        toggleShuffle,
        toggleRepeat,

        // Utilities
        formatTime,
        isCurrentTrack,

        // Event subscriptions
        onTrackChange,
        onPlayStateChange,
    }
}
