/**
 * Local Music Composable
 * Manages local music files, playlists, and playback with Supabase persistence
 */

// File System Access API types
declare global {
    interface Window {
        showDirectoryPicker(options?: {
            mode?: 'read' | 'readwrite'
        }): Promise<FileSystemDirectoryHandle>
    }
    interface FileSystemDirectoryHandle {
        values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>
        queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
        requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
    }
}

export interface LocalTrack {
    id: string
    userId: string
    filePath: string
    fileName: string
    fileSize: number
    mimeType?: string
    title?: string
    artist?: string
    album?: string
    albumArtist?: string
    year?: number
    genre?: string
    trackNumber?: number
    discNumber?: number
    duration?: number
    coverArt?: string
    createdAt: string
    updatedAt: string
    // Runtime properties (not stored in DB)
    file?: File
    handle?: FileSystemFileHandle
    isLiked?: boolean
    objectUrl?: string
    isAvailable?: boolean // Track has file handle/file available
}

export interface LocalPlaylist {
    id: string
    userId: string
    name: string
    description?: string
    coverColor: string
    trackCount?: number
    tracks?: LocalTrack[]
    createdAt: string
    updatedAt: string
}

export interface PlaybackState {
    isPlaying: boolean
    currentTrack: LocalTrack | null
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    isShuffled: boolean
    repeatMode: 'off' | 'all' | 'one'
    queue: LocalTrack[]
    queueIndex: number
}

const DB_NAME = 'castium-music-db'
const DB_VERSION = 2 // Bumped version for user-specific storage
const FOLDER_STORE = 'folder-handles'

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma', '.opus']

// Global state for music (persists across component instances)
const folderHandle = ref<FileSystemDirectoryHandle | null>(null)
const tracks = ref<LocalTrack[]>([])
const playlists = ref<LocalPlaylist[]>([])
const likedTrackIds = ref<Set<string>>(new Set())
const likedDbTracks = ref<LocalTrack[]>([]) // Liked tracks from DB
const loading = ref(false)
const hasPermission = ref(false)
const usesFallback = ref(false)
const needsReauthorization = ref(false)
const savedFolderName = ref<string | null>(null)
const currentFolderPath = ref<string | null>(null) // Track current folder for availability

// Audio player state
const audioElement = ref<HTMLAudioElement | null>(null)
const playbackState = ref<PlaybackState>({
    isPlaying: false,
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isShuffled: false,
    repeatMode: 'off',
    queue: [],
    queueIndex: -1,
})

