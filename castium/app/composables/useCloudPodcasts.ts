/**
 * Cloud Podcasts Composable
 * Manages podcast uploads to Supabase Storage with progress tracking, notes, likes
 */

import type { UploadProgress } from '~/types/upload'

export interface CloudPodcast {
    id: string
    userId: string
    fileName: string
    filePath: string
    fileSize: number
    mimeType: string
    duration?: number
    title?: string
    artist?: string // Host/Author
    album?: string // Podcast series
    description?: string
    year?: number
    genre?: string
    coverPath?: string
    // User data
    isLiked?: boolean
    notes?: string
    comment?: string
    // Progress tracking
    currentTime: number
    progress: number // 0-100
    isCompleted: boolean
    lastPlayedAt?: string
    // Timestamps
    createdAt: string
    updatedAt: string
    publicUrl?: string
}

export interface CloudPodcastPlaybackState {
    currentPodcast: CloudPodcast | null
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    playbackSpeed: number
}

// export interface UploadProgress {
//     fileName: string
//     progress: number
//     status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
//     error?: string
// }

const PODCAST_BUCKET = 'podcasts'

// Global state
const podcasts = ref<CloudPodcast[]>([])
const likedPodcasts = ref<CloudPodcast[]>([])
const inProgressPodcasts = ref<CloudPodcast[]>([])
const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref<UploadProgress[]>([])
const error = ref<string | null>(null)

// Audio element for playback
const audioElement = ref<HTMLAudioElement | null>(null)

// Playback state
const playbackState = ref<CloudPodcastPlaybackState>({
    currentPodcast: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playbackSpeed: 1,
})

