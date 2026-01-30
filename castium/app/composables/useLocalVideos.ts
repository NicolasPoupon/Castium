// File System Access API types (not yet in standard TypeScript lib)
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

export interface VideoFile {
    name: string
    path: string
    size: number
    lastModified: number
    type: string
    handle?: FileSystemFileHandle
    file?: File
}

export interface VideoProgress {
    videoPath: string
    currentTime: number
    duration: number
    lastWatched: string
}

const DB_NAME = 'castium-videos-db'
const DB_VERSION = 1
const FOLDER_STORE = 'folder-handles'
const FOLDER_KEY = 'video-folder'

export const useLocalVideos = () => {
    const { profile, updateProfile } = useAuth()

    const folderHandle = useState<FileSystemDirectoryHandle | null>(
        'video_folder_handle',
        () => null
    )
    const videos = useState<VideoFile[]>('video_files', () => [])
    const currentVideo = useState<VideoFile | null>('current_video', () => null)
    const isPlaying = useState<boolean>('video_playing', () => false)
    const loading = useState<boolean>('videos_loading', () => false)
    const hasPermission = useState<boolean>('folder_permission', () => false)
    const usesFallback = useState<boolean>('videos_uses_fallback', () => false)

    // Check if File System Access API is available
    const isFileSystemAPISupported = computed(() => {
        if (typeof window === 'undefined') return false
        return 'showDirectoryPicker' in window
    })

    // Favorites and history from profile
    const favorites = computed(() => profile.value?.video_favorites || [])
    const watchingProgress = computed(() => profile.value?.video_watching || {})
    const watchedHistory = computed(() => profile.value?.video_watched || [])

    // IndexedDB helpers for storing folder handle
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

    const saveFolderHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(FOLDER_STORE, 'readwrite')
            const store = tx.objectStore(FOLDER_STORE)
            const request = store.put(handle, FOLDER_KEY)

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
                const request = store.get(FOLDER_KEY)

                request.onerror = () => reject(request.error)
                request.onsuccess = () => resolve(request.result || null)
            })
        } catch {
            return null
        }
    }

    // Check if we have permission to access the folder
    const checkPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
        try {
            const permission = await handle.queryPermission({ mode: 'read' })
            if (permission === 'granted') {
                return true
            }
            // Try to request permission
            const newPermission = await handle.requestPermission({ mode: 'read' })
            return newPermission === 'granted'
        } catch {
            return false
        }
    }

    // Fallback: use input[type=file] with webkitdirectory
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

                // Convert FileList to VideoFile array
                const videoFiles: VideoFile[] = []
                const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v']

                for (const file of Array.from(files)) {
                    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
                    if (videoExtensions.includes(ext)) {
                        videoFiles.push({
                            name: file.name,
                            path: file.webkitRelativePath || file.name,
                            size: file.size,
                            lastModified: new Date(file.lastModified),
                            file: file,
                        })
                    }
                }

                videos.value = videoFiles
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

    // Open folder picker
    const selectFolder = async (): Promise<boolean> => {
        try {
            loading.value = true

            // Check if File System Access API is supported
            if (!isFileSystemAPISupported.value) {
                loading.value = false
                // Use fallback with input element
                return await selectFolderFallback()
            }

            const handle = await window.showDirectoryPicker({
                mode: 'read',
            })

            folderHandle.value = handle
            hasPermission.value = true
            usesFallback.value = false

            // Save handle to IndexedDB for persistence
            await saveFolderHandle(handle)

            // Update profile with folder path
            await updateProfile({ video_folder_path: handle.name })

            // Scan for videos
            await scanForVideos()

            return true
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting folder:', error)
            }
            return false
        } finally {
            loading.value = false
        }
    }

    // Try to restore folder access from IndexedDB
    const restoreFolderAccess = async (): Promise<boolean> => {
        try {
            loading.value = true

            // Fallback mode doesn't support restoration
            if (usesFallback.value) {
                loading.value = false
                return false
            }

            const savedHandle = await loadFolderHandle()
            if (!savedHandle) {
                loading.value = false
                return false
            }

            const permitted = await checkPermission(savedHandle)
            if (permitted) {
                folderHandle.value = savedHandle
                hasPermission.value = true
                await scanForVideos()
                return true
            }

            loading.value = false
            return false
        } catch (error) {
            console.error('Error restoring folder access:', error)
            return false
        } finally {
            loading.value = false
        }
    }

    // Scan folder for video files
    const scanForVideos = async (): Promise<void> => {
        if (!folderHandle.value) return

        const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.ogv']
        const foundVideos: VideoFile[] = []

        const scanDirectory = async (dirHandle: FileSystemDirectoryHandle, path: string = '') => {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    const fileName = entry.name.toLowerCase()
                    if (videoExtensions.some((ext) => fileName.endsWith(ext))) {
                        try {
                            const file = await entry.getFile()
                            foundVideos.push({
                                name: entry.name,
                                path: path ? `${path}/${entry.name}` : entry.name,
                                size: file.size,
                                lastModified: file.lastModified,
                                type: file.type,
                                handle: entry,
                            })
                        } catch (e) {
                            console.warn(`Could not read file: ${entry.name}`, e)
                        }
                    }
                } else if (entry.kind === 'directory') {
                    await scanDirectory(entry, path ? `${path}/${entry.name}` : entry.name)
                }
            }
        }

        await scanDirectory(folderHandle.value)
        videos.value = foundVideos.sort((a, b) => a.name.localeCompare(b.name))

        // Save video list to profile
        const videoMeta = foundVideos.map((v) => ({
            name: v.name,
            path: v.path,
            size: v.size,
            lastModified: v.lastModified,
        }))
        await updateProfile({ video_files: videoMeta })
    }

    // Get video URL for playback
    const getVideoUrl = async (video: VideoFile): Promise<string | null> => {
        try {
            // Fallback mode: file is already a File object
            if (video.file) {
                return URL.createObjectURL(video.file)
            }

            // File System Access API mode
            if (video.handle) {
                const file = await video.handle.getFile()
                return URL.createObjectURL(file)
            }

            return null
        } catch (error) {
            console.error('Error getting video URL:', error)
            return null
        }
    }

    // Play a video
    const playVideo = async (video: VideoFile): Promise<string | null> => {
        currentVideo.value = video
        const url = await getVideoUrl(video)
        if (url) {
            isPlaying.value = true
            // Add to watched history
            await addToHistory(video.path)
        }
        return url
    }

    // Stop current video
    const stopVideo = () => {
        currentVideo.value = null
        isPlaying.value = false
    }

    // Save playback progress
    const saveProgress = async (videoPath: string, currentTime: number): Promise<void> => {
        const progress = { ...watchingProgress.value }
        progress[videoPath] = currentTime
        await updateProfile({ video_watching: progress })
    }

    // Get saved progress for a video
    const getProgress = (videoPath: string): number => {
        return watchingProgress.value[videoPath] || 0
    }

    // Add to watched history
    const addToHistory = async (videoPath: string): Promise<void> => {
        const history = [...watchedHistory.value]
        // Remove if already exists to move to front
        const index = history.indexOf(videoPath)
        if (index > -1) {
            history.splice(index, 1)
        }
        // Add to front
        history.unshift(videoPath)
        // Keep only last 100
        const trimmed = history.slice(0, 100)
        await updateProfile({ video_watched: trimmed })
    }

    // Toggle favorite
    const toggleFavorite = async (videoPath: string): Promise<void> => {
        const favs = [...favorites.value]
        const index = favs.indexOf(videoPath)
        if (index > -1) {
            favs.splice(index, 1)
        } else {
            favs.push(videoPath)
        }
        await updateProfile({ video_favorites: favs })
    }

    // Check if video is favorite
    const isFavorite = (videoPath: string): boolean => {
        return favorites.value.includes(videoPath)
    }

    // Get videos in progress (continue watching)
    const continueWatching = computed(() => {
        return videos.value
            .filter((v) => {
                const progress = watchingProgress.value[v.path]
                return progress && progress > 0
            })
            .sort((a, b) => {
                // Sort by most recent in history
                const aIndex = watchedHistory.value.indexOf(a.path)
                const bIndex = watchedHistory.value.indexOf(b.path)
                return aIndex - bIndex
            })
    })

    // Get favorite videos
    const favoriteVideos = computed(() => {
        return videos.value.filter((v) => favorites.value.includes(v.path))
    })

    // Format file size
    const formatSize = (bytes: number): string => {
        const units = ['B', 'KB', 'MB', 'GB']
        let size = bytes
        let unitIndex = 0
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024
            unitIndex++
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`
    }

    // Format duration
    const formatDuration = (seconds: number): string => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return {
        folderHandle: readonly(folderHandle),
        videos: readonly(videos),
        currentVideo: readonly(currentVideo),
        isPlaying: readonly(isPlaying),
        loading: readonly(loading),
        hasPermission: readonly(hasPermission),
        usesFallback: readonly(usesFallback),
        isFileSystemAPISupported,
        favorites,
        watchingProgress,
        watchedHistory,
        continueWatching,
        favoriteVideos,
        selectFolder,
        restoreFolderAccess,
        scanForVideos,
        getVideoUrl,
        playVideo,
        stopVideo,
        saveProgress,
        getProgress,
        addToHistory,
        toggleFavorite,
        isFavorite,
        formatSize,
        formatDuration,
    }
}
