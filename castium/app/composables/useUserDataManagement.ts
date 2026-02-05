/**
 * Composable for managing user data deletion
 * Allows users to delete their data by category or completely delete their account
 */

const DB_NAME = 'castium-videos-db'
const MUSIC_DB_NAME = 'castium-music-db'
const PODCAST_DB_NAME = 'castium-podcasts-db'
const PHOTOS_DB_NAME = 'castium-photos-db'

export function useUserDataManagement() {
    const supabase = useSupabase()
    const { user, updateProfile, signOut } = useAuth()

    // Helper to safely delete from a table
    const safeDelete = async (table: string, column: string = 'user_id') => {
        try {
            await supabase.from(table).delete().eq(column, user.value!.id)
        } catch {
            console.log(`[UserData] Could not delete from ${table}, might not exist`)
        }
    }

    // Clear IndexedDB database
    const clearIndexedDB = async (dbName: string): Promise<void> => {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.deleteDatabase(dbName)
                request.onsuccess = () => {
                    console.log(`[UserData] Deleted IndexedDB: ${dbName}`)
                    resolve()
                }
                request.onerror = () => {
                    console.log(`[UserData] Could not delete IndexedDB: ${dbName}`)
                    resolve()
                }
                request.onblocked = () => {
                    console.log(`[UserData] IndexedDB blocked: ${dbName}`)
                    resolve()
                }
            } catch {
                resolve()
            }
        })
    }

    // Clear profile data fields related to a category
    const clearProfileData = async (
        fields: Record<string, null | unknown[] | object>
    ): Promise<void> => {
        try {
            await updateProfile(fields as any)
        } catch (e) {
            console.log('[UserData] Could not clear profile fields:', e)
        }
    }

    // Delete music data (order matters for foreign keys)
    const deleteMusicData = async (): Promise<void> => {
        // local_playlist_tracks will be deleted via CASCADE when playlists are deleted
        // local_liked_tracks and local_recently_played reference tracks, delete first
        await safeDelete('local_liked_tracks')
        await safeDelete('local_recently_played')
        // Delete playlists (CASCADE will delete playlist_tracks)
        await safeDelete('local_playlists')
        // Now delete tracks
        await safeDelete('local_tracks')

        // Same for cloud music
        await safeDelete('cloud_liked_tracks')
        await safeDelete('cloud_playlists') // CASCADE deletes cloud_playlist_tracks
        await safeDelete('cloud_tracks')

        // Delete music custom streams
        await supabase
            .from('custom_streams')
            .delete()
            .eq('user_id', user.value!.id)
            .eq('type', 'radio')
    }

    // Delete data for a specific category
    const deleteDataByCategory = async (
        category: 'lectures' | 'music' | 'radio' | 'tv' | 'podcasts' | 'photos'
    ): Promise<boolean> => {
        if (!user.value) return false

        try {
            switch (category) {
                case 'lectures':
                    // Delete from database
                    await safeDelete('videos')
                    // Clear profile data
                    await clearProfileData({
                        video_folder_path: null,
                        video_files: null,
                        video_watching: {},
                        video_watched: [],
                        video_favorites: [],
                        video_ratings: {},
                        cloud_video_ratings: {},
                        cloud_video_playlists: [],
                        cloud_video_watching: {},
                        cloud_video_favorites: [],
                    })
                    // Clear IndexedDB for folder handles
                    await clearIndexedDB(DB_NAME)
                    break

                case 'music':
                    await deleteMusicData()
                    // Clear IndexedDB for music folder handles
                    await clearIndexedDB(MUSIC_DB_NAME)
                    break

                case 'radio':
                    await safeDelete('radio_favorites')
                    await supabase
                        .from('custom_streams')
                        .delete()
                        .eq('user_id', user.value.id)
                        .eq('type', 'radio')
                    break

                case 'tv':
                    await safeDelete('iptv_favorites')
                    await supabase
                        .from('custom_streams')
                        .delete()
                        .eq('user_id', user.value.id)
                        .eq('type', 'tv')
                    break

                case 'podcasts':
                    await safeDelete('local_podcasts')
                    await safeDelete('cloud_podcasts')
                    // Clear IndexedDB for podcast folder handles
                    await clearIndexedDB(PODCAST_DB_NAME)
                    break

                case 'photos':
                    // Delete cloud photos data
                    await safeDelete('cloud_photo_folder_items')
                    await safeDelete('cloud_photo_folders')
                    await safeDelete('cloud_liked_photos')
                    await safeDelete('local_liked_photos')
                    await safeDelete('cloud_photos')
                    // Clear IndexedDB for photos folder handles
                    await clearIndexedDB(PHOTOS_DB_NAME)
                    break
            }

            console.log(`[UserData] Deleted all ${category} data for user`)

            // Reload page to ensure all state is cleared
            if (typeof window !== 'undefined') {
                window.location.reload()
            }

            return true
        } catch (e: any) {
            console.error(`[UserData] Failed to delete ${category} data:`, e)
            return false
        }
    }

    // Delete all user data except auth/profile
    const deleteAllUserData = async (): Promise<boolean> => {
        if (!user.value) return false

        try {
            // Delete all categories
            await deleteDataByCategory('lectures')
            await deleteDataByCategory('music')
            await deleteDataByCategory('radio')
            await deleteDataByCategory('tv')
            await deleteDataByCategory('podcasts')
            await deleteDataByCategory('photos')

            // Delete any remaining custom_streams
            await safeDelete('custom_streams')

            // Clear all IndexedDB databases
            await clearIndexedDB(DB_NAME)
            await clearIndexedDB(MUSIC_DB_NAME)
            await clearIndexedDB(PODCAST_DB_NAME)
            await clearIndexedDB(PHOTOS_DB_NAME)

            // Clear all profile data related to local storage
            await clearProfileData({
                video_folder_path: null,
                video_files: null,
                video_watching: {},
                video_watched: [],
                video_favorites: [],
                video_ratings: {},
                cloud_video_ratings: {},
                cloud_video_playlists: [],
                cloud_video_watching: {},
                cloud_video_favorites: [],
            })

            console.log('[UserData] Deleted all user data')

            // Reload page to ensure all state is cleared
            if (typeof window !== 'undefined') {
                window.location.reload()
            }

            return true
        } catch (e: any) {
            console.error('[UserData] Failed to delete all data:', e)
            return false
        }
    }

    // Delete account completely (all data + profile + auth)
    const deleteAccount = async (): Promise<boolean> => {
        if (!user.value) return false

        const userId = user.value.id

        try {
            // FIRST: Get the session token before any deletions
            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData?.session?.access_token

            if (!token) {
                console.error('[UserData] No valid session token')
                return false
            }

            // Delete all user data from all tables
            // Custom streams
            await safeDelete('custom_streams')

            // IPTV and Radio favorites
            await safeDelete('iptv_favorites')
            await safeDelete('radio_favorites')

            // Local music (order matters for foreign keys)
            await safeDelete('local_liked_tracks')
            await safeDelete('local_recently_played')
            await safeDelete('local_playlists') // CASCADE deletes playlist_tracks
            await safeDelete('local_tracks')

            // Cloud music
            await safeDelete('cloud_liked_tracks')
            await safeDelete('cloud_playlists') // CASCADE deletes playlist_tracks
            await safeDelete('cloud_tracks')

            // Podcasts
            await safeDelete('local_podcasts')
            await safeDelete('cloud_podcasts')

            // Videos
            await safeDelete('videos')

            // Delete profile
            await supabase.from('profiles').delete().eq('id', userId)

            // Clear all IndexedDB databases
            await clearIndexedDB(DB_NAME)
            await clearIndexedDB(MUSIC_DB_NAME)
            await clearIndexedDB(PODCAST_DB_NAME)

            // Clear localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.clear()
            }

            // Call server API to delete auth user (requires service role key)
            console.log('[UserData] Calling delete-account API with token...')
            try {
                const response = await $fetch('/api/delete-account', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                console.log('[UserData] Auth user deleted:', response)
            } catch (e) {
                console.error('[UserData] Failed to delete auth user:', e)
            }

            // Sign out the user
            await signOut()

            console.log('[UserData] Account deleted successfully')

            // Redirect to home page
            if (typeof window !== 'undefined') {
                window.location.href = '/'
            }

            return true
        } catch (e: any) {
            console.error('[UserData] Failed to delete account:', e)
            // Even if there's an error, try to sign out
            try {
                await signOut()
            } catch {}
            return false
        }
    }

    return {
        deleteDataByCategory,
        deleteAllUserData,
        deleteAccount,
    }
}
