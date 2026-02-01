/**
 * Local Podcasts Composable
 * Manages local podcast files with Supabase persistence for progress, likes, notes
 */

// File System Access API types
declare global {
    interface Window {
        showDirectoryPicker(options?: {
            mode?: 'read' | 'readwrite'
        }): Promise<FileSystemDirectoryHandle>
    }
}

export interface LocalPodcast {
    id: string
    odcastLocalId: string
    userId: string
    filePath: string
    fileName: string
    fileSize: number
    mimeType?: string
    title?: string
    artist?: string // Podcast host/author
    album?: string // Podcast series name
    description?: string
    year?: number
    genre?: string
    duration?: number
    coverArt?: string
    createdAt: string
    updatedAt: string
    // User data
    isLiked?: boolean
    notes?: string
    comment?: string
    // Progress tracking
    currentTime?: number
    progress?: number // 0-100
    isCompleted?: boolean
    lastPlayedAt?: string
    // Runtime properties
    file?: File
    handle?: FileSystemFileHandle
    objectUrl?: string
    isAvailable?: boolean
}

export interface PodcastPlaybackState {
    isPlaying: boolean
    currentPodcast: LocalPodcast | null
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    playbackSpeed: number
}

const DB_NAME = 'castium-podcasts-db'
const DB_VERSION = 1
const FOLDER_STORE = 'podcast-folder-handles'

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma', '.opus']

// Global state
const folderHandle = ref<FileSystemDirectoryHandle | null>(null)
const podcasts = ref<LocalPodcast[]>([])
const likedPodcasts = ref<LocalPodcast[]>([])
const inProgressPodcasts = ref<LocalPodcast[]>([])
const loading = ref(false)
const hasPermission = ref(false)
const usesFallback = ref(false)
const needsReauthorization = ref(false)
const savedFolderName = ref<string | null>(null)

// Audio player state
const audioElement = ref<HTMLAudioElement | null>(null)
const playbackState = ref<PodcastPlaybackState>({
    isPlaying: false,
    currentPodcast: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playbackSpeed: 1,
})