export const useCloudPodcasts = () => {
    const supabase = useSupabase()
    const { user } = useAuth()

    // Update filtered lists
    const updateFilteredLists = () => {
        likedPodcasts.value = podcasts.value.filter((p) => p.isLiked)
        inProgressPodcasts.value = podcasts.value.filter((p) => p.currentTime > 0 && !p.isCompleted)
    }

    // Initialize audio element
    const initAudio = () => {
        if (typeof window === 'undefined') return
        if (!audioElement.value) {
            audioElement.value = new Audio()
            audioElement.value.addEventListener('timeupdate', () => {
                playbackState.value.currentTime = audioElement.value?.currentTime || 0
                // Auto-save progress every 10 seconds
                if (
                    playbackState.value.currentPodcast &&
                    Math.floor(playbackState.value.currentTime) % 10 === 0
                ) {
                    saveProgress()
                }
            })
            audioElement.value.addEventListener('loadedmetadata', () => {
                playbackState.value.duration = audioElement.value?.duration || 0
            })
            audioElement.value.addEventListener('ended', () => {
                markAsCompleted()
            })
            audioElement.value.addEventListener('play', () => {
                playbackState.value.isPlaying = true
            })
            audioElement.value.addEventListener('pause', () => {
                playbackState.value.isPlaying = false
                saveProgress()
            })
        }
    }

    // Extract metadata from audio file
    const extractMetadata = async (file: File): Promise<Partial<CloudPodcast>> => {
        return new Promise((resolve) => {
            const audio = document.createElement('audio')
            audio.preload = 'metadata'

            audio.onloadedmetadata = () => {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
                let title = nameWithoutExt.replace(/[._-]/g, ' ')
                let album: string | undefined

                // Try to parse "Show - Episode" pattern
                const match = nameWithoutExt.match(/^(.+?)\s*[-–]\s*(.+)$/)
                if (match) {
                    album = match[1].trim()
                    title = match[2].trim()
                }

                URL.revokeObjectURL(audio.src)
                resolve({
                    duration: audio.duration,
                    title,
                    album,
                })
            }

            audio.onerror = () => {
                URL.revokeObjectURL(audio.src)
                resolve({
                    title: file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' '),
                })
            }

            audio.src = URL.createObjectURL(file)
        })
    }

    // Upload a single podcast
    const uploadPodcast = async (file: File): Promise<CloudPodcast | null> => {
        if (!user.value) {
            error.value = 'Not authenticated'
            return null
        }

        const userId = user.value.id
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `${userId}/${fileName}`

        const progressIndex = uploadProgress.value.findIndex((p) => p.fileName === file.name)
        const updateProgressFn = (
            progress: number,
            status: UploadProgress['status'],
            err?: string
        ) => {
            if (progressIndex >= 0) {
                uploadProgress.value[progressIndex] = {
                    fileName: file.name,
                    progress,
                    status,
                    error: err,
                }
            }
        }

        try {
            updateProgressFn(0, 'uploading')

            // Extract metadata
            const metadata = await extractMetadata(file)
            updateProgressFn(10, 'uploading')

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from(PODCAST_BUCKET)
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false,
                })

            if (uploadError) {
                throw new Error(uploadError.message)
            }
            updateProgressFn(80, 'processing')

            // Get public URL
            const { data: urlData } = supabase.storage.from(PODCAST_BUCKET).getPublicUrl(filePath)

            // Insert into database
            const insertPayload = {
                user_id: userId,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.type,
                duration: metadata.duration,
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                playback_time: 0,
                progress: 0,
                is_completed: false,
                is_liked: false,
            }

            const { data: podcastData, error: dbError } = await supabase
                .from('cloud_podcasts')
                .insert(insertPayload)
                .select()
                .single()

            if (dbError) {
                throw new Error(dbError.message)
            }

            updateProgressFn(100, 'complete')

            const uploadedPodcast: CloudPodcast = {
                id: podcastData.id,
                userId: podcastData.user_id,
                fileName: podcastData.file_name,
                filePath: podcastData.file_path,
                fileSize: podcastData.file_size,
                mimeType: podcastData.mime_type,
                duration: podcastData.duration,
                title: podcastData.title,
                artist: podcastData.artist,
                album: podcastData.album,
                description: podcastData.description,
                year: podcastData.year,
                genre: podcastData.genre,
                coverPath: podcastData.cover_path,
                isLiked: podcastData.is_liked || false,
                notes: podcastData.notes,
                comment: podcastData.comment,
                currentTime: podcastData.playback_time || 0,
                progress: podcastData.progress || 0,
                isCompleted: podcastData.is_completed || false,
                lastPlayedAt: podcastData.last_played_at,
                createdAt: podcastData.created_at,
                updatedAt: podcastData.updated_at,
                publicUrl: urlData.publicUrl,
            }

            return uploadedPodcast
        } catch (e: any) {
            console.error('[CloudPodcasts] Upload failed:', e)
            updateProgressFn(0, 'error', e.message)
            return null
        }
    }

    // Upload multiple podcasts
    const uploadPodcasts = async (files: FileList | File[]): Promise<void> => {
        uploading.value = true
        error.value = null

        uploadProgress.value = Array.from(files).map((file) => ({
            fileName: file.name,
            progress: 0,
            status: 'pending' as const,
        }))

        try {
            for (const file of Array.from(files)) {
                const podcast = await uploadPodcast(file)
                if (podcast) {
                    podcasts.value.unshift(podcast)
                }
            }
            updateFilteredLists()
        } catch (e: any) {
            console.error('[CloudPodcasts] Batch upload failed:', e)
            error.value = e.message
        } finally {
            uploading.value = false
            setTimeout(() => {
                uploadProgress.value = []
            }, 3000)
        }
    }

    // Fetch user's podcasts
    const fetchPodcasts = async (): Promise<void> => {
        if (!user.value) return

        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('cloud_podcasts')
                .select('*')
                .eq('user_id', user.value.id)
                .order('created_at', { ascending: false })

            if (fetchError) {
                throw new Error(fetchError.message)
            }

            podcasts.value = (data || []).map((p: any) => {
                const { data: urlData } = supabase.storage
                    .from(PODCAST_BUCKET)
                    .getPublicUrl(p.file_path)

                return {
                    id: p.id,
                    userId: p.user_id,
                    fileName: p.file_name,
                    filePath: p.file_path,
                    fileSize: p.file_size,
                    mimeType: p.mime_type,
                    duration: p.duration,
                    title: p.title,
                    artist: p.artist,
                    album: p.album,
                    description: p.description,
                    year: p.year,
                    genre: p.genre,
                    coverPath: p.cover_path,
                    isLiked: p.is_liked || false,
                    notes: p.notes,
                    comment: p.comment,
                    currentTime: p.playback_time || 0,
                    progress: p.progress || 0,
                    isCompleted: p.is_completed || false,
                    lastPlayedAt: p.last_played_at,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                    publicUrl: urlData.publicUrl,
                }
            })

            updateFilteredLists()
        } catch (e: any) {
            console.error('[CloudPodcasts] Fetch failed:', e)
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Delete podcast
    const deletePodcast = async (podcast: CloudPodcast): Promise<boolean> => {
        if (!user.value) return false

        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from(PODCAST_BUCKET)
                .remove([podcast.filePath])

            if (storageError) {
                console.warn('[CloudPodcasts] Storage delete failed:', storageError)
            }

            // Delete from database
            const { error: dbError } = await supabase
                .from('cloud_podcasts')
                .delete()
                .eq('id', podcast.id)
                .eq('user_id', user.value.id)

            if (dbError) {
                throw new Error(dbError.message)
            }

            const index = podcasts.value.findIndex((p) => p.id === podcast.id)
            if (index >= 0) {
                podcasts.value.splice(index, 1)
            }
            updateFilteredLists()

            // Stop playback if this was playing
            if (playbackState.value.currentPodcast?.id === podcast.id) {
                if (audioElement.value) {
                    audioElement.value.pause()
                    audioElement.value.src = ''
                }
                playbackState.value.currentPodcast = null
                playbackState.value.isPlaying = false
            }

            return true
        } catch (e: any) {
            console.error('[CloudPodcasts] Delete failed:', e)
            error.value = e.message
            return false
        }
    }

    // Toggle like
    const toggleLike = async (podcast: CloudPodcast): Promise<void> => {
        if (!user.value) return

        const newLiked = !podcast.isLiked
        podcast.isLiked = newLiked

        try {
            await supabase
                .from('cloud_podcasts')
                .update({ is_liked: newLiked })
                .eq('id', podcast.id)
                .eq('user_id', user.value.id)

            updateFilteredLists()
        } catch (e) {
            console.error('[CloudPodcasts] Toggle like failed:', e)
            podcast.isLiked = !newLiked
        }
    }

    // Update notes and comment
    const updateNotes = async (
        podcast: CloudPodcast,
        notes: string,
        comment: string
    ): Promise<void> => {
        if (!user.value) return

        podcast.notes = notes
        podcast.comment = comment

        try {
            await supabase
                .from('cloud_podcasts')
                .update({ notes, comment })
                .eq('id', podcast.id)
                .eq('user_id', user.value.id)
        } catch (e) {
            console.error('[CloudPodcasts] Update notes failed:', e)
        }
    }

    // Save current progress
    const saveProgress = async (): Promise<void> => {
        const podcast = playbackState.value.currentPodcast
        if (!podcast || !user.value) return

        const currentTime = playbackState.value.currentTime
        const duration = playbackState.value.duration || podcast.duration || 0
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0

        podcast.currentTime = currentTime
        podcast.progress = progress
        podcast.lastPlayedAt = new Date().toISOString()

        try {
            await supabase
                .from('cloud_podcasts')
                .update({
                    playback_time: currentTime,
                    progress,
                    last_played_at: podcast.lastPlayedAt,
                })
                .eq('id', podcast.id)
                .eq('user_id', user.value.id)

            updateFilteredLists()
        } catch (e) {
            console.error('[CloudPodcasts] Save progress failed:', e)
        }
    }

    // Mark as completed
    const markAsCompleted = async (): Promise<void> => {
        const podcast = playbackState.value.currentPodcast
        if (!podcast || !user.value) return

        podcast.isCompleted = true
        podcast.progress = 100
        podcast.currentTime = podcast.duration || 0

        try {
            await supabase
                .from('cloud_podcasts')
                .update({
                    is_completed: true,
                    progress: 100,
                    playback_time: podcast.duration || 0,
                })
                .eq('id', podcast.id)
                .eq('user_id', user.value.id)

            updateFilteredLists()
        } catch (e) {
            console.error('[CloudPodcasts] Mark completed failed:', e)
        }

        playbackState.value.isPlaying = false
        playbackState.value.currentPodcast = null
    }

    // Play podcast
    const playPodcast = async (podcast: CloudPodcast): Promise<void> => {
        initAudio()
        if (!audioElement.value || !podcast.publicUrl) return

        audioElement.value.src = podcast.publicUrl
        audioElement.value.playbackRate = playbackState.value.playbackSpeed

        // Resume from saved position
        if (podcast.currentTime > 0 && !podcast.isCompleted) {
            audioElement.value.currentTime = podcast.currentTime
        } else {
            audioElement.value.currentTime = 0
            podcast.currentTime = 0
            podcast.progress = 0
            podcast.isCompleted = false
        }

        playbackState.value.currentPodcast = podcast
        await audioElement.value.play()

        // Update last played
        podcast.lastPlayedAt = new Date().toISOString()
        await supabase
            .from('cloud_podcasts')
            .update({ last_played_at: podcast.lastPlayedAt })
            .eq('id', podcast.id)
    }

    // Toggle play/pause
    const togglePlay = () => {
        if (!audioElement.value) return
        if (playbackState.value.isPlaying) {
            audioElement.value.pause()
        } else {
            audioElement.value.play()
        }
    }

    // Seek
    const seek = (time: number) => {
        if (!audioElement.value) return
        audioElement.value.currentTime = time
    }

    // Skip forward/backward
    const skip = (seconds: number) => {
        if (!audioElement.value) return
        audioElement.value.currentTime = Math.max(0, audioElement.value.currentTime + seconds)
    }

    // Set volume
    const setVolume = (volume: number) => {
        if (!audioElement.value) return
        audioElement.value.volume = volume
        playbackState.value.volume = volume
        playbackState.value.isMuted = volume === 0
    }

    // Toggle mute
    const toggleMute = () => {
        if (!audioElement.value) return
        if (playbackState.value.isMuted) {
            audioElement.value.volume = playbackState.value.volume || 1
            playbackState.value.isMuted = false
        } else {
            audioElement.value.volume = 0
            playbackState.value.isMuted = true
        }
    }

    // Set playback speed
    const setPlaybackSpeed = (speed: number) => {
        if (!audioElement.value) return
        audioElement.value.playbackRate = speed
        playbackState.value.playbackSpeed = speed
    }

    // Format duration
    const formatDuration = (seconds?: number): string => {
        if (!seconds || isNaN(seconds)) return '--:--'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // Get podcast color
    const getPodcastColor = (podcast: CloudPodcast): string => {
        const colors = [
            'bg-orange-500',
            'bg-amber-500',
            'bg-yellow-500',
            'bg-red-500',
            'bg-pink-500',
            'bg-rose-500',
        ]
        let hash = 0
        const str = podcast.album || podcast.title || podcast.fileName
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i)
        }
        return colors[Math.abs(hash) % colors.length]
    }

    // Cleanup
    const cleanup = () => {
        if (audioElement.value) {
            audioElement.value.pause()
            audioElement.value.src = ''
        }
    }

    return {
        // State
        podcasts,
        likedPodcasts,
        inProgressPodcasts,
        loading,
        uploading,
        uploadProgress,
        error,
        playbackState,
        // Methods
        fetchPodcasts,
        uploadPodcasts,
        deletePodcast,
        toggleLike,
        updateNotes,
        playPodcast,
        togglePlay,
        seek,
        skip,
        setVolume,
        toggleMute,
        setPlaybackSpeed,
        saveProgress,
        // Helpers
        formatDuration,
        formatFileSize,
        getPodcastColor,
        cleanup,
    }
}