export const useLocalMusic = () => {
    const supabase = useSupabase()
    const { user } = useAuth()

    // Check if File System Access API is available
    const isFileSystemAPISupported = computed(() => {
        if (typeof window === 'undefined') return false
        return 'showDirectoryPicker' in window
    })

    // IndexedDB helpers for storing folder handle (per user)
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

    // Get folder key for current user
    const getFolderKey = (): string => {
        return user.value?.id ? `music-folder-${user.value.id}` : 'music-folder-anonymous'
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

    // Clear local state (called on logout)
    const clearLocalState = (): void => {
        folderHandle.value = null
        tracks.value = []
        playlists.value = []
        likedTrackIds.value = new Set()
        likedDbTracks.value = []
        hasPermission.value = false
        usesFallback.value = false
        needsReauthorization.value = false
        savedFolderName.value = null
        currentFolderPath.value = null

        // Stop playback
        if (audioElement.value) {
            audioElement.value.pause()
            audioElement.value.src = ''
        }
        playbackState.value = {
            isPlaying: false,
            currentTrack: null,
            currentTime: 0,
            duration: 0,
            volume: playbackState.value.volume,
            isMuted: playbackState.value.isMuted,
            isShuffled: false,
            repeatMode: 'off',
            queue: [],
            queueIndex: -1,
        }
    }

    // Extract audio metadata using Web Audio API and ID3 tags
    const extractMetadata = async (file: File): Promise<Partial<LocalTrack>> => {
        return new Promise((resolve) => {
            const audio = document.createElement('audio')
            audio.preload = 'metadata'

            const objectUrl = URL.createObjectURL(file)
            audio.src = objectUrl

            audio.onloadedmetadata = () => {
                const metadata: Partial<LocalTrack> = {
                    duration: audio.duration,
                    title: file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' '),
                }

                URL.revokeObjectURL(objectUrl)
                resolve(metadata)
            }

            audio.onerror = () => {
                URL.revokeObjectURL(objectUrl)
                resolve({
                    title: file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' '),
                })
            }
        })
    }

    // Scan folder for audio files
    const scanFolder = async (
        handle: FileSystemDirectoryHandle,
        basePath = ''
    ): Promise<{ file: File; path: string; handle: FileSystemFileHandle }[]> => {
        const files: { file: File; path: string; handle: FileSystemFileHandle }[] = []

        for await (const entry of handle.values()) {
            const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name

            if (entry.kind === 'file') {
                const ext = '.' + entry.name.split('.').pop()?.toLowerCase()
                if (AUDIO_EXTENSIONS.includes(ext)) {
                    try {
                        const fileHandle = entry as FileSystemFileHandle
                        const file = await fileHandle.getFile()
                        files.push({ file, path: entryPath, handle: fileHandle })
                    } catch (e) {
                        console.warn('[LocalMusic] Could not read file:', entryPath, e)
                    }
                }
            } else if (entry.kind === 'directory') {
                const subFiles = await scanFolder(entry as FileSystemDirectoryHandle, entryPath)
                files.push(...subFiles)
            }
        }

        return files
    }

    // Select folder with File System Access API
    const selectFolder = async (): Promise<boolean> => {
        try {
            loading.value = true

            if (!isFileSystemAPISupported.value) {
                return await selectFolderFallback()
            }

            const handle = await window.showDirectoryPicker({ mode: 'read' })
            folderHandle.value = handle
            savedFolderName.value = handle.name
            hasPermission.value = true
            usesFallback.value = false
            needsReauthorization.value = false

            await saveFolderHandle(handle)
            await scanForTracks()

            return true
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                console.error('[LocalMusic] Error selecting folder:', e)
            }
            return false
        } finally {
            loading.value = false
        }
    }

    // Fallback folder selection
    const selectFolderFallback = (): Promise<boolean> => {
        return new Promise((resolve) => {
            const input = document.createElement('input')
            input.type = 'file'
            input.setAttribute('webkitdirectory', '')
            input.setAttribute('directory', '')
            input.multiple = true
            input.style.display = 'none'

            input.onchange = async () => {
                const files = input.files
                if (!files || files.length === 0) {
                    resolve(false)
                    return
                }

                loading.value = true
                usesFallback.value = true
                hasPermission.value = true

                const audioFiles: LocalTrack[] = []

                for (const file of Array.from(files)) {
                    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
                    if (AUDIO_EXTENSIONS.includes(ext)) {
                        const metadata = await extractMetadata(file)
                        audioFiles.push({
                            id: crypto.randomUUID(),
                            userId: user.value?.id || '',
                            filePath: file.webkitRelativePath || file.name,
                            fileName: file.name,
                            fileSize: file.size,
                            mimeType: file.type || 'audio/mpeg',
                            file,
                            ...metadata,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        } as LocalTrack)
                    }
                }

                tracks.value = audioFiles
                await syncTracksToDatabase()
                loading.value = false
                document.body.removeChild(input)
                resolve(true)
            }

            input.oncancel = () => {
                document.body.removeChild(input)
                resolve(false)
            }

            document.body.appendChild(input)
            input.click()
        })
    }

    // Scan for audio tracks
    const scanForTracks = async (): Promise<void> => {
        if (!folderHandle.value) return

        loading.value = true

        try {
            const files = await scanFolder(folderHandle.value)
            const audioTracks: LocalTrack[] = []

            for (const { file, path, handle } of files) {
                const metadata = await extractMetadata(file)
                audioTracks.push({
                    id: crypto.randomUUID(),
                    userId: user.value?.id || '',
                    filePath: path,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type || 'audio/mpeg',
                    handle,
                    file,
                    isAvailable: true,
                    ...metadata,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                } as LocalTrack)
            }

            tracks.value = audioTracks
            currentFolderPath.value = folderHandle.value.name
            await syncTracksToDatabase()
            await loadLikedTracksFromDb()
        } catch (e) {
            console.error('[LocalMusic] Error scanning folder:', e)
        } finally {
            loading.value = false
        }
    }

    // Sync tracks to Supabase
    const syncTracksToDatabase = async (): Promise<void> => {
        if (!user.value) return

        try {
            for (const track of tracks.value) {
                const { error } = await supabase.from('local_tracks').upsert(
                    {
                        user_id: user.value.id,
                        file_path: track.filePath,
                        file_name: track.fileName,
                        file_size: track.fileSize,
                        mime_type: track.mimeType,
                        title: track.title,
                        artist: track.artist,
                        album: track.album,
                        album_artist: track.albumArtist,
                        year: track.year,
                        genre: track.genre,
                        track_number: track.trackNumber,
                        disc_number: track.discNumber,
                        duration: track.duration,
                        cover_art: track.coverArt,
                    },
                    {
                        onConflict: 'user_id,file_path',
                    }
                )

                if (error) {
                    console.warn('[LocalMusic] Error syncing track:', error)
                }
            }

            // Load liked tracks
            await loadLikedTracks()
        } catch (e) {
            console.error('[LocalMusic] Error syncing to database:', e)
        }
    }

    // Restore folder access on mount
    const restoreFolderAccess = async (): Promise<boolean> => {
        if (!isFileSystemAPISupported.value) return false

        try {
            const handle = await loadFolderHandle()
            if (!handle) return false

            savedFolderName.value = handle.name

            const permission = await handle.queryPermission({ mode: 'read' })
            if (permission === 'granted') {
                folderHandle.value = handle
                hasPermission.value = true
                needsReauthorization.value = false
                await scanForTracks()
                return true
            } else {
                needsReauthorization.value = true
                return false
            }
        } catch (e) {
            console.error('[LocalMusic] Error restoring folder access:', e)
            return false
        }
    }

    // Reauthorize access
    const reauthorizeAccess = async (): Promise<boolean> => {
        try {
            const handle = await loadFolderHandle()
            if (!handle) return false

            const permission = await handle.requestPermission({ mode: 'read' })
            if (permission === 'granted') {
                folderHandle.value = handle
                hasPermission.value = true
                needsReauthorization.value = false
                await scanForTracks()
                return true
            }
            return false
        } catch (e) {
            console.error('[LocalMusic] Error reauthorizing:', e)
            return false
        }
    }

    // ============ PLAYLIST MANAGEMENT ============

    // Load playlists from database
    const loadPlaylists = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error } = await supabase
                .from('local_playlists')
                .select(
                    `
                    *,
                    local_playlist_tracks(
                        track_id,
                        position
                    )
                `
                )
                .eq('user_id', user.value.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            playlists.value = (data || []).map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                name: p.name,
                description: p.description,
                coverColor: p.cover_color || generateRandomColor(),
                trackCount: p.local_playlist_tracks?.length || 0,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
            }))
        } catch (e) {
            console.error('[LocalMusic] Error loading playlists:', e)
        }
    }

    // Create a new playlist
    const createPlaylist = async (
        name: string,
        description?: string
    ): Promise<LocalPlaylist | null> => {
        if (!user.value) return null

        try {
            const { data, error } = await supabase
                .from('local_playlists')
                .insert({
                    user_id: user.value.id,
                    name,
                    description,
                    cover_color: generateRandomColor(),
                })
                .select()
                .single()

            if (error) throw error

            const playlist: LocalPlaylist = {
                id: data.id,
                userId: data.user_id,
                name: data.name,
                description: data.description,
                coverColor: data.cover_color,
                trackCount: 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            }

            playlists.value.unshift(playlist)
            return playlist
        } catch (e) {
            console.error('[LocalMusic] Error creating playlist:', e)
            return null
        }
    }

    // Delete a playlist
    const deletePlaylist = async (playlistId: string): Promise<boolean> => {
        try {
            const { error } = await supabase.from('local_playlists').delete().eq('id', playlistId)

            if (error) throw error

            playlists.value = playlists.value.filter((p) => p.id !== playlistId)
            return true
        } catch (e) {
            console.error('[LocalMusic] Error deleting playlist:', e)
            return false
        }
    }

    // Update playlist
    const updatePlaylist = async (
        playlistId: string,
        updates: Partial<LocalPlaylist>
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('local_playlists')
                .update({
                    name: updates.name,
                    description: updates.description,
                })
                .eq('id', playlistId)

            if (error) throw error

            const index = playlists.value.findIndex((p) => p.id === playlistId)
            if (index !== -1) {
                playlists.value[index] = { ...playlists.value[index], ...updates }
            }
            return true
        } catch (e) {
            console.error('[LocalMusic] Error updating playlist:', e)
            return false
        }
    }

    // Get playlist tracks
    const getPlaylistTracks = async (playlistId: string): Promise<LocalTrack[]> => {
        try {
            const { data, error } = await supabase
                .from('local_playlist_tracks')
                .select(
                    `
                    position,
                    local_tracks(*)
                `
                )
                .eq('playlist_id', playlistId)
                .order('position', { ascending: true })

            if (error) throw error

            return (data || [])
                .map((item: any) => {
                    const t = item.local_tracks
                    if (!t) return null
                    // Check if this track is available in current folder
                    const availableTrack = tracks.value.find((tr) => tr.filePath === t.file_path)
                    return {
                        id: t.id,
                        userId: t.user_id,
                        filePath: t.file_path,
                        fileName: t.file_name,
                        fileSize: t.file_size,
                        mimeType: t.mime_type,
                        title: t.title,
                        artist: t.artist,
                        album: t.album,
                        duration: t.duration,
                        coverArt: t.cover_art,
                        createdAt: t.created_at,
                        updatedAt: t.updated_at,
                        file: availableTrack?.file,
                        handle: availableTrack?.handle,
                        isLiked: likedTrackIds.value.has(t.id),
                        isAvailable: !!availableTrack,
                    } as LocalTrack
                })
                .filter(Boolean) as LocalTrack[]
        } catch (e) {
            console.error('[LocalMusic] Error getting playlist tracks:', e)
            return []
        }
    }

    // Add track to playlist
    const addTrackToPlaylist = async (
        playlistId: string,
        trackFilePath: string
    ): Promise<boolean> => {
        if (!user.value) return false

        try {
            // First, ensure track exists in database
            const { data: trackData } = await supabase
                .from('local_tracks')
                .select('id')
                .eq('user_id', user.value.id)
                .eq('file_path', trackFilePath)
                .single()

            if (!trackData) {
                console.error('[LocalMusic] Track not found in database')
                return false
            }

            // Check if track already in playlist
            const { data: existingEntry } = await supabase
                .from('local_playlist_tracks')
                .select('id')
                .eq('playlist_id', playlistId)
                .eq('track_id', trackData.id)
                .maybeSingle()

            if (existingEntry) {
                console.log('[LocalMusic] Track already in playlist')
                return true // Already exists, consider it success
            }

            // Get current max position
            const { data: posData } = await supabase
                .from('local_playlist_tracks')
                .select('position')
                .eq('playlist_id', playlistId)
                .order('position', { ascending: false })
                .limit(1)

            const nextPosition = posData && posData.length > 0 ? posData[0].position + 1 : 0

            const { error } = await supabase.from('local_playlist_tracks').insert({
                playlist_id: playlistId,
                track_id: trackData.id,
                position: nextPosition,
            })

            if (error) throw error

            // Update playlist track count
            const playlist = playlists.value.find((p) => p.id === playlistId)
            if (playlist) {
                playlist.trackCount = (playlist.trackCount || 0) + 1
            }

            return true
        } catch (e) {
            console.error('[LocalMusic] Error adding track to playlist:', e)
            return false
        }
    }

    // Remove track from playlist
    const removeTrackFromPlaylist = async (
        playlistId: string,
        trackId: string
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('local_playlist_tracks')
                .delete()
                .eq('playlist_id', playlistId)
                .eq('track_id', trackId)

            if (error) throw error

            const playlist = playlists.value.find((p) => p.id === playlistId)
            if (playlist && playlist.trackCount) {
                playlist.trackCount--
            }

            return true
        } catch (e) {
            console.error('[LocalMusic] Error removing track from playlist:', e)
            return false
        }
    }

    // ============ LIKED TRACKS ============

    // Load liked tracks IDs (for marking available tracks)
    const loadLikedTracks = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error } = await supabase
                .from('local_liked_tracks')
                .select('track_id')
                .eq('user_id', user.value.id)

            if (error) throw error

            likedTrackIds.value = new Set((data || []).map((l: any) => l.track_id))

            // Update tracks with liked status
            tracks.value.forEach((track) => {
                track.isLiked = likedTrackIds.value.has(track.id)
            })
        } catch (e) {
            console.error('[LocalMusic] Error loading liked tracks:', e)
        }
    }

    // Load liked tracks from DB (with full track info, for showing unavailable tracks)
    const loadLikedTracksFromDb = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error } = await supabase
                .from('local_liked_tracks')
                .select(
                    `
                    track_id,
                    local_tracks(*)
                `
                )
                .eq('user_id', user.value.id)

            if (error) throw error

            likedDbTracks.value = (data || [])
                .map((item: any) => {
                    const t = item.local_tracks
                    if (!t) return null
                    // Check if this track is available in current folder
                    const availableTrack = tracks.value.find((tr) => tr.filePath === t.file_path)
                    return {
                        id: t.id,
                        userId: t.user_id,
                        filePath: t.file_path,
                        fileName: t.file_name,
                        fileSize: t.file_size,
                        mimeType: t.mime_type,
                        title: t.title,
                        artist: t.artist,
                        album: t.album,
                        duration: t.duration,
                        coverArt: t.cover_art,
                        createdAt: t.created_at,
                        updatedAt: t.updated_at,
                        file: availableTrack?.file,
                        handle: availableTrack?.handle,
                        isLiked: true,
                        isAvailable: !!availableTrack,
                    } as LocalTrack
                })
                .filter(Boolean) as LocalTrack[]

            // Update liked status on available tracks
            likedTrackIds.value = new Set(likedDbTracks.value.map((t) => t.id))
            tracks.value.forEach((track) => {
                const dbTrack = likedDbTracks.value.find((t) => t.filePath === track.filePath)
                if (dbTrack) {
                    track.id = dbTrack.id // Use DB id
                    track.isLiked = true
                }
            })
        } catch (e) {
            console.error('[LocalMusic] Error loading liked tracks from DB:', e)
        }
    }

    // Remove liked track (for unavailable tracks)
    const removeLikedTrack = async (trackId: string): Promise<boolean> => {
        if (!user.value) return false

        try {
            const { error } = await supabase
                .from('local_liked_tracks')
                .delete()
                .eq('user_id', user.value.id)
                .eq('track_id', trackId)

            if (error) throw error

            likedTrackIds.value.delete(trackId)
            likedDbTracks.value = likedDbTracks.value.filter((t) => t.id !== trackId)

            // Update track in arrays
            const track = tracks.value.find((t) => t.id === trackId)
            if (track) {
                track.isLiked = false
            }

            return true
        } catch (e) {
            console.error('[LocalMusic] Error removing liked track:', e)
            return false
        }
    }

    // Toggle like on a track
    const toggleLike = async (trackFilePath: string): Promise<boolean> => {
        if (!user.value) return false

        try {
            // Find track in database
            const { data: trackData } = await supabase
                .from('local_tracks')
                .select('id')
                .eq('user_id', user.value.id)
                .eq('file_path', trackFilePath)
                .single()

            if (!trackData) return false

            const isCurrentlyLiked = likedTrackIds.value.has(trackData.id)

            if (isCurrentlyLiked) {
                // Unlike
                const { error } = await supabase
                    .from('local_liked_tracks')
                    .delete()
                    .eq('user_id', user.value.id)
                    .eq('track_id', trackData.id)

                if (error) throw error
                likedTrackIds.value.delete(trackData.id)
                likedDbTracks.value = likedDbTracks.value.filter((t) => t.id !== trackData.id)
            } else {
                // Like
                const { error } = await supabase.from('local_liked_tracks').insert({
                    user_id: user.value.id,
                    track_id: trackData.id,
                })

                if (error) throw error
                likedTrackIds.value.add(trackData.id)

                // Add to likedDbTracks
                const track = tracks.value.find((t) => t.filePath === trackFilePath)
                if (track) {
                    track.id = trackData.id
                    likedDbTracks.value.push({ ...track, isLiked: true, isAvailable: true })
                }
            }

            // Update track in array
            const track = tracks.value.find((t) => t.filePath === trackFilePath)
            if (track) {
                track.isLiked = !isCurrentlyLiked
            }

            return true
        } catch (e) {
            console.error('[LocalMusic] Error toggling like:', e)
            return false
        }
    }

    // Check if track is liked
    const isLiked = (trackFilePath: string): boolean => {
        const track = tracks.value.find((t) => t.filePath === trackFilePath)
        return track?.isLiked || false
    }

    // Get liked tracks (includes unavailable ones from DB)
    const getLikedTracks = computed(() => {
        return likedDbTracks.value
    })

    // ============ PLAYBACK ============

    // Initialize audio element
    const initAudio = (): void => {
        if (typeof window === 'undefined') return
        if (!audioElement.value) {
            audioElement.value = new Audio()
            audioElement.value.volume = playbackState.value.volume

            audioElement.value.ontimeupdate = () => {
                playbackState.value.currentTime = audioElement.value?.currentTime || 0
            }

            audioElement.value.ondurationchange = () => {
                playbackState.value.duration = audioElement.value?.duration || 0
            }

            audioElement.value.onended = () => {
                handleTrackEnd()
            }

            audioElement.value.onplay = () => {
                playbackState.value.isPlaying = true
            }

            audioElement.value.onpause = () => {
                playbackState.value.isPlaying = false
            }
        }
    }

    // Play a track
    const playTrack = async (track: LocalTrack): Promise<void> => {
        initAudio()
        if (!audioElement.value) return

        try {
            // Get file blob URL
            let url: string

            if (track.objectUrl) {
                url = track.objectUrl
            } else if (track.file) {
                url = URL.createObjectURL(track.file)
                track.objectUrl = url
            } else if (track.handle) {
                const file = await track.handle.getFile()
                url = URL.createObjectURL(file)
                track.objectUrl = url
            } else {
                console.error('[LocalMusic] No file available for track:', track.filePath)
                return
            }

            audioElement.value.src = url
            await audioElement.value.play()
            playbackState.value.currentTrack = track
            playbackState.value.isPlaying = true

            // Add to recently played
            await addToRecentlyPlayed(track.filePath)
        } catch (e) {
            console.error('[LocalMusic] Error playing track:', e)
        }
    }

    // Play/pause
    const togglePlay = (): void => {
        if (!audioElement.value) return

        if (audioElement.value.paused) {
            audioElement.value.play()
        } else {
            audioElement.value.pause()
        }
    }

    // Pause
    const pause = (): void => {
        audioElement.value?.pause()
    }

    // Resume
    const resume = (): void => {
        audioElement.value?.play()
    }

    // Seek
    const seek = (time: number): void => {
        if (audioElement.value) {
            audioElement.value.currentTime = time
        }
    }

    // Set volume
    const setVolume = (volume: number): void => {
        playbackState.value.volume = volume
        if (audioElement.value) {
            audioElement.value.volume = volume
        }
    }

    // Toggle mute
    const toggleMute = (): void => {
        playbackState.value.isMuted = !playbackState.value.isMuted
        if (audioElement.value) {
            audioElement.value.muted = playbackState.value.isMuted
        }
    }

    // Play queue
    const playQueue = (trackList: LocalTrack[], startIndex = 0): void => {
        playbackState.value.queue = trackList
        playbackState.value.queueIndex = startIndex
        if (trackList[startIndex]) {
            playTrack(trackList[startIndex])
        }
    }

    // Next track
    const nextTrack = (): void => {
        const { queue, queueIndex, repeatMode, isShuffled } = playbackState.value

        if (queue.length === 0) return

        let nextIndex: number

        if (isShuffled) {
            nextIndex = Math.floor(Math.random() * queue.length)
        } else {
            nextIndex = queueIndex + 1
            if (nextIndex >= queue.length) {
                if (repeatMode === 'all') {
                    nextIndex = 0
                } else {
                    return
                }
            }
        }

        playbackState.value.queueIndex = nextIndex
        playTrack(queue[nextIndex])
    }

    // Previous track
    const previousTrack = (): void => {
        const { queue, queueIndex } = playbackState.value

        if (queue.length === 0) return

        // If more than 3 seconds in, restart current track
        if (playbackState.value.currentTime > 3) {
            seek(0)
            return
        }

        const prevIndex = queueIndex - 1
        if (prevIndex < 0) return

        playbackState.value.queueIndex = prevIndex
        playTrack(queue[prevIndex])
    }

    // Handle track end
    const handleTrackEnd = (): void => {
        const { repeatMode } = playbackState.value

        if (repeatMode === 'one') {
            seek(0)
            audioElement.value?.play()
        } else {
            nextTrack()
        }
    }

    // Toggle shuffle
    const toggleShuffle = (): void => {
        playbackState.value.isShuffled = !playbackState.value.isShuffled
    }

    // Toggle repeat mode
    const toggleRepeat = (): void => {
        const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one']
        const currentIndex = modes.indexOf(playbackState.value.repeatMode)
        playbackState.value.repeatMode = modes[(currentIndex + 1) % modes.length]
    }

    // ============ RECENTLY PLAYED ============

    const addToRecentlyPlayed = async (trackFilePath: string): Promise<void> => {
        if (!user.value) return

        try {
            const { data: trackData } = await supabase
                .from('local_tracks')
                .select('id')
                .eq('user_id', user.value.id)
                .eq('file_path', trackFilePath)
                .single()

            if (!trackData) return

            await supabase.from('local_recently_played').insert({
                user_id: user.value.id,
                track_id: trackData.id,
            })
        } catch (e) {
            console.warn('[LocalMusic] Error adding to recently played:', e)
        }
    }

    // ============ HELPERS ============

    const generateRandomColor = (): string => {
        const colors = [
            '#dc2626',
            '#ea580c',
            '#d97706',
            '#65a30d',
            '#16a34a',
            '#0891b2',
            '#2563eb',
            '#7c3aed',
            '#c026d3',
            '#e11d48',
        ]
        return colors[Math.floor(Math.random() * colors.length)]
    }

    const formatDuration = (seconds?: number): string => {
        if (!seconds) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    // Group tracks by album
    const tracksByAlbum = computed(() => {
        const albums: Record<string, LocalTrack[]> = {}
        tracks.value.forEach((track) => {
            const album = track.album || 'Unknown Album'
            if (!albums[album]) albums[album] = []
            albums[album].push(track)
        })
        return albums
    })

    // Group tracks by artist
    const tracksByArtist = computed(() => {
        const artists: Record<string, LocalTrack[]> = {}
        tracks.value.forEach((track) => {
            const artist = track.artist || 'Unknown Artist'
            if (!artists[artist]) artists[artist] = []
            artists[artist].push(track)
        })
        return artists
    })

    return {
        // State
        tracks,
        playlists,
        loading,
        hasPermission,
        usesFallback,
        needsReauthorization,
        savedFolderName,
        playbackState,
        likedTrackIds,
        likedDbTracks,

        // Computed
        isFileSystemAPISupported,
        getLikedTracks,
        tracksByAlbum,
        tracksByArtist,

        // Folder management
        selectFolder,
        restoreFolderAccess,
        reauthorizeAccess,
        scanForTracks,
        clearLocalState,

        // Playlist management
        loadPlaylists,
        createPlaylist,
        deletePlaylist,
        updatePlaylist,
        getPlaylistTracks,
        addTrackToPlaylist,
        removeTrackFromPlaylist,

        // Likes
        toggleLike,
        isLiked,
        loadLikedTracks,
        loadLikedTracksFromDb,
        removeLikedTrack,

        // Playback
        playTrack,
        playQueue,
        togglePlay,
        pause,
        resume,
        seek,
        setVolume,
        toggleMute,
        nextTrack,
        previousTrack,
        toggleShuffle,
        toggleRepeat,

        // Helpers
        formatDuration,
        formatFileSize,
        generateRandomColor,
    }
}
