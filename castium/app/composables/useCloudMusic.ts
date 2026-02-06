/**
 * Cloud Music Upload Composable
 * Manages music uploads to Supabase Storage with metadata extraction
 */

export interface CloudTrackMetadata {
    title?: string
    artist?: string
    album?: string
    year?: number
    genre?: string
    duration?: number
    trackNumber?: number
    discNumber?: number
}

export interface CloudTrack {
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
    trackNumber?: number
    discNumber?: number
    coverPath?: string
    isLiked?: boolean
    playCount: number
    lastPlayedAt?: string
    createdAt: string
    updatedAt: string
    publicUrl?: string
}

export interface CloudPlaylist {
    id: string
    userId: string
    name: string
    description?: string
    coverColor: string
    trackCount: number
    createdAt: string
    updatedAt: string
}

export interface MusicUploadProgress {
    fileName: string
    progress: number
    status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
    error?: string
}

export interface CloudPlaybackState {
    currentTrack: CloudTrack | null
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    isShuffled: boolean
    repeatMode: 'off' | 'all' | 'one'
    queue: CloudTrack[]
    queueIndex: number
}

const MUSIC_BUCKET = 'music'

export const useCloudMusic = () => {
    const supabase = useSupabase()
    const { user } = useAuth()

    // State
    const tracks = ref<CloudTrack[]>([])
    const playlists = ref<CloudPlaylist[]>([])
    const likedTracks = ref<CloudTrack[]>([])
    const loading = ref(false)
    const uploading = ref(false)
    const uploadProgress = ref<MusicUploadProgress[]>([])
    const error = ref<string | null>(null)

    // Clear state (for refresh after data deletion)
    const clearState = () => {
        tracks.value = []
        playlists.value = []
        likedTracks.value = []
        loading.value = false
        uploading.value = false
        uploadProgress.value = []
        error.value = null
        stopPlayback()
    }

    // Sort options
    const sortBy = ref<'name' | 'date' | 'artist' | 'album'>('date')
    const sortOrder = ref<'asc' | 'desc'>('desc')

    // Audio element for playback
    const audioElement = ref<HTMLAudioElement | null>(null)

    // Playback state
    const playbackState = ref<CloudPlaybackState>({
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        isShuffled: false,
        repeatMode: 'off',
        queue: [],
        queueIndex: 0,
    })

    // Sorted tracks
    const sortedTracks = computed(() => {
        const trackList = [...tracks.value]
        trackList.sort((a, b) => {
            let comparison = 0
            switch (sortBy.value) {
                case 'name':
                    comparison = (a.title || a.fileName).localeCompare(b.title || b.fileName)
                    break
                case 'date':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
                case 'artist':
                    comparison = (a.artist || '').localeCompare(b.artist || '')
                    break
                case 'album':
                    comparison = (a.album || '').localeCompare(b.album || '')
                    break
            }
            return sortOrder.value === 'asc' ? comparison : -comparison
        })
        return trackList
    })

    // Initialize audio element
    const initAudio = () => {
        if (typeof window === 'undefined') return
        if (!audioElement.value) {
            audioElement.value = new Audio()
            audioElement.value.addEventListener('timeupdate', () => {
                playbackState.value.currentTime = audioElement.value?.currentTime || 0
            })
            audioElement.value.addEventListener('loadedmetadata', () => {
                playbackState.value.duration = audioElement.value?.duration || 0
            })
            audioElement.value.addEventListener('ended', () => {
                handleTrackEnded()
            })
            audioElement.value.addEventListener('play', () => {
                playbackState.value.isPlaying = true
            })
            audioElement.value.addEventListener('pause', () => {
                playbackState.value.isPlaying = false
            })
        }
    }

    // Extract metadata from audio file
    const extractMetadata = async (file: File): Promise<CloudTrackMetadata> => {
        return new Promise((resolve) => {
            const audio = document.createElement('audio')
            audio.preload = 'metadata'

            audio.onloadedmetadata = () => {
                const metadata: CloudTrackMetadata = {
                    duration: audio.duration,
                }

                // Try to extract title from filename
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
                metadata.title = nameWithoutExt.replace(/[._-]/g, ' ')

                // Try to parse common naming patterns: "Artist - Title" or "Track# - Title"
                const artistTitleMatch = nameWithoutExt.match(/^(.+?)\s*[-–]\s*(.+)$/)
                if (artistTitleMatch) {
                    // Check if first part is a track number
                    if (/^\d+$/.test(artistTitleMatch[1].trim())) {
                        metadata.trackNumber = parseInt(artistTitleMatch[1].trim())
                        metadata.title = artistTitleMatch[2].trim()
                    } else {
                        metadata.artist = artistTitleMatch[1].trim()
                        metadata.title = artistTitleMatch[2].trim()
                    }
                }

                // Try to extract year from parentheses
                const yearMatch = nameWithoutExt.match(/\((\d{4})\)/)
                if (yearMatch) {
                    metadata.year = parseInt(yearMatch[1])
                    metadata.title = metadata.title?.replace(/\s*\(\d{4}\)\s*/, '').trim()
                }

                URL.revokeObjectURL(audio.src)
                resolve(metadata)
            }

            audio.onerror = () => {
                URL.revokeObjectURL(audio.src)
                resolve({ title: file.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ') })
            }

            audio.src = URL.createObjectURL(file)
        })
    }

    // Upload a single track
    const uploadTrack = async (file: File): Promise<CloudTrack | null> => {
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
            status: MusicUploadProgress['status'],
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

            // Upload audio file
            const { error: uploadError } = await supabase.storage
                .from(MUSIC_BUCKET)
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false,
                })

            if (uploadError) {
                throw new Error(uploadError.message)
            }
            updateProgress(80, 'processing')

            // Get public URL
            const { data: urlData } = supabase.storage.from(MUSIC_BUCKET).getPublicUrl(filePath)

            // Insert metadata into database
            const insertPayload: Record<string, any> = {
                user_id: userId,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.type,
                duration: metadata.duration,
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                release_year: metadata.year,
                genre: metadata.genre,
                track_number: metadata.trackNumber,
                disc_number: metadata.discNumber,
            }

            const tryInsert = async (payload: Record<string, any>) => {
                return await supabase.from('cloud_tracks').insert(payload).select().single()
            }

            const retryPayload: Record<string, any> = { ...insertPayload }
            let { data: trackData, error: dbError } = await tryInsert(retryPayload)

            // Backward-compat: retry without missing columns
            let maxRetries = 10
            while (dbError && maxRetries-- > 0) {
                const message = String((dbError as any)?.message || (dbError as any)?.details || '')
                console.warn('[CloudMusic] Insert error, attempting recovery:', {
                    message,
                    payload: Object.keys(retryPayload),
                })

                const unknownColumn =
                    /Could not find the '([^']+)' column|column "([^"]+)" (?:of relation "[^"]+" )?does not exist/i
                const match = message.match(unknownColumn)
                const missingColumn = (match?.[1] || match?.[2] || '').trim()

                if (!missingColumn) break

                console.log('[CloudMusic] Removing missing column from payload:', missingColumn)

                if (missingColumn in retryPayload) {
                    delete retryPayload[missingColumn]
                    ;({ data: trackData, error: dbError } = await tryInsert(retryPayload))
                    continue
                }

                break
            }

            if (dbError) {
                throw new Error(dbError.message)
            }

            updateProgress(100, 'complete')

            const uploadedTrack: CloudTrack = {
                id: trackData.id,
                userId: trackData.user_id,
                fileName: trackData.file_name,
                filePath: trackData.file_path,
                fileSize: trackData.file_size,
                mimeType: trackData.mime_type,
                duration: trackData.duration,
                title: trackData.title,
                artist: trackData.artist,
                album: trackData.album ?? undefined,
                year: trackData.release_year ?? trackData.year,
                genre: trackData.genre ?? undefined,
                trackNumber: trackData.track_number ?? undefined,
                discNumber: trackData.disc_number ?? undefined,
                coverPath: trackData.cover_path ?? undefined,
                isLiked: false,
                playCount: trackData.play_count ?? 0,
                lastPlayedAt: trackData.last_played_at ?? undefined,
                createdAt: trackData.created_at,
                updatedAt: trackData.updated_at,
                publicUrl: urlData.publicUrl,
            }

            return uploadedTrack
        } catch (e: any) {
            console.error('[CloudMusic] Upload failed:', e)
            updateProgress(0, 'error', e.message)
            return null
        }
    }

    // Upload multiple tracks
    const uploadTracks = async (files: FileList | File[]): Promise<void> => {
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
                const track = await uploadTrack(file)
                if (track) {
                    tracks.value.unshift(track)
                }
            }
        } catch (e: any) {
            console.error('[CloudMusic] Batch upload failed:', e)
            error.value = e.message
        } finally {
            uploading.value = false
            // Clear progress after 3 seconds
            setTimeout(() => {
                uploadProgress.value = []
            }, 3000)
        }
    }

    // Fetch user's tracks
    const fetchTracks = async (): Promise<void> => {
        if (!user.value) return

        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('cloud_tracks')
                .select('*')
                .eq('user_id', user.value.id)
                .order('created_at', { ascending: false })

            if (fetchError) {
                throw new Error(fetchError.message)
            }

            // Fetch liked track IDs
            const { data: likedData } = await supabase
                .from('cloud_liked_tracks')
                .select('track_id')
                .eq('user_id', user.value.id)

            const likedIds = new Set((likedData || []).map((l: any) => l.track_id))

            tracks.value = (data || []).map((track: any) => {
                const { data: urlData } = supabase.storage
                    .from(MUSIC_BUCKET)
                    .getPublicUrl(track.file_path)

                return {
                    id: track.id,
                    userId: track.user_id,
                    fileName: track.file_name,
                    filePath: track.file_path,
                    fileSize: track.file_size,
                    mimeType: track.mime_type,
                    duration: track.duration,
                    title: track.title,
                    artist: track.artist,
                    album: track.album ?? undefined,
                    year: track.release_year ?? track.year,
                    genre: track.genre ?? undefined,
                    trackNumber: track.track_number ?? undefined,
                    discNumber: track.disc_number ?? undefined,
                    coverPath: track.cover_path ?? undefined,
                    isLiked: likedIds.has(track.id),
                    playCount: track.play_count ?? 0,
                    lastPlayedAt: track.last_played_at ?? undefined,
                    createdAt: track.created_at,
                    updatedAt: track.updated_at,
                    publicUrl: urlData.publicUrl,
                }
            })
        } catch (e: any) {
            console.error('[CloudMusic] Fetch failed:', e)
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Delete a track
    const deleteTrack = async (trackId: string): Promise<boolean> => {
        const track = tracks.value.find((t) => t.id === trackId)
        if (!track) return false

        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from(MUSIC_BUCKET)
                .remove([track.filePath])

            if (storageError) {
                console.warn('[CloudMusic] Storage delete warning:', storageError)
            }

            // Delete from database
            const { error: dbError } = await supabase
                .from('cloud_tracks')
                .delete()
                .eq('id', trackId)

            if (dbError) {
                throw new Error(dbError.message)
            }

            // Remove from local state
            tracks.value = tracks.value.filter((t) => t.id !== trackId)
            likedTracks.value = likedTracks.value.filter((t) => t.id !== trackId)

            // Stop playback if this track is playing
            if (playbackState.value.currentTrack?.id === trackId) {
                stopPlayback()
            }

            return true
        } catch (e: any) {
            console.error('[CloudMusic] Delete failed:', e)
            error.value = e.message
            return false
        }
    }

    // Toggle like on a track
    const toggleLike = async (trackId: string): Promise<void> => {
        if (!user.value) return

        const track = tracks.value.find((t) => t.id === trackId)
        if (!track) return

        try {
            if (track.isLiked) {
                // Unlike
                await supabase
                    .from('cloud_liked_tracks')
                    .delete()
                    .eq('user_id', user.value.id)
                    .eq('track_id', trackId)

                track.isLiked = false
                likedTracks.value = likedTracks.value.filter((t) => t.id !== trackId)
            } else {
                // Like
                await supabase.from('cloud_liked_tracks').insert({
                    user_id: user.value.id,
                    track_id: trackId,
                })

                track.isLiked = true
                likedTracks.value.unshift(track)
            }

            // Update current track if it's the same
            if (playbackState.value.currentTrack?.id === trackId) {
                playbackState.value.currentTrack = { ...track }
            }
        } catch (e: any) {
            console.error('[CloudMusic] Toggle like failed:', e)
        }
    }

    // Fetch liked tracks
    const fetchLikedTracks = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error: fetchError } = await supabase
                .from('cloud_liked_tracks')
                .select(
                    `
                    track_id,
                    cloud_tracks (*)
                `
                )
                .eq('user_id', user.value.id)
                .order('liked_at', { ascending: false })

            if (fetchError) {
                // If join fails, try simpler query
                const { data: likedIds } = await supabase
                    .from('cloud_liked_tracks')
                    .select('track_id')
                    .eq('user_id', user.value.id)

                if (likedIds && likedIds.length > 0) {
                    likedTracks.value = tracks.value.filter((t) =>
                        likedIds.some((l: any) => l.track_id === t.id)
                    )
                }
                return
            }

            likedTracks.value = (data || [])
                .filter((item: any) => item.cloud_tracks)
                .map((item: any) => {
                    const track = item.cloud_tracks
                    const { data: urlData } = supabase.storage
                        .from(MUSIC_BUCKET)
                        .getPublicUrl(track.file_path)

                    return {
                        id: track.id,
                        userId: track.user_id,
                        fileName: track.file_name,
                        filePath: track.file_path,
                        fileSize: track.file_size,
                        mimeType: track.mime_type,
                        duration: track.duration,
                        title: track.title,
                        artist: track.artist,
                        album: track.album ?? undefined,
                        year: track.release_year ?? track.year,
                        genre: track.genre ?? undefined,
                        isLiked: true,
                        playCount: track.play_count ?? 0,
                        createdAt: track.created_at,
                        updatedAt: track.updated_at,
                        publicUrl: urlData.publicUrl,
                    }
                })
        } catch (e: any) {
            console.error('[CloudMusic] Fetch liked failed:', e)
        }
    }

    // =========== PLAYLISTS ===========

    // Fetch playlists
    const fetchPlaylists = async (): Promise<void> => {
        if (!user.value) return

        try {
            const { data, error: fetchError } = await supabase
                .from('cloud_playlists')
                .select('*')
                .eq('user_id', user.value.id)
                .order('created_at', { ascending: false })

            if (fetchError) {
                throw new Error(fetchError.message)
            }

            // Get track counts for each playlist
            const playlistIds = (data || []).map((p: any) => p.id)
            const trackCounts: Record<string, number> = {}

            if (playlistIds.length > 0) {
                const { data: countData } = await supabase
                    .from('cloud_playlist_tracks')
                    .select('playlist_id')
                    .in('playlist_id', playlistIds)

                if (countData) {
                    countData.forEach((item: any) => {
                        trackCounts[item.playlist_id] = (trackCounts[item.playlist_id] || 0) + 1
                    })
                }
            }

            playlists.value = (data || []).map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                name: p.name,
                description: p.description ?? undefined,
                coverColor: p.cover_color || getRandomColor(),
                trackCount: trackCounts[p.id] || 0,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
            }))
        } catch (e: any) {
            console.error('[CloudMusic] Fetch playlists failed:', e)
        }
    }

    // Create playlist
    const createPlaylist = async (
        name: string,
        description?: string
    ): Promise<CloudPlaylist | null> => {
        if (!user.value) return null

        try {
            const { data, error: createError } = await supabase
                .from('cloud_playlists')
                .insert({
                    user_id: user.value.id,
                    name,
                    description,
                    cover_color: getRandomColor(),
                })
                .select()
                .single()

            if (createError) {
                throw new Error(createError.message)
            }

            const playlist: CloudPlaylist = {
                id: data.id,
                userId: data.user_id,
                name: data.name,
                description: data.description ?? undefined,
                coverColor: data.cover_color,
                trackCount: 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            }

            playlists.value.unshift(playlist)
            return playlist
        } catch (e: any) {
            console.error('[CloudMusic] Create playlist failed:', e)
            return null
        }
    }

    // Delete playlist
    const deletePlaylist = async (playlistId: string): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('cloud_playlists')
                .delete()
                .eq('id', playlistId)

            if (deleteError) {
                throw new Error(deleteError.message)
            }

            playlists.value = playlists.value.filter((p) => p.id !== playlistId)
            return true
        } catch (e: any) {
            console.error('[CloudMusic] Delete playlist failed:', e)
            return false
        }
    }

    // Add track to playlist
    const addTrackToPlaylist = async (playlistId: string, trackId: string): Promise<boolean> => {
        if (!user.value) return false

        try {
            // Get max position
            const { data: posData } = await supabase
                .from('cloud_playlist_tracks')
                .select('position')
                .eq('playlist_id', playlistId)
                .order('position', { ascending: false })
                .limit(1)

            const nextPosition = (posData?.[0]?.position ?? -1) + 1

            const { error: insertError } = await supabase.from('cloud_playlist_tracks').insert({
                playlist_id: playlistId,
                track_id: trackId,
                position: nextPosition,
            })

            if (insertError) {
                throw new Error(insertError.message)
            }

            // Update local playlist track count
            const playlist = playlists.value.find((p) => p.id === playlistId)
            if (playlist) {
                playlist.trackCount++
            }

            return true
        } catch (e: any) {
            console.error('[CloudMusic] Add to playlist failed:', e)
            return false
        }
    }

    // Remove track from playlist
    const removeTrackFromPlaylist = async (
        playlistId: string,
        trackId: string
    ): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('cloud_playlist_tracks')
                .delete()
                .eq('playlist_id', playlistId)
                .eq('track_id', trackId)

            if (deleteError) {
                throw new Error(deleteError.message)
            }

            // Update local playlist track count
            const playlist = playlists.value.find((p) => p.id === playlistId)
            if (playlist && playlist.trackCount > 0) {
                playlist.trackCount--
            }

            return true
        } catch (e: any) {
            console.error('[CloudMusic] Remove from playlist failed:', e)
            return false
        }
    }

    // Get playlist tracks
    const getPlaylistTracks = async (playlistId: string): Promise<CloudTrack[]> => {
        try {
            const { data, error: fetchError } = await supabase
                .from('cloud_playlist_tracks')
                .select(
                    `
                    position,
                    cloud_tracks (*)
                `
                )
                .eq('playlist_id', playlistId)
                .order('position', { ascending: true })

            if (fetchError) {
                throw new Error(fetchError.message)
            }

            // Get liked track IDs
            const { data: likedData } = await supabase
                .from('cloud_liked_tracks')
                .select('track_id')
                .eq('user_id', user.value?.id)

            const likedIds = new Set((likedData || []).map((l: any) => l.track_id))

            return (data || [])
                .filter((item: any) => item.cloud_tracks)
                .map((item: any) => {
                    const track = item.cloud_tracks
                    const { data: urlData } = supabase.storage
                        .from(MUSIC_BUCKET)
                        .getPublicUrl(track.file_path)

                    return {
                        id: track.id,
                        userId: track.user_id,
                        fileName: track.file_name,
                        filePath: track.file_path,
                        fileSize: track.file_size,
                        mimeType: track.mime_type,
                        duration: track.duration,
                        title: track.title,
                        artist: track.artist,
                        album: track.album ?? undefined,
                        year: track.release_year ?? track.year,
                        genre: track.genre ?? undefined,
                        isLiked: likedIds.has(track.id),
                        playCount: track.play_count ?? 0,
                        createdAt: track.created_at,
                        updatedAt: track.updated_at,
                        publicUrl: urlData.publicUrl,
                    }
                })
        } catch (e: any) {
            console.error('[CloudMusic] Get playlist tracks failed:', e)
            return []
        }
    }

    // =========== PLAYBACK ===========

    // Play a track
    const playTrack = (track: CloudTrack) => {
        initAudio()
        if (!audioElement.value || !track.publicUrl) return

        audioElement.value.src = track.publicUrl
        audioElement.value.play()
        playbackState.value.currentTrack = track
        playbackState.value.isPlaying = true

        // Update play count in background
        updatePlayCount(track.id)
    }

    // Play queue from index
    const playQueue = (trackList: CloudTrack[], startIndex: number = 0) => {
        playbackState.value.queue = trackList
        playbackState.value.queueIndex = startIndex

        if (trackList[startIndex]) {
            playTrack(trackList[startIndex])
        }
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

    // Pause
    const pause = () => {
        audioElement.value?.pause()
    }

    // Resume
    const resume = () => {
        audioElement.value?.play()
    }

    // Seek to position
    const seek = (time: number) => {
        if (!audioElement.value) return
        audioElement.value.currentTime = time
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
        audioElement.value.muted = !audioElement.value.muted
        playbackState.value.isMuted = audioElement.value.muted
    }

    // Next track
    const nextTrack = () => {
        const { queue, queueIndex, isShuffled, repeatMode } = playbackState.value

        if (queue.length === 0) return

        let nextIndex: number

        if (isShuffled) {
            nextIndex = Math.floor(Math.random() * queue.length)
        } else if (queueIndex < queue.length - 1) {
            nextIndex = queueIndex + 1
        } else if (repeatMode === 'all') {
            nextIndex = 0
        } else {
            return // End of queue
        }

        playbackState.value.queueIndex = nextIndex
        playTrack(queue[nextIndex])
    }

    // Previous track
    const previousTrack = () => {
        const { queue, queueIndex, currentTime } = playbackState.value

        if (queue.length === 0) return

        // If more than 3 seconds in, restart current track
        if (currentTime > 3) {
            seek(0)
            return
        }

        const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1
        playbackState.value.queueIndex = prevIndex
        playTrack(queue[prevIndex])
    }

    // Toggle shuffle
    const toggleShuffle = () => {
        playbackState.value.isShuffled = !playbackState.value.isShuffled
    }

    // Toggle repeat
    const toggleRepeat = () => {
        const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one']
        const currentIndex = modes.indexOf(playbackState.value.repeatMode)
        playbackState.value.repeatMode = modes[(currentIndex + 1) % modes.length]
    }

    // Handle track ended
    const handleTrackEnded = () => {
        const { repeatMode } = playbackState.value

        if (repeatMode === 'one') {
            seek(0)
            audioElement.value?.play()
        } else {
            nextTrack()
        }
    }

    // Stop playback
    const stopPlayback = () => {
        if (audioElement.value) {
            audioElement.value.pause()
            audioElement.value.src = ''
        }
        playbackState.value.currentTrack = null
        playbackState.value.isPlaying = false
        playbackState.value.currentTime = 0
        playbackState.value.duration = 0
    }

    // Update play count
    const updatePlayCount = async (trackId: string) => {
        try {
            await supabase.rpc('increment_cloud_track_play_count', { track_id: trackId })
        } catch (e) {
            // Silently fail - not critical
            console.warn('[CloudMusic] Failed to update play count:', e)
        }
    }

    // =========== HELPERS ===========

    const getRandomColor = (): string => {
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

    const getTrackColor = (track: CloudTrack): string => {
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
        const index = (track.title?.length || track.fileName.length) % colors.length
        return colors[index]
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }

    const formatDuration = (seconds?: number): string => {
        if (!seconds) return '--:--'
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return {
        // State
        tracks,
        sortedTracks,
        playlists,
        likedTracks,
        loading,
        uploading,
        uploadProgress,
        error,
        sortBy,
        sortOrder,
        playbackState,

        // Track methods
        fetchTracks,
        uploadTracks,
        deleteTrack,
        toggleLike,
        fetchLikedTracks,

        // Playlist methods
        fetchPlaylists,
        createPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        getPlaylistTracks,

        // Playback methods
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
        stopPlayback,

        // Helpers
        getTrackColor,
        formatFileSize,
        formatDuration,
        clearState,
    }
}
