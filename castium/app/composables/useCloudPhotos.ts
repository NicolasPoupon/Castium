/**
 * Cloud Photos Composable
 * Manages photo uploads to Supabase Storage with metadata and folder organization
 */

export interface CloudPhoto {
    id: string
    userId: string
    fileName: string
    filePath: string
    fileSize: number
    mimeType: string
    width?: number
    height?: number
    title?: string
    description?: string
    // EXIF data
    takenAt?: string
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
    locationName?: string
    // Thumbnail
    thumbnailPath?: string
    // Timestamps
    createdAt: string
    updatedAt: string
    // Computed
    publicUrl?: string
    thumbnailUrl?: string
    isLiked?: boolean
}

export interface CloudPhotoFolder {
    id: string
    userId: string
    parentId?: string
    name: string
    description?: string
    coverColor?: string
    coverPhotoId?: string
    coverPhoto?: CloudPhoto
    createdAt: string
    updatedAt: string
    photoCount?: number
}

export interface PhotoUploadProgress {
    fileName: string
    progress: number
    status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
    error?: string
}

const PHOTOS_BUCKET = 'photos'

export const useCloudPhotos = () => {
    const supabase = useSupabase()
    const { user } = useAuth()

    // State
    const photos = ref<CloudPhoto[]>([])
    const folders = ref<CloudPhotoFolder[]>([])
    const likedPhotos = ref<CloudPhoto[]>([])
    const loading = ref(false)
    const uploading = ref(false)
    const uploadProgress = ref<PhotoUploadProgress[]>([])
    const error = ref<string | null>(null)

    // Clear state
    const clearState = () => {
        photos.value = []
        folders.value = []
        likedPhotos.value = []
        loading.value = false
        uploading.value = false
        uploadProgress.value = []
        error.value = null
    }

    // Sort options
    const sortBy = ref<'name' | 'date' | 'size'>('date')
    const sortOrder = ref<'asc' | 'desc'>('desc')

    // Sorted photos
    const sortedPhotos = computed(() => {
        const list = [...photos.value]
        list.sort((a, b) => {
            let comparison = 0
            switch (sortBy.value) {
                case 'name':
                    comparison = (a.title || a.fileName).localeCompare(b.title || b.fileName)
                    break
                case 'date':
                    comparison = new Date(a.takenAt || a.createdAt).getTime() - new Date(b.takenAt || b.createdAt).getTime()
                    break
                case 'size':
                    comparison = a.fileSize - b.fileSize
                    break
            }
            return sortOrder.value === 'asc' ? comparison : -comparison
        })
        return list
    })

    // Root folders (no parent)
    const rootFolders = computed(() => folders.value.filter(f => !f.parentId))

    // Get subfolders
    const getSubfolders = (parentId: string) => folders.value.filter(f => f.parentId === parentId)

    // Get photos in a folder
    const getPhotosInFolder = async (folderId: string): Promise<CloudPhoto[]> => {
        try {
            const { data, error: err } = await supabase
                .from('cloud_photo_folder_items')
                .select('photo_id')
                .eq('folder_id', folderId)

            if (err) throw err

            const photoIds = data.map(item => item.photo_id)
            return photos.value.filter(p => photoIds.includes(p.id))
        } catch (e) {
            console.error('Error getting photos in folder:', e)
            return []
        }
    }

    // Extract EXIF metadata from image file
    const extractMetadata = async (file: File): Promise<Partial<CloudPhoto>> => {
        return new Promise((resolve) => {
            const img = new Image()
            const url = URL.createObjectURL(file)

            img.onload = () => {
                const metadata: Partial<CloudPhoto> = {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    title: file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ')
                }
                URL.revokeObjectURL(url)
                resolve(metadata)
            }

            img.onerror = () => {
                URL.revokeObjectURL(url)
                resolve({ title: file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ') })
            }

            img.src = url
        })
    }

    // Generate thumbnail
    const generateThumbnail = async (file: File, maxSize: number = 300): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const img = new Image()
            const url = URL.createObjectURL(file)

            img.onload = () => {
                const canvas = document.createElement('canvas')
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

                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height)
                    canvas.toBlob(
                        (blob) => {
                            URL.revokeObjectURL(url)
                            resolve(blob)
                        },
                        'image/jpeg',
                        0.8
                    )
                } else {
                    URL.revokeObjectURL(url)
                    resolve(null)
                }
            }

            img.onerror = () => {
                URL.revokeObjectURL(url)
                resolve(null)
            }

            img.src = url
        })
    }

    // Upload a single photo
    const uploadPhoto = async (file: File): Promise<CloudPhoto | null> => {
        if (!user.value) {
            error.value = 'Not authenticated'
            return null
        }

        const userId = user.value.id
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `${userId}/${fileName}`

        const progressIndex = uploadProgress.value.findIndex((p) => p.fileName === file.name)
        const updateProgress = (
            progress: number,
            status: PhotoUploadProgress['status'],
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
            updateProgress(0, 'uploading')

            // Extract metadata
            const metadata = await extractMetadata(file)
            updateProgress(10, 'uploading')

            // Generate thumbnail
            const thumbnail = await generateThumbnail(file)
            let thumbnailPath: string | undefined

            if (thumbnail) {
                const thumbName = `${userId}/thumbnails/${Date.now()}-thumb.jpg`
                const { error: thumbError } = await supabase.storage
                    .from(PHOTOS_BUCKET)
                    .upload(thumbName, thumbnail, { contentType: 'image/jpeg' })

                if (!thumbError) {
                    thumbnailPath = thumbName
                }
            }
            updateProgress(20, 'uploading')

            // Upload photo file
            const { error: uploadError } = await supabase.storage
                .from(PHOTOS_BUCKET)
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false,
                })

            if (uploadError) {
                throw new Error(uploadError.message)
            }
            updateProgress(80, 'processing')

            // Get public URL
            const { data: urlData } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filePath)
            const { data: thumbUrlData } = thumbnailPath
                ? supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(thumbnailPath)
                : { data: null }

            // Insert metadata into database
            const { data: photoData, error: dbError } = await supabase
                .from('cloud_photos')
                .insert({
                    user_id: userId,
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    mime_type: file.type,
                    width: metadata.width,
                    height: metadata.height,
                    title: metadata.title,
                    thumbnail_path: thumbnailPath,
                })
                .select()
                .single()

            if (dbError) {
                throw new Error(dbError.message)
            }

            updateProgress(100, 'complete')

            const uploadedPhoto: CloudPhoto = {
                id: photoData.id,
                userId: photoData.user_id,
                fileName: photoData.file_name,
                filePath: photoData.file_path,
                fileSize: photoData.file_size,
                mimeType: photoData.mime_type,
                width: photoData.width,
                height: photoData.height,
                title: photoData.title,
                description: photoData.description,
                takenAt: photoData.taken_at,
                cameraMake: photoData.camera_make,
                cameraModel: photoData.camera_model,
                lensModel: photoData.lens_model,
                focalLength: photoData.focal_length,
                aperture: photoData.aperture,
                shutterSpeed: photoData.shutter_speed,
                iso: photoData.iso,
                flashUsed: photoData.flash_used,
                latitude: photoData.latitude,
                longitude: photoData.longitude,
                altitude: photoData.altitude,
                locationName: photoData.location_name,
                thumbnailPath: photoData.thumbnail_path,
                createdAt: photoData.created_at,
                updatedAt: photoData.updated_at,
                publicUrl: urlData.publicUrl,
                thumbnailUrl: thumbUrlData?.publicUrl,
            }

            return uploadedPhoto
        } catch (e: any) {
            console.error('[CloudPhotos] Upload failed:', e)
            updateProgress(0, 'error', e.message)
            return null
        }
    }

    // Upload multiple photos
    const uploadPhotos = async (files: File[] | FileList): Promise<CloudPhoto[]> => {
        const fileArray = Array.from(files)
        if (fileArray.length === 0) return []

        uploading.value = true
        error.value = null

        // Initialize progress
        uploadProgress.value = fileArray.map((f) => ({
            fileName: f.name,
            progress: 0,
            status: 'pending' as const,
        }))

        const uploaded: CloudPhoto[] = []

        for (const file of fileArray) {
            const photo = await uploadPhoto(file)
            if (photo) {
                uploaded.push(photo)
                photos.value.unshift(photo)
            }
        }

        uploading.value = false
        return uploaded
    }

    // Fetch all photos
    const fetchPhotos = async (): Promise<void> => {
        if (!user.value) return

        loading.value = true
        error.value = null

        try {
            const { data, error: err } = await supabase
                .from('cloud_photos')
                .select('*')
                .eq('user_id', user.value.id)
                .order('created_at', { ascending: false })

            if (err) throw err

            photos.value = data.map((p: any) => {
                const { data: urlData } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(p.file_path)
                const { data: thumbUrlData } = p.thumbnail_path
                    ? supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(p.thumbnail_path)
                    : { data: null }

                return {
                    id: p.id,
                    userId: p.user_id,
                    fileName: p.file_name,
                    filePath: p.file_path,
                    fileSize: p.file_size,
                    mimeType: p.mime_type,
                    width: p.width,
                    height: p.height,
                    title: p.title,
                    description: p.description,
                    takenAt: p.taken_at,
                    cameraMake: p.camera_make,
                    cameraModel: p.camera_model,
                    lensModel: p.lens_model,
                    focalLength: p.focal_length,
                    aperture: p.aperture,
                    shutterSpeed: p.shutter_speed,
                    iso: p.iso,
                    flashUsed: p.flash_used,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    altitude: p.altitude,
                    locationName: p.location_name,
                    thumbnailPath: p.thumbnail_path,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                    publicUrl: urlData.publicUrl,
                    thumbnailUrl: thumbUrlData?.publicUrl,
                }
            })
        } catch (e: any) {
            console.error('Error fetching photos:', e)
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Fetch folders
    const fetchFolders = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error: err } = await supabase
                .from('cloud_photo_folders')
                .select('*')
                .eq('user_id', user.value.id)
                .order('name')

            if (err) throw err

            folders.value = data.map((f: any) => ({
                id: f.id,
                userId: f.user_id,
                parentId: f.parent_id,
                name: f.name,
                description: f.description,
                coverColor: f.cover_color,
                coverPhotoId: f.cover_photo_id,
                createdAt: f.created_at,
                updatedAt: f.updated_at,
            }))
        } catch (e) {
            console.error('Error fetching folders:', e)
        }
    }

    // Create folder
    const createFolder = async (name: string, parentId?: string): Promise<CloudPhotoFolder | null> => {
        if (!user.value) return null

        try {
            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#14b8a6', '#06b6d4']
            const coverColor = colors[Math.floor(Math.random() * colors.length)]

            const { data, error: err } = await supabase
                .from('cloud_photo_folders')
                .insert({
                    user_id: user.value.id,
                    name,
                    parent_id: parentId || null,
                    cover_color: coverColor,
                })
                .select()
                .single()

            if (err) throw err

            const folder: CloudPhotoFolder = {
                id: data.id,
                userId: data.user_id,
                parentId: data.parent_id,
                name: data.name,
                description: data.description,
                coverColor: data.cover_color,
                coverPhotoId: data.cover_photo_id,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            }

            folders.value.push(folder)
            return folder
        } catch (e) {
            console.error('Error creating folder:', e)
            return null
        }
    }

    // Delete folder
    const deleteFolder = async (folderId: string): Promise<boolean> => {
        try {
            const { error: err } = await supabase
                .from('cloud_photo_folders')
                .delete()
                .eq('id', folderId)

            if (err) throw err

            folders.value = folders.value.filter(f => f.id !== folderId)
            return true
        } catch (e) {
            console.error('Error deleting folder:', e)
            return false
        }
    }

    // Rename folder
    const renameFolder = async (folderId: string, newName: string): Promise<boolean> => {
        try {
            const { error: err } = await supabase
                .from('cloud_photo_folders')
                .update({ name: newName })
                .eq('id', folderId)

            if (err) throw err

            const folder = folders.value.find(f => f.id === folderId)
            if (folder) folder.name = newName
            return true
        } catch (e) {
            console.error('Error renaming folder:', e)
            return false
        }
    }

    // Add photo to folder
    const addPhotoToFolder = async (folderId: string, photoId: string): Promise<boolean> => {
        try {
            const { error: err } = await supabase
                .from('cloud_photo_folder_items')
                .insert({
                    folder_id: folderId,
                    photo_id: photoId,
                })

            if (err) throw err
            return true
        } catch (e) {
            console.error('Error adding photo to folder:', e)
            return false
        }
    }

    // Remove photo from folder
    const removePhotoFromFolder = async (folderId: string, photoId: string): Promise<boolean> => {
        try {
            const { error: err } = await supabase
                .from('cloud_photo_folder_items')
                .delete()
                .eq('folder_id', folderId)
                .eq('photo_id', photoId)

            if (err) throw err
            return true
        } catch (e) {
            console.error('Error removing photo from folder:', e)
            return false
        }
    }

    // Toggle like
    const toggleLike = async (photoId: string): Promise<void> => {
        if (!user.value) return

        const isCurrentlyLiked = likedPhotos.value.some(p => p.id === photoId)

        try {
            if (isCurrentlyLiked) {
                // Unlike
                await supabase
                    .from('cloud_liked_photos')
                    .delete()
                    .eq('user_id', user.value.id)
                    .eq('photo_id', photoId)

                likedPhotos.value = likedPhotos.value.filter(p => p.id !== photoId)
            } else {
                // Like
                await supabase
                    .from('cloud_liked_photos')
                    .insert({
                        user_id: user.value.id,
                        photo_id: photoId,
                    })

                const photo = photos.value.find(p => p.id === photoId)
                if (photo) {
                    likedPhotos.value.push({ ...photo, isLiked: true })
                }
            }

            // Update the photo's liked status
            const photo = photos.value.find(p => p.id === photoId)
            if (photo) {
                photo.isLiked = !isCurrentlyLiked
            }
        } catch (e) {
            console.error('Error toggling like:', e)
        }
    }

    // Fetch liked photos
    const fetchLikedPhotos = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error: err } = await supabase
                .from('cloud_liked_photos')
                .select('photo_id')
                .eq('user_id', user.value.id)

            if (err) throw err

            const likedIds = data.map(item => item.photo_id)
            likedPhotos.value = photos.value.filter(p => likedIds.includes(p.id))

            // Update isLiked on all photos
            photos.value.forEach(p => {
                p.isLiked = likedIds.includes(p.id)
            })
        } catch (e) {
            console.error('Error fetching liked photos:', e)
        }
    }

    // Check if photo is liked
    const isLiked = (photoId: string): boolean => {
        return likedPhotos.value.some(p => p.id === photoId)
    }

    // Delete photo
    const deletePhoto = async (photoId: string): Promise<boolean> => {
        try {
            const photo = photos.value.find(p => p.id === photoId)
            if (!photo) return false

            // Delete from storage
            await supabase.storage.from(PHOTOS_BUCKET).remove([photo.filePath])
            if (photo.thumbnailPath) {
                await supabase.storage.from(PHOTOS_BUCKET).remove([photo.thumbnailPath])
            }

            // Delete from database
            const { error: err } = await supabase
                .from('cloud_photos')
                .delete()
                .eq('id', photoId)

            if (err) throw err

            photos.value = photos.value.filter(p => p.id !== photoId)
            likedPhotos.value = likedPhotos.value.filter(p => p.id !== photoId)
            return true
        } catch (e) {
            console.error('Error deleting photo:', e)
            return false
        }
    }

    // Update photo metadata
    const updatePhoto = async (photoId: string, updates: Partial<CloudPhoto>): Promise<boolean> => {
        try {
            const dbUpdates: any = {}
            if (updates.title !== undefined) dbUpdates.title = updates.title
            if (updates.description !== undefined) dbUpdates.description = updates.description

            const { error: err } = await supabase
                .from('cloud_photos')
                .update(dbUpdates)
                .eq('id', photoId)

            if (err) throw err

            const photo = photos.value.find(p => p.id === photoId)
            if (photo) {
                Object.assign(photo, updates)
            }
            return true
        } catch (e) {
            console.error('Error updating photo:', e)
            return false
        }
    }

    // Download photo
    const downloadPhoto = async (photo: CloudPhoto): Promise<void> => {
        try {
            const { data, error: err } = await supabase.storage
                .from(PHOTOS_BUCKET)
                .download(photo.filePath)

            if (err) throw err

            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = photo.fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Error downloading photo:', e)
        }
    }

    // Format file size
    const formatFileSize = (bytes: number): string => {
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
    const formatDate = (dateStr: string | undefined): string => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Get photo color for placeholder
    const getPhotoColor = (photo: CloudPhoto): string => {
        const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
            '#f97316', '#eab308', '#22c55e', '#14b8a6',
            '#06b6d4', '#6366f1'
        ]
        const index = (photo.fileName.length + (photo.fileSize % 100)) % colors.length
        return colors[index]
    }

    return {
        photos: readonly(photos),
        folders: readonly(folders),
        likedPhotos: readonly(likedPhotos),
        loading: readonly(loading),
        uploading: readonly(uploading),
        uploadProgress: readonly(uploadProgress),
        error: readonly(error),
        sortBy,
        sortOrder,
        sortedPhotos,
        rootFolders,
        getSubfolders,
        getPhotosInFolder,
        extractMetadata,
        generateThumbnail,
        uploadPhoto,
        uploadPhotos,
        fetchPhotos,
        fetchFolders,
        createFolder,
        deleteFolder,
        renameFolder,
        addPhotoToFolder,
        removePhotoFromFolder,
        toggleLike,
        fetchLikedPhotos,
        isLiked,
        deletePhoto,
        updatePhoto,
        downloadPhoto,
        formatFileSize,
        formatDate,
        getPhotoColor,
        clearState,
    }
}