export const useLocalPodcasts = () => {
    const supabase = useSupabase()
    const { user } = useAuth()

    // Check if File System Access API is available
    const isFileSystemAPISupported = computed(() => {
        if (typeof window === 'undefined') return false
        return 'showDirectoryPicker' in window
    })

    // IndexedDB helpers
    const openDB = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                if (!db.objectStoreNames.contains(FOLDER_STORE)) {
                    db.createObjectStore(FOLDER_STORE)
                }
            }
        })
    }

    const getFolderKey = (): string => {
        return user.value?.id ? `podcast-folder-${user.value.id}` : 'podcast-folder-anonymous'
    }

    const saveFolderHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(FOLDER_STORE, 'readwrite')
            const store = tx.objectStore(FOLDER_STORE)
            const request = store.put(handle, getFolderKey())
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve()
        })
    }

    const loadFolderHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
        try {
            const db = await openDB()
            return new Promise((resolve, reject) => {
                const tx = db.transaction(FOLDER_STORE, 'readonly')
                const store = tx.objectStore(FOLDER_STORE)
                const request = store.get(getFolderKey())
                request.onerror = () => reject(request.error)
                request.onsuccess = () => resolve(request.result || null)
            })
        } catch {
            return null
        }
    }

    // Generate consistent ID for local podcast
    const generatePodcastId = (filePath: string, userId: string): string => {
        const str = `${userId}:${filePath}`
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
        }
        return `local-podcast-${Math.abs(hash).toString(36)}`
    }

    // Extract metadata from audio file
    const extractMetadata = async (file: File): Promise<Partial<LocalPodcast>> => {
        return new Promise((resolve) => {
            const audio = document.createElement('audio')
            audio.preload = 'metadata'

            audio.onloadedmetadata = () => {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
                let title = nameWithoutExt.replace(/[._-]/g, ' ')
                let artist: string | undefined
                let album: string | undefined

                // Try to parse "Show - Episode" pattern
                const match = nameWithoutExt.match(/^(.+?)\s*[-–]\s*(.+)$/)
                if (match) {
                    album = match[1].trim() // Show name
                    title = match[2].trim() // Episode name
                }

                URL.revokeObjectURL(audio.src)
                resolve({
                    duration: audio.duration,
                    title,
                    artist,
                    album,
                })
            }

            audio.onerror = () => {
                URL.revokeObjectURL(audio.src)
                resolve({
                    title: file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ')
                })
            }

            audio.src = URL.createObjectURL(file)
        })
    }

    // Scan folder for audio files
    const scanFolder = async (handle: FileSystemDirectoryHandle): Promise<void> => {
        if (!user.value) return

        loading.value = true
        const scannedPodcasts: LocalPodcast[] = []

        const scanDirectory = async (dirHandle: FileSystemDirectoryHandle, path: string = '') => {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    const fileHandle = entry as FileSystemFileHandle
                    const name = fileHandle.name.toLowerCase()

                    if (AUDIO_EXTENSIONS.some(ext => name.endsWith(ext))) {
                        try {
                            const file = await fileHandle.getFile()
                            const filePath = path ? `${path}/${fileHandle.name}` : fileHandle.name
                            const metadata = await extractMetadata(file)

                            const podcastId = generatePodcastId(filePath, user.value!.id)

                            scannedPodcasts.push({
                                id: podcastId,
                                odcastLocalId: podcastId,
                                userId: user.value!.id,
                                filePath,
                                fileName: fileHandle.name,
                                fileSize: file.size,
                                mimeType: file.type,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                file,
                                handle: fileHandle,
                                objectUrl: URL.createObjectURL(file),
                                isAvailable: true,
                                ...metadata,
                            })
                        } catch (e) {
                            console.warn('[LocalPodcasts] Failed to read file:', fileHandle.name, e)
                        }
                    }
                } else if (entry.kind === 'directory') {
                    const subDir = entry as FileSystemDirectoryHandle
                    await scanDirectory(subDir, path ? `${path}/${subDir.name}` : subDir.name)
                }
            }
        }

        try {
            await scanDirectory(handle)

            // Fetch user data from Supabase
            const { data: dbPodcasts } = await supabase
                .from('local_podcasts')
                .select('*')
                .eq('user_id', user.value.id)

            const dbMap = new Map((dbPodcasts || []).map((p: any) => [p.file_path, p]))

            // Merge with DB data
            podcasts.value = scannedPodcasts.map(podcast => {
                const dbData = dbMap.get(podcast.filePath)
                if (dbData) {
                    return {
                        ...podcast,
                        isLiked: dbData.is_liked || false,
                        notes: dbData.notes || undefined,
                        comment: dbData.comment || undefined,
                        currentTime: dbData.playback_time || 0,
                        progress: dbData.progress || 0,
                        isCompleted: dbData.is_completed || false,
                        lastPlayedAt: dbData.last_played_at || undefined,
                    }
                }
                return podcast
            })

            // Update liked and in-progress lists
            updateFilteredLists()
        } catch (e) {
            console.error('[LocalPodcasts] Scan failed:', e)
        } finally {
            loading.value = false
        }
    }

    // Update filtered lists
    const updateFilteredLists = () => {
        likedPodcasts.value = podcasts.value.filter(p => p.isLiked)
        inProgressPodcasts.value = podcasts.value.filter(p =>
            p.currentTime && p.currentTime > 0 && !p.isCompleted
        )
    }

    // Select folder
    const selectFolder = async (): Promise<void> => {
        if (!isFileSystemAPISupported.value) {
            usesFallback.value = true
            return
        }

        try {
            const handle = await window.showDirectoryPicker({ mode: 'read' })
            folderHandle.value = handle
            savedFolderName.value = handle.name
            hasPermission.value = true
            needsReauthorization.value = false
            await saveFolderHandle(handle)
            await scanFolder(handle)
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                console.error('[LocalPodcasts] Folder selection failed:', e)
            }
        }
    }

    // Reauthorize folder access
    const reauthorizeFolder = async (): Promise<boolean> => {
        if (!folderHandle.value) return false

        try {
            const permission = await folderHandle.value.requestPermission({ mode: 'read' })
            if (permission === 'granted') {
                hasPermission.value = true
                needsReauthorization.value = false
                await scanFolder(folderHandle.value)
                return true
            }
        } catch (e) {
            console.error('[LocalPodcasts] Reauthorization failed:', e)
        }
        return false
    }

    // Initialize
    const initialize = async (): Promise<void> => {
        if (!user.value || !isFileSystemAPISupported.value) {
            usesFallback.value = !isFileSystemAPISupported.value
            return
        }

        const handle = await loadFolderHandle()
        if (handle) {
            folderHandle.value = handle
            savedFolderName.value = handle.name

            try {
                const permission = await handle.queryPermission({ mode: 'read' })
                if (permission === 'granted') {
                    hasPermission.value = true
                    await scanFolder(handle)
                } else {
                    needsReauthorization.value = true
                }
            } catch {
                needsReauthorization.value = true
            }
        }
    }

    // Save/update podcast in DB
    const savePodcastToDb = async (podcast: LocalPodcast): Promise<void> => {
        if (!user.value) return

        try {
            const payload = {
                user_id: user.value.id,
                file_path: podcast.filePath,
                file_name: podcast.fileName,
                title: podcast.title,
                artist: podcast.artist,
                album: podcast.album,
                duration: podcast.duration,
                is_liked: podcast.isLiked || false,
                notes: podcast.notes || null,
                comment: podcast.comment || null,
                playback_time: podcast.currentTime || 0,
                progress: podcast.progress || 0,
                is_completed: podcast.isCompleted || false,
                last_played_at: podcast.lastPlayedAt || null,
            }

            await supabase
                .from('local_podcasts')
                .upsert(payload, { onConflict: 'user_id,file_path' })
        } catch (e) {
            console.error('[LocalPodcasts] Failed to save podcast:', e)
        }
    }

    // Toggle like
    const toggleLike = async (podcast: LocalPodcast): Promise<void> => {
        podcast.isLiked = !podcast.isLiked
        await savePodcastToDb(podcast)
        updateFilteredLists()
    }

    // Update notes and comment
    const updateNotes = async (podcast: LocalPodcast, notes: string, comment: string): Promise<void> => {
        podcast.notes = notes
        podcast.comment = comment
        await savePodcastToDb(podcast)
    }

    // Delete podcast from DB (not the file)
    const deletePodcast = async (podcast: LocalPodcast): Promise<void> => {
        if (!user.value) return

        try {
            await supabase
                .from('local_podcasts')
                .delete()
                .eq('user_id', user.value.id)
                .eq('file_path', podcast.filePath)

            const index = podcasts.value.findIndex(p => p.id === podcast.id)
            if (index >= 0) {
                podcasts.value.splice(index, 1)
            }
            updateFilteredLists()
        } catch (e) {
            console.error('[LocalPodcasts] Failed to delete podcast:', e)
        }
    }

    // Initialize audio element
    const initAudio = () => {
        if (typeof window === 'undefined') return
        if (!audioElement.value) {
            audioElement.value = new Audio()
            audioElement.value.addEventListener('timeupdate', () => {
                playbackState.value.currentTime = audioElement.value?.currentTime || 0
                // Auto-save progress every 10 seconds
                if (playbackState.value.currentPodcast && Math.floor(playbackState.value.currentTime) % 10 === 0) {
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

    // Save current progress
    const saveProgress = async () => {
        const podcast = playbackState.value.currentPodcast
        if (!podcast || !user.value) return

        const currentTime = playbackState.value.currentTime
        const duration = playbackState.value.duration || podcast.duration || 0
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0

        podcast.currentTime = currentTime
        podcast.progress = progress
        podcast.lastPlayedAt = new Date().toISOString()

        await savePodcastToDb(podcast)
        updateFilteredLists()
    }

    // Mark as completed
    const markAsCompleted = async () => {
        const podcast = playbackState.value.currentPodcast
        if (!podcast) return

        podcast.isCompleted = true
        podcast.progress = 100
        podcast.currentTime = podcast.duration || 0
        await savePodcastToDb(podcast)
        updateFilteredLists()

        playbackState.value.isPlaying = false
        playbackState.value.currentPodcast = null
    }

    // Play podcast
    const playPodcast = async (podcast: LocalPodcast): Promise<void> => {
        initAudio()
        if (!audioElement.value) return

        // Get audio URL
        let audioUrl: string | undefined
        if (podcast.objectUrl) {
            audioUrl = podcast.objectUrl
        } else if (podcast.handle) {
            try {
                const file = await podcast.handle.getFile()
                podcast.file = file
                podcast.objectUrl = URL.createObjectURL(file)
                audioUrl = podcast.objectUrl
            } catch (e) {
                console.error('[LocalPodcasts] Failed to get file:', e)
                return
            }
        }

        if (!audioUrl) return

        audioElement.value.src = audioUrl
        audioElement.value.playbackRate = playbackState.value.playbackSpeed

        // Resume from saved position
        if (podcast.currentTime && podcast.currentTime > 0) {
            audioElement.value.currentTime = podcast.currentTime
        }

        playbackState.value.currentPodcast = podcast
        await audioElement.value.play()

        // Update last played
        podcast.lastPlayedAt = new Date().toISOString()
        await savePodcastToDb(podcast)
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

    // Get podcast color (for UI)
    const getPodcastColor = (podcast: LocalPodcast): string => {
        const colors = [
            'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
            'bg-red-500', 'bg-pink-500', 'bg-rose-500'
        ]
        let hash = 0
        const str = podcast.album || podcast.title || podcast.fileName
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i)
        }
        return colors[Math.abs(hash) % colors.length]
    }

    // Cleanup
    const cleanup = () => {
        if (audioElement.value) {
            audioElement.value.pause()
            audioElement.value.src = ''
        }
        // Revoke object URLs
        podcasts.value.forEach(p => {
            if (p.objectUrl) {
                URL.revokeObjectURL(p.objectUrl)
            }
        })
    }

    return {
        // State
        podcasts,
        likedPodcasts,
        inProgressPodcasts,
        loading,
        hasPermission,
        usesFallback,
        needsReauthorization,
        savedFolderName,
        folderHandle,
        playbackState,
        isFileSystemAPISupported,
        // Methods
        initialize,
        selectFolder,
        reauthorizeFolder,
        scanFolder,
        toggleLike,
        updateNotes,
        deletePodcast,
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
