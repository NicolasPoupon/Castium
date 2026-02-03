/**
 * Video Upload Composable
 * Manages video uploads to Supabase Storage with metadata extraction
 */

export interface VideoMetadata {
    title?: string
    artist?: string
    album?: string
    year?: number
    genre?: string
    description?: string
    duration?: number
    width?: number
    height?: number
    codec?: string
    bitrate?: number
    fps?: number
}

export interface UploadedVideo {
    id: string
    userId: string
    fileName: string
    filePath: string
    fileSize: number
    mimeType: string
    duration?: number
    title?: string
    artist?: string
    album?: string
    year?: number
    genre?: string
    description?: string
    thumbnailPath?: string
    coverPath?: string
    width?: number
    height?: number
    codec?: string
    bitrate?: number
    fps?: number
    status: 'processing' | 'ready' | 'error'
    errorMessage?: string
    createdAt: string
    updatedAt: string
    publicUrl?: string
    rating?: number // 1-10
    ratingComment?: string
    playlist?: string // Playlist name for grouping
}

export interface UploadProgress {
    fileName: string
    progress: number
    status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
    error?: string
}

export interface CloudVideoPlaylist {
    name: string
    videos: UploadedVideo[]
    thumbnail?: string
}

const VIDEOS_BUCKET = 'videos'

