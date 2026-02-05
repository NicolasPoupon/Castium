-- Migration: Add user self-delete function
-- Created: 2026-02-10
-- Allows users to delete their own account

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.delete_user();

-- Function to delete the current user
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete from all user data tables (CASCADE will handle foreign keys)
    -- The profiles table has ON DELETE CASCADE from auth.users

    -- Delete custom streams
    DELETE FROM public.custom_streams WHERE user_id = current_user_id;

    -- Delete IPTV favorites
    DELETE FROM public.iptv_favorites WHERE user_id = current_user_id;

    -- Delete radio favorites
    DELETE FROM public.radio_favorites WHERE user_id = current_user_id;

    -- Delete local music (order matters due to foreign keys)
    DELETE FROM public.local_playlist_tracks WHERE playlist_id IN (
        SELECT id FROM public.local_playlists WHERE user_id = current_user_id
    );
    DELETE FROM public.local_playlists WHERE user_id = current_user_id;
    DELETE FROM public.local_liked_tracks WHERE user_id = current_user_id;
    DELETE FROM public.local_recently_played WHERE user_id = current_user_id;
    DELETE FROM public.local_tracks WHERE user_id = current_user_id;

    -- Delete cloud music (order matters due to foreign keys)
    DELETE FROM public.cloud_playlist_tracks WHERE playlist_id IN (
        SELECT id FROM public.cloud_playlists WHERE user_id = current_user_id
    );
    DELETE FROM public.cloud_playlists WHERE user_id = current_user_id;
    DELETE FROM public.cloud_liked_tracks WHERE user_id = current_user_id;
    DELETE FROM public.cloud_tracks WHERE user_id = current_user_id;

    -- Delete podcasts
    DELETE FROM public.local_podcasts WHERE user_id = current_user_id;
    DELETE FROM public.cloud_podcasts WHERE user_id = current_user_id;

    -- Delete videos
    DELETE FROM public.videos WHERE user_id = current_user_id;

    -- Delete profile (this will cascade from auth.users deletion anyway)
    DELETE FROM public.profiles WHERE id = current_user_id;

    -- Finally, delete the auth user
    DELETE FROM auth.users WHERE id = current_user_id;

END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
