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

export interface PhotoFile {
    name: string
    path: string
    size: number
    lastModified: number
    type: string
    handle?: FileSystemFileHandle
    file?: File
    folder?: string // Parent folder name for album grouping
    thumbnail?: string // Thumbnail URL or base64
    // EXIF metadata
    width?: number
    height?: number
    takenAt?: Date
    cameraMake?: string
    cameraModel?: string
    lensModel?: string
    focalLength?: string
    aperture?: string
    shutterSpeed?: string
    iso?: number
    flashUsed?: boolean
    latitude?: number
    longitude?: number
    altitude?: number
}

export interface PhotoAlbum {
    name: string
    folderPath: string
    photos: PhotoFile[]
    thumbnail?: string
    photoCount: number
}

const DB_NAME = 'castium-photos-db'
const DB_VERSION = 1
const FOLDER_STORE = 'folder-handles'
const LIKED_PHOTOS_STORE = 'liked-photos'

export const useLocalPhotos = () => {
    const { profile, updateProfile, user } = useAuth()
    const supabase = useSupabase()

    const folderHandle = useState<FileSystemDirectoryHandle | null>(
        'photo_folder_handle',
        () => null
    )
    const photos = useState<PhotoFile[]>('photo_files', () => [])
    const currentPhoto = useState<PhotoFile | null>('current_photo', () => null)
    const loading = useState<boolean>('photos_loading', () => false)
    const hasPermission = useState<boolean>('photos_permission', () => false)
    const usesFallback = useState<boolean>('photos_uses_fallback', () => false)
    const needsReauthorization = useState<boolean>('photos_needs_reauth', () => false)
    const savedFolderName = useState<string | null>('saved_photo_folder_name', () => null)
    const likedPhotos = useState<PhotoFile[]>('liked_local_photos', () => [])

    // Check if File System Access API is available
    const isFileSystemAPISupported = computed(() => {
        if (typeof window === 'undefined') return false
        return 'showDirectoryPicker' in window
    })

    // Albums computed from folder structure
    const albums = computed<PhotoAlbum[]>(() => {
        const folderMap = new Map<string, PhotoFile[]>()

        for (const photo of photos.value) {
            const folder = photo.folder || 'Root'
            if (!folderMap.has(folder)) {
                folderMap.set(folder, [])
            }
            folderMap.get(folder)!.push(photo)
        }

        return Array.from(folderMap.entries())
            .filter(([name]) => name !== 'Root')
            .map(([name, pics]) => ({
                name,
                folderPath: name,
                photos: pics.sort((a, b) => {
                    // Sort by date taken if available, otherwise by name
                    if (a.takenAt && b.takenAt) {
                        return b.takenAt.getTime() - a.takenAt.getTime()
                    }
                    return a.name.localeCompare(b.name)
                }),
                thumbnail: pics[0]?.thumbnail,
                photoCount: pics.length
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
    })

    // Photos without folder (root level)
    const rootPhotos = computed(() => {
        return photos.value.filter(p => !p.folder || p.folder === 'Root')
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
                if (!db.objectStoreNames.contains(LIKED_PHOTOS_STORE)) {
                    db.createObjectStore(LIKED_PHOTOS_STORE, { keyPath: 'path' })
                }
            }
        })
    }

    // Get folder key for current user
    const getFolderKey = (): string => {
        return user.value?.id ? `photo-folder-${user.value.id}` : 'photo-folder-anonymous'
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
        photos.value = []
        currentPhoto.value = null
        hasPermission.value = false
        usesFallback.value = false
        needsReauthorization.value = false
        savedFolderName.value = null
        likedPhotos.value = []
    }

    // Extract EXIF metadata from image file
    const extractExifMetadata = async (file: File): Promise<Partial<PhotoFile>> => {
        const metadata: Partial<PhotoFile> = {}

        try {
            // Create image to get dimensions
            const url = URL.createObjectURL(file)
            const img = new Image()

            await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    metadata.width = img.naturalWidth
                    metadata.height = img.naturalHeight
                    resolve()
                }
                img.onerror = reject
                img.src = url
            })

            URL.revokeObjectURL(url)

            // Try to extract EXIF using DataView (basic implementation)
            const arrayBuffer = await file.arrayBuffer()
            const dataView = new DataView(arrayBuffer)

            // Check for JPEG (0xFFD8)
            if (dataView.getUint16(0) === 0xFFD8) {
                // Basic EXIF parsing - look for Exif marker
                let offset = 2
                while (offset < dataView.byteLength - 2) {
                    const marker = dataView.getUint16(offset)
                    if (marker === 0xFFE1) {
                        // Found Exif
                        const length = dataView.getUint16(offset + 2)
                        // Check for "Exif" string
                        const exifHeader = String.fromCharCode(
                            dataView.getUint8(offset + 4),
                            dataView.getUint8(offset + 5),
                            dataView.getUint8(offset + 6),
                            dataView.getUint8(offset + 7)
                        )
                        if (exifHeader === 'Exif') {
                            // Parse basic EXIF data
                            // This is a simplified implementation
                            // For production, consider using a library like exifr
                        }
                        break
                    } else if ((marker & 0xFF00) === 0xFF00) {
                        const length = dataView.getUint16(offset + 2)
                        offset += length + 2
                    } else {
                        break
                    }
                }
            }
        } catch (error) {
            console.warn('Error extracting EXIF:', error)
        }

        return metadata
    }

    // Generate thumbnail for photo
    const generateThumbnail = async (file: File, maxSize: number = 200): Promise<string> => {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file)
            const img = new Image()

            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    URL.revokeObjectURL(url)
                    reject(new Error('Could not get canvas context'))
                    return
                }

                // Calculate thumbnail dimensions
                let width = img.naturalWidth
                let height = img.naturalHeight

                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width)
                        width = maxSize
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height)
                        height = maxSize
                    }
                }

                canvas.width = width
                canvas.height = height
                ctx.drawImage(img, 0, 0, width, height)

                URL.revokeObjectURL(url)
                resolve(canvas.toDataURL('image/jpeg', 0.7))
            }

            img.onerror = () => {
                URL.revokeObjectURL(url)
                reject(new Error('Failed to load image'))
            }

            img.src = url
        })
    }

    // Fallback: use input[type=file] with webkitdirectory
    const selectFolderFallback = (): Promise<boolean> => {
        return new Promise((resolve) => {
            const input = document.createElement('input')
            input.type = 'file'
            input.setAttribute('webkitdirectory', '')
            input.setAttribute('directory', '')
            input.multiple = true
            input.accept = 'image/*'
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

                // Convert FileList to PhotoFile array
                const photoFiles: PhotoFile[] = []
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif', '.avif']

                for (const file of Array.from(files)) {
                    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
                    if (imageExtensions.includes(ext)) {
                        const metadata = await extractExifMetadata(file)
                        let thumbnail: string | undefined
                        try {
                            thumbnail = await generateThumbnail(file)
                        } catch (e) {
                            console.warn('Failed to generate thumbnail:', e)
                        }

                        // Extract folder from path
                        const pathParts = (file.webkitRelativePath || file.name).split('/')
                        const folder = pathParts.length > 2 ? pathParts[pathParts.length - 2] : undefined

                        photoFiles.push({
                            name: file.name,
                            path: file.webkitRelativePath || file.name,
                            size: file.size,
                            lastModified: file.lastModified,
                            type: file.type || 'image/jpeg',
                            file: file,
                            folder,
                            thumbnail,
                            ...metadata
                        })
                    }
                }

                photos.value = photoFiles
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

            if (!isFileSystemAPISupported.value) {
                loading.value = false
                return await selectFolderFallback()
            }

            const handle = await window.showDirectoryPicker({
                mode: 'read',
            })

            folderHandle.value = handle
            hasPermission.value = true
            usesFallback.value = false

            await saveFolderHandle(handle)
            savedFolderName.value = handle.name
            await scanForPhotos()

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
            needsReauthorization.value = false

            if (!isFileSystemAPISupported.value) {
                loading.value = false
                return false
            }

            const savedHandle = await loadFolderHandle()
            if (!savedHandle) {
                loading.value = false
                return false
            }

            savedFolderName.value = savedHandle.name

            const currentPermission = await savedHandle.queryPermission({
                mode: 'read',
            })

            if (currentPermission === 'granted') {
                folderHandle.value = savedHandle
                hasPermission.value = true
                needsReauthorization.value = false
                await scanForPhotos()
                loading.value = false
                return true
            }

            if (currentPermission === 'prompt') {
                try {
                    const entries = savedHandle.values()
                    await entries.next()

                    folderHandle.value = savedHandle
                    hasPermission.value = true
                    needsReauthorization.value = false
                    await scanForPhotos()
                    loading.value = false
                    return true
                } catch {
                    // No access
                }
            }

            folderHandle.value = savedHandle
            needsReauthorization.value = true
            loading.value = false
            return false
        } catch (error) {
            console.error('Error restoring folder access:', error)
            loading.value = false
            return false
        }
    }

    // Re-authorize access
    const reauthorizeAccess = async (): Promise<boolean> => {
        try {
            loading.value = true

            if (folderHandle.value) {
                const permission = await folderHandle.value.requestPermission({
                    mode: 'read',
                })
                if (permission === 'granted') {
                    hasPermission.value = true
                    needsReauthorization.value = false
                    await scanForPhotos()
                    loading.value = false
                    return true
                }
            }

            loading.value = false
            return await selectFolder()
        } catch (error) {
            console.error('Error reauthorizing access:', error)
            loading.value = false
            return false
        }
    }

    // Scan folder for photo files
    const scanForPhotos = async (): Promise<void> => {
        if (!folderHandle.value) return

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif', '.avif']
        const foundPhotos: PhotoFile[] = []

        const scanDirectory = async (dirHandle: FileSystemDirectoryHandle, path: string = '', parentFolder: string = '') => {
            const currentFolder = path.split('/').pop() || ''

            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    const fileName = entry.name.toLowerCase()
                    if (imageExtensions.some((ext) => fileName.endsWith(ext))) {
                        try {
                            const file = await entry.getFile()
                            const metadata = await extractExifMetadata(file)
                            let thumbnail: string | undefined
                            try {
                                thumbnail = await generateThumbnail(file)
                            } catch (e) {
                                console.warn('Failed to generate thumbnail:', e)
                            }

                            foundPhotos.push({
                                name: entry.name,
                                path: path ? `${path}/${entry.name}` : entry.name,
                                size: file.size,
                                lastModified: file.lastModified,
                                type: file.type,
                                handle: entry,
                                folder: currentFolder || parentFolder || undefined,
                                thumbnail,
                                ...metadata
                            })
                        } catch (e) {
                            console.warn(`Could not read file: ${entry.name}`, e)
                        }
                    }
                } else if (entry.kind === 'directory') {
                    await scanDirectory(entry, path ? `${path}/${entry.name}` : entry.name, currentFolder)
                }
            }
        }

        await scanDirectory(folderHandle.value)
        photos.value = foundPhotos.sort((a, b) => {
            // Sort by date taken if available
            if (a.takenAt && b.takenAt) {
                return b.takenAt.getTime() - a.takenAt.getTime()
            }
            return a.name.localeCompare(b.name)
        })
    }

    // Get photo URL for display
    const getPhotoUrl = async (photo: PhotoFile): Promise<string | null> => {
        try {
            if (photo.file) {
                return URL.createObjectURL(photo.file)
            }

            if (photo.handle) {
                const file = await photo.handle.getFile()
                return URL.createObjectURL(file)
            }

            return null
        } catch (error) {
            console.error('Error getting photo URL:', error)
            return null
        }
    }

    // View a photo (set as current)
    const viewPhoto = (photo: PhotoFile): void => {
        currentPhoto.value = photo
    }

    // Close current photo
    const closePhoto = (): void => {
        currentPhoto.value = null
    }

    // Toggle like for a photo
    const toggleLike = async (photo: PhotoFile): Promise<void> => {
        const index = likedPhotos.value.findIndex(p => p.path === photo.path)

        if (index > -1) {
            // Unlike
            likedPhotos.value.splice(index, 1)
            // Remove from Supabase
            if (user.value?.id) {
                await supabase
                    .from('local_liked_photos')
                    .delete()
                    .eq('user_id', user.value.id)
                    .eq('file_path', photo.path)
            }
        } else {
            // Like
            likedPhotos.value.push(photo)
            // Save to Supabase
            if (user.value?.id) {
                await supabase
                    .from('local_liked_photos')
                    .upsert({
                        user_id: user.value.id,
                        file_path: photo.path,
                        file_name: photo.name,
                        title: photo.name.replace(/\.[^/.]+$/, ''),
                        width: photo.width,
                        height: photo.height,
                        taken_at: photo.takenAt?.toISOString(),
                        thumbnail_base64: photo.thumbnail
                    }, { onConflict: 'user_id,file_path' })
            }
        }

        // Save to IndexedDB
        try {
            const db = await openDB()
            const tx = db.transaction(LIKED_PHOTOS_STORE, 'readwrite')
            const store = tx.objectStore(LIKED_PHOTOS_STORE)

            if (index > -1) {
                store.delete(photo.path)
            } else {
                // Only store serializable data (exclude handle and file which can't be cloned)
                const serializablePhoto = {
                    name: photo.name,
                    path: photo.path,
                    filePath: photo.filePath,
                    size: photo.size,
                    type: photo.type,
                    folder: photo.folder,
                    thumbnail: photo.thumbnail,
                    width: photo.width,
                    height: photo.height,
                    takenAt: photo.takenAt?.toISOString(),
                    cameraMake: photo.cameraMake,
                    cameraModel: photo.cameraModel,
                    iso: photo.iso,
                    aperture: photo.aperture,
                }
                store.put(serializablePhoto)
            }
        } catch (error) {
            console.error('Error saving liked photo to IndexedDB:', error)
        }
    }

    // Check if photo is liked
    const isLiked = (photoPath: string): boolean => {
        return likedPhotos.value.some(p => p.path === photoPath)
    }

    // Load liked photos from Supabase and IndexedDB
    const loadLikedPhotos = async (): Promise<void> => {
        if (!user.value?.id) return

        try {
            // Load from Supabase
            const { data } = await supabase
                .from('local_liked_photos')
                .select('*')
                .eq('user_id', user.value.id)

            if (data) {
                // Convert to PhotoFile format
                const likedFromDb: PhotoFile[] = data.map(item => ({
                    name: item.file_name,
                    path: item.file_path,
                    size: 0,
                    lastModified: 0,
                    type: 'image/jpeg',
                    thumbnail: item.thumbnail_base64,
                    width: item.width,
                    height: item.height,
                    takenAt: item.taken_at ? new Date(item.taken_at) : undefined
                }))
                likedPhotos.value = likedFromDb
            }
        } catch (error) {
            console.error('Error loading liked photos:', error)
        }
    }

    // Get photos by album/folder
    const getPhotosByFolder = (folderName: string): PhotoFile[] => {
        return photos.value.filter(p => p.folder === folderName)
    }

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

    // Format date
    const formatDate = (date: Date | undefined): string => {
        if (!date) return ''
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Get photo color for placeholder
    const getPhotoColor = (photo: PhotoFile): string => {
        const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
            '#f97316', '#eab308', '#22c55e', '#14b8a6',
            '#06b6d4', '#6366f1'
        ]
        const index = (photo.name.length + (photo.size % 100)) % colors.length
        return colors[index]
    }

    return {
        folderHandle: readonly(folderHandle),
        photos: readonly(photos),
        currentPhoto: readonly(currentPhoto),
        loading: readonly(loading),
        hasPermission: readonly(hasPermission),
        usesFallback: readonly(usesFallback),
        isFileSystemAPISupported,
        albums,
        rootPhotos,
        likedPhotos: readonly(likedPhotos),
        selectFolder,
        restoreFolderAccess,
        reauthorizeAccess,
        scanForPhotos,
        getPhotoUrl,
        viewPhoto,
        closePhoto,
        toggleLike,
        isLiked,
        loadLikedPhotos,
        getPhotosByFolder,
        formatSize,
        formatDate,
        getPhotoColor,
        extractExifMetadata,
        generateThumbnail,
        needsReauthorization: readonly(needsReauthorization),
        savedFolderName: readonly(savedFolderName),
        clearLocalState,
    }
}
