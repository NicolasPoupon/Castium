/**
 * Composable for managing user data deletion
 * Allows users to delete their data by category or completely delete their account
 */

export function useUserDataManagement() {
    const supabase = useSupabase()
    const { user, signOut } = useAuth()

    // Helper to safely delete from a table
    const safeDelete = async (table: string, column: string = 'user_id') => {
        try {
            await supabase.from(table).delete().eq(column, user.value!.id)
        } catch (e) {
            console.log(`[UserData] Could not delete from ${table}, might not exist`)
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
        category: 'movies' | 'music' | 'radio' | 'tv' | 'podcasts',
    ): Promise<boolean> => {
        if (!user.value) return false

        try {
            switch (category) {
                case 'movies':
                    await safeDelete('videos')
                    break

                case 'music':
                    await deleteMusicData()
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
                    break
            }

            console.log(`[UserData] Deleted all ${category} data for user`)
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
            await deleteDataByCategory('movies')
            await deleteDataByCategory('music')
            await deleteDataByCategory('radio')
            await deleteDataByCategory('tv')
            await deleteDataByCategory('podcasts')

            // Delete any remaining custom_streams
            await safeDelete('custom_streams')

            console.log('[UserData] Deleted all user data')
            return true
        } catch (e: any) {
            console.error('[UserData] Failed to delete all data:', e)
            return false
        }
    }

    // Delete account completely (all data + profile + auth)
    const deleteAccount = async (): Promise<boolean> => {
        if (!user.value) return false

        try {
            // Use RPC function which handles everything properly
            const { error } = await supabase.rpc('delete_user')

            if (error) {
                console.error('[UserData] RPC delete_user failed:', error)
                // Fallback: delete data manually then sign out
                await deleteAllUserData()
                await supabase.from('profiles').delete().eq('id', user.value.id)
                await signOut()
                return true
            }

            await signOut()
            console.log('[UserData] Account deleted successfully')
            return true
        } catch (e: any) {
            console.error('[UserData] Failed to delete account:', e)
            return false
        }
    }

    return {
        deleteDataByCategory,
        deleteAllUserData,
        deleteAccount,
    }
}
