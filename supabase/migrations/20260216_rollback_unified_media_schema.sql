-- ============================================
-- ROLLBACK: 20260215_unified_media_schema.sql
-- Reverts all changes from unified media schema
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_media_items_updated_at ON public.media_items;
DROP TRIGGER IF EXISTS update_media_playlists_updated_at ON public.media_playlists;

-- Drop function
DROP FUNCTION IF EXISTS public.update_media_updated_at();

-- Drop tables (cascade will handle foreign keys and policies)
DROP TABLE IF EXISTS public.media_playlist_items CASCADE;
DROP TABLE IF EXISTS public.media_playlists CASCADE;
DROP TABLE IF EXISTS public.media_folders CASCADE;
DROP TABLE IF EXISTS public.media_items CASCADE;