export const useVideoUpload = () => {
    const supabase = useSupabase()
    const { user, profile, updateProfile } = useAuth()

    // State
    const uploadedVideos = ref<UploadedVideo[]>([])
    const loading = ref(false)
    const uploading = ref(false)
    const uploadProgress = ref<UploadProgress[]>([])
    const error = ref<string | null>(null)

    // Cloud video ratings from profile
    const cloudVideoRatings = computed(() => profile.value?.cloud_video_ratings || {} as Record<string, { rating: number; comment: string }>)

    // Cloud video playlists from profile
    const cloudPlaylists = computed(() => profile.value?.cloud_video_playlists || [] as string[])

    // Cloud video watching progress from profile
    const cloudWatchingProgress = computed(() => profile.value?.cloud_video_watching || {} as Record<string, number>)

    // Cloud video favorites from profile
    const cloudFavorites = computed(() => profile.value?.cloud_video_favorites || [] as string[])

    // Continue watching videos (with progress)
    const continueWatchingVideos = computed(() => {
        const progress = cloudWatchingProgress.value
        return uploadedVideos.value
            .filter(v => progress[v.id] && progress[v.id] > 0)
            .sort((a, b) => (progress[b.id] || 0) - (progress[a.id] || 0))
    })

    // Favorite videos
    const favoriteVideos = computed(() => {
        const favs = cloudFavorites.value
        return uploadedVideos.value.filter(v => favs.includes(v.id))
    })

    // Sort options
    const sortBy = ref<'name' | 'date' | 'size'>('date')
    const sortOrder = ref<'asc' | 'desc'>('desc')

    // Sorted videos
    const sortedVideos = computed(() => {
        const videos = [...uploadedVideos.value]
        videos.sort((a, b) => {
            let comparison = 0
            switch (sortBy.value) {
                case 'name':
                    comparison = (a.title || a.fileName).localeCompare(b.title || b.fileName)
                    break
                case 'date':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
                case 'size':
                    comparison = a.fileSize - b.fileSize
                    break
            }
            return sortOrder.value === 'asc' ? comparison : -comparison
        })
        return videos
    })

    // Extract metadata from video file
    const extractMetadata = async (file: File): Promise<VideoMetadata> => {
        return new Promise((resolve) => {
            const video = document.createElement('video')
            video.preload = 'metadata'

            video.onloadedmetadata = () => {
                const metadata: VideoMetadata = {
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight,
                }

                // Try to extract title from filename
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
                metadata.title = nameWithoutExt.replace(/[._-]/g, ' ')

                // Try to parse common naming patterns: "Artist - Title" or "Title (Year)"
                const artistTitleMatch = nameWithoutExt.match(/^(.+?)\s*[-–]\s*(.+)$/)
                if (artistTitleMatch) {
                    metadata.artist = artistTitleMatch[1].trim()
                    metadata.title = artistTitleMatch[2].trim()
                }

                const yearMatch = nameWithoutExt.match(/\((\d{4})\)/)
                if (yearMatch) {
                    metadata.year = parseInt(yearMatch[1])
                    metadata.title = metadata.title?.replace(/\s*\(\d{4}\)\s*/, '').trim()
                }

                URL.revokeObjectURL(video.src)
                resolve(metadata)
            }

            video.onerror = () => {
                URL.revokeObjectURL(video.src)
                resolve({ title: file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ') })
            }

            video.src = URL.createObjectURL(file)
        })
    }

    // Generate thumbnail from video
    const generateThumbnail = async (file: File): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const video = document.createElement('video')
            video.preload = 'metadata'
            video.muted = true

            video.onloadeddata = () => {
                // Seek to 10% of the video
                video.currentTime = video.duration * 0.1
            }

            video.onseeked = () => {
                const canvas = document.createElement('canvas')
                canvas.width = 320
                canvas.height = 180

                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                    canvas.toBlob(
                        (blob) => {
                            URL.revokeObjectURL(video.src)
                            resolve(blob)
                        },
                        'image/jpeg',
                        0.8
                    )
                } else {
                    URL.revokeObjectURL(video.src)
                    resolve(null)
                }
            }

            video.onerror = () => {
                URL.revokeObjectURL(video.src)
                resolve(null)
            }

            video.src = URL.createObjectURL(file)
        })
    }

    // Upload a single video
    const uploadVideo = async (file: File): Promise<UploadedVideo | null> => {
        if (!user.value) {
            error.value = 'Not authenticated'
            return null
        }

        const userId = user.value.id
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `${userId}/${fileName}`

        // Update progress
        const progressIndex = uploadProgress.value.findIndex((p) => p.fileName === file.name)
        const updateProgress = (
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
            updateProgress(0, 'uploading')

            // Extract metadata first
            const metadata = await extractMetadata(file)
            updateProgress(10, 'uploading')

            // Generate thumbnail
            const thumbnail = await generateThumbnail(file)
            let thumbnailPath: string | undefined

            if (thumbnail) {
                const thumbName = `${userId}/thumbnails/${Date.now()}-thumb.jpg`
                const { error: thumbError } = await supabase.storage
                    .from(VIDEOS_BUCKET)
                    .upload(thumbName, thumbnail, { contentType: 'image/jpeg' })

                if (!thumbError) {
                    thumbnailPath = thumbName
                }
            }
            updateProgress(20, 'uploading')

            // Upload video file
            const { error: uploadError } = await supabase.storage
                .from(VIDEOS_BUCKET)
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false,
                })

            if (uploadError) {
                throw new Error(uploadError.message)
            }
            updateProgress(80, 'processing')

            // Get public URL
            const { data: urlData } = supabase.storage.from(VIDEOS_BUCKET).getPublicUrl(filePath)

            // Insert metadata into database
            // NOTE: Only include columns that exist in the prod schema (20260131_create_videos_table.sql).
            // Prod has: id, user_id, file_name, file_path, file_size, mime_type, duration,
            //           title, artist, release_year, description, playback_position, status,
            //           last_watched_at, created_at, updated_at
            // Columns NOT in prod: width, height, album, genre, year, thumbnail_path, cover_path
            const insertPayload: Record<string, any> = {
                user_id: userId,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.type,
                duration: metadata.duration,
                title: metadata.title,
                artist: metadata.artist,
                release_year: metadata.year, // prod uses release_year, not year
                description: metadata.description,
                // status omitted – will default to 'not_started'
                // width/height/thumbnail_path/album/genre not in prod schema
            }

            const tryInsert = async (payload: Record<string, any>) => {
                return await supabase.from('videos').insert(payload).select().single()
            }

            const retryPayload: Record<string, any> = { ...insertPayload }
            let { data: videoData, error: dbError } = await tryInsert(retryPayload)

            // Backward-compat: if prod schema is missing newer columns, retry without them.
            // PostgREST errors often look like: Could not find the 'height' column of 'videos' in the schema cache
            let maxRetries = 10
            while (dbError && maxRetries-- > 0) {
                const message = String((dbError as any)?.message || (dbError as any)?.details || '')
                const code = (dbError as any)?.code || ''
                console.warn('[VideoUpload] Insert error, attempting recovery:', {
                    message,
                    code,
                    payload: Object.keys(retryPayload),
                })

                const unknownColumn =
                    /Could not find the '([^']+)' column|column "([^"]+)" (?:of relation "[^"]+" )?does not exist/i
                const match = message.match(unknownColumn)
                const missingColumn = (match?.[1] || match?.[2] || '').trim()

                if (!missingColumn) break

                console.log('[VideoUpload] Removing missing column from payload:', missingColumn)

                // Friendly remap: some schemas use `release_year` instead of `year`.
                if (
                    missingColumn === 'year' &&
                    'year' in retryPayload &&
                    !('release_year' in retryPayload)
                ) {
                    retryPayload.release_year = retryPayload.year
                    delete retryPayload.year
                    ;({ data: videoData, error: dbError } = await tryInsert(retryPayload))
                    continue
                }

                if (missingColumn in retryPayload) {
                    delete retryPayload[missingColumn]
                    ;({ data: videoData, error: dbError } = await tryInsert(retryPayload))
                    continue
                }

                break
            }

            if (dbError) {
                throw new Error(dbError.message)
            }

            updateProgress(100, 'complete')

            // Map response – some fields may not exist in prod schema
            const uploadedVideo: UploadedVideo = {
                id: videoData.id,
                userId: videoData.user_id,
                fileName: videoData.file_name,
                filePath: videoData.file_path,
                fileSize: videoData.file_size,
                mimeType: videoData.mime_type,
                duration: videoData.duration,
                title: videoData.title,
                artist: videoData.artist,
                album: videoData.album ?? undefined,
                year: videoData.release_year ?? videoData.year,
                genre: videoData.genre ?? undefined,
                description: videoData.description,
                thumbnailPath: videoData.thumbnail_path ?? undefined,
                coverPath: videoData.cover_path ?? undefined,
                width: videoData.width ?? undefined,
                height: videoData.height ?? undefined,
                status: videoData.status ?? 'not_started',
                createdAt: videoData.created_at,
                updatedAt: videoData.updated_at,
                publicUrl: urlData.publicUrl,
            }

            return uploadedVideo
        } catch (e: any) {
            console.error('[VideoUpload] Upload failed:', e)
            updateProgress(0, 'error', e.message)
            return null
        }
    }

    // Upload multiple videos
    const uploadVideos = async (files: FileList | File[]): Promise<void> => {
        uploading.value = true
        error.value = null

        // Initialize progress for all files
        uploadProgress.value = Array.from(files).map((file) => ({
            fileName: file.name,
            progress: 0,
            status: 'pending' as const,
        }))

        try {
            for (const file of Array.from(files)) {
                const video = await uploadVideo(file)
                if (video) {
                    uploadedVideos.value.unshift(video)
                }
            }
        } catch (e: any) {
            console.error('[VideoUpload] Batch upload failed:', e)
            error.value = e.message
        } finally {
            uploading.value = false
            // Clear progress after 3 seconds
            setTimeout(() => {
                uploadProgress.value = []
            }, 3000)
        }
    }

    // Fetch user's videos
    const fetchVideos = async (): Promise<void> => {
        if (!user.value) return

        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('videos')
                .select('*')
                .eq('user_id', user.value.id)
                .order('created_at', { ascending: false })

            if (fetchError) {
                throw new Error(fetchError.message)
            }

            uploadedVideos.value = (data || []).map((video: any) => {
                const { data: urlData } = supabase.storage
                    .from(VIDEOS_BUCKET)
                    .getPublicUrl(video.file_path)

                return {
                    id: video.id,
                    userId: video.user_id,
                    fileName: video.file_name,
                    filePath: video.file_path,
                    fileSize: video.file_size,
                    mimeType: video.mime_type,
                    duration: video.duration,
                    title: video.title,
                    artist: video.artist,
                    album: video.album ?? undefined,
                    year: video.release_year ?? video.year,
                    genre: video.genre ?? undefined,
                    description: video.description,
                    thumbnailPath: video.thumbnail_path ?? undefined,
                    coverPath: video.cover_path ?? undefined,
                    width: video.width ?? undefined,
                    height: video.height ?? undefined,
                    codec: video.codec ?? undefined,
                    bitrate: video.bitrate ?? undefined,
                    fps: video.fps ?? undefined,
                    status: video.status ?? 'not_started',
                    errorMessage: video.error_message ?? undefined,
                    createdAt: video.created_at,
                    updatedAt: video.updated_at,
                    publicUrl: urlData.publicUrl,
                }
            })
        } catch (e: any) {
            console.error('[VideoUpload] Fetch failed:', e)
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Delete a video
    const deleteVideo = async (videoId: string): Promise<boolean> => {
        const video = uploadedVideos.value.find((v) => v.id === videoId)
        if (!video) return false

        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from(VIDEOS_BUCKET)
                .remove([video.filePath])

            if (storageError) {
                console.warn('[VideoUpload] Storage delete warning:', storageError)
            }

            // Delete thumbnail if exists
            if (video.thumbnailPath) {
                await supabase.storage.from(VIDEOS_BUCKET).remove([video.thumbnailPath])
            }

            // Delete from database
            const { error: dbError } = await supabase.from('videos').delete().eq('id', videoId)

            if (dbError) {
                throw new Error(dbError.message)
            }

            // Remove from local state
            uploadedVideos.value = uploadedVideos.value.filter((v) => v.id !== videoId)
            return true
        } catch (e: any) {
            console.error('[VideoUpload] Delete failed:', e)
            error.value = e.message
            return false
        }
    }

    // Update video metadata
    const updateVideoMetadata = async (
        videoId: string,
        metadata: Partial<VideoMetadata>
    ): Promise<boolean> => {
        try {
            const { error: updateError } = await supabase
                .from('videos')
                .update({
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    year: metadata.year,
                    genre: metadata.genre,
                    description: metadata.description,
                })
                .eq('id', videoId)

            if (updateError) {
                throw new Error(updateError.message)
            }

            // Update local state
            const index = uploadedVideos.value.findIndex((v) => v.id === videoId)
            if (index >= 0) {
                uploadedVideos.value[index] = {
                    ...uploadedVideos.value[index],
                    ...metadata,
                }
            }

            return true
        } catch (e: any) {
            console.error('[VideoUpload] Update failed:', e)
            error.value = e.message
            return false
        }
    }

    // Get video thumbnail URL
    const getThumbnailUrl = (thumbnailPath: string | null | undefined): string | null => {
        if (!thumbnailPath) return null

        const { data } = supabase.storage.from(VIDEOS_BUCKET).getPublicUrl(thumbnailPath)

        return data.publicUrl
    }

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }

    // Format duration
    const formatDuration = (seconds?: number): string => {
        if (!seconds) return '--:--'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    // Watching progress functions
    const getCloudProgress = (videoId: string): number => {
        return cloudWatchingProgress.value[videoId] || 0
    }

    const saveCloudProgress = async (videoId: string, currentTime: number): Promise<void> => {
        const progress = { ...cloudWatchingProgress.value }
        if (currentTime > 0) {
            progress[videoId] = currentTime
        } else {
            delete progress[videoId]
        }
        await updateProfile({ cloud_video_watching: progress })
    }

    const removeFromContinueWatching = async (videoId: string): Promise<void> => {
        const progress = { ...cloudWatchingProgress.value }
        delete progress[videoId]
        await updateProfile({ cloud_video_watching: progress })
    }

    // Favorite functions
    const isCloudFavorite = (videoId: string): boolean => {
        return cloudFavorites.value.includes(videoId)
    }

    const toggleCloudFavorite = async (videoId: string): Promise<void> => {
        const favs = [...cloudFavorites.value]
        const index = favs.indexOf(videoId)
        if (index >= 0) {
            favs.splice(index, 1)
        } else {
            favs.push(videoId)
        }
        await updateProfile({ cloud_video_favorites: favs })
    }

    // Rating functions
    const getCloudRating = (videoId: string): { rating: number; comment: string } | null => {
        return cloudVideoRatings.value[videoId] || null
    }

    const setCloudRating = async (videoId: string, rating: number, comment: string = ''): Promise<void> => {
        const ratings = { ...cloudVideoRatings.value }
        ratings[videoId] = {
            rating: Math.max(1, Math.min(10, rating)),
            comment
        }
        await updateProfile({ cloud_video_ratings: ratings })
    }

    const removeCloudRating = async (videoId: string): Promise<void> => {
        const ratings = { ...cloudVideoRatings.value }
        delete ratings[videoId]
        await updateProfile({ cloud_video_ratings: ratings })
    }

    // Playlist functions
    const createCloudPlaylist = async (name: string): Promise<void> => {
        const playlists = [...cloudPlaylists.value]
        if (!playlists.includes(name)) {
            playlists.push(name)
            await updateProfile({ cloud_video_playlists: playlists })
        }
    }

    const deleteCloudPlaylist = async (name: string): Promise<void> => {
        const playlists = cloudPlaylists.value.filter((p: string) => p !== name)
        await updateProfile({ cloud_video_playlists: playlists })

        // Remove playlist assignment from videos
        for (const video of uploadedVideos.value) {
            if (video.playlist === name) {
                await updateVideoMetadata(video.id, { playlist: undefined } as any)
            }
        }
    }

    const assignToPlaylist = async (videoId: string, playlistName: string | null): Promise<void> => {
        // Auto-create playlist if it doesn't exist
        if (playlistName && !cloudPlaylists.value.includes(playlistName)) {
            await createCloudPlaylist(playlistName)
        }
        await updateVideoMetadata(videoId, { playlist: playlistName } as any)
    }

    // Get videos by playlist
    const getVideosByPlaylist = (playlistName: string): UploadedVideo[] => {
        return uploadedVideos.value.filter(v => v.playlist === playlistName)
    }

    // Get videos without playlist
    const unassignedVideos = computed(() => {
        return uploadedVideos.value.filter(v => !v.playlist)
    })

    // Get playlists with videos
    const playlistsWithVideos = computed<CloudVideoPlaylist[]>(() => {
        return cloudPlaylists.value.map((name: string) => ({
            name,
            videos: uploadedVideos.value.filter(v => v.playlist === name),
            thumbnail: uploadedVideos.value.find(v => v.playlist === name)?.thumbnailPath
        }))
    })

    return {
        // State
        uploadedVideos,
        sortedVideos,
        loading,
        uploading,
        uploadProgress,
        error,
        sortBy,
        sortOrder,
        cloudVideoRatings,
        cloudPlaylists,
        cloudWatchingProgress,
        cloudFavorites,
        continueWatchingVideos,
        favoriteVideos,
        unassignedVideos,
        playlistsWithVideos,

        // Methods
        fetchVideos,
        uploadVideos,
        deleteVideo,
        updateVideoMetadata,
        extractMetadata,
        getThumbnailUrl,
        formatFileSize,
        formatDuration,
        getCloudRating,
        setCloudRating,
        removeCloudRating,
        getCloudProgress,
        saveCloudProgress,
        removeFromContinueWatching,
        isCloudFavorite,
        toggleCloudFavorite,
        createCloudPlaylist,
        deleteCloudPlaylist,
        assignToPlaylist,
        getVideosByPlaylist,
    }
}
