-- ============================================
-- UNIFIED MEDIA LIBRARY SCHEMA
-- Single table for all media types: music, video, podcast
-- ============================================

-- Create unified media_items table
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Source: 'local' or 'cloud'
    source TEXT NOT NULL CHECK (source IN ('local', 'cloud')),

    -- Type: 'music', 'video', 'podcast'
    media_type TEXT NOT NULL CHECK (media_type IN ('music', 'video', 'podcast')),

    -- File info
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    storage_path TEXT, -- For cloud files, the Supabase storage path

    -- Common metadata
    title TEXT,
    artist TEXT,
    album TEXT,
    year INTEGER,
    genre TEXT,
    description TEXT,
    duration REAL, -- in seconds

    -- Media specific
    cover_path TEXT, -- Cover art path (base64 for local, storage path for cloud)
    thumbnail_path TEXT, -- Video thumbnail
    width INTEGER, -- Video dimensions
    height INTEGER,

    -- User interactions
    is_liked BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    rating_comment TEXT,
    notes TEXT, -- User notes

    -- Progress tracking
    playback_position REAL DEFAULT 0,
    playback_duration REAL DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    last_played_at TIMESTAMPTZ,
    play_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint per user per source per path
    UNIQUE(user_id, source, media_type, file_path)
);

-- Create playlists table (unified for all media types)
CREATE TABLE IF NOT EXISTS public.media_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Type: 'music', 'video', 'podcast' or 'mixed'
    media_type TEXT NOT NULL CHECK (media_type IN ('music', 'video', 'podcast', 'mixed')),

    name TEXT NOT NULL,
    description TEXT,
    cover_color TEXT, -- Hex color for playlist cover
    cover_path TEXT, -- Custom cover image

    -- Auto-generated playlists
    is_smart BOOLEAN DEFAULT FALSE,
    smart_criteria JSONB, -- For smart playlists (e.g., { "isLiked": true })

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, name, media_type)
);

-- Create playlist items junction table
CREATE TABLE IF NOT EXISTS public.media_playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.media_playlists(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(playlist_id, media_item_id)
);

-- Create folder handles table for IndexedDB reference
-- (This is just for tracking, actual handles are in IndexedDB)
CREATE TABLE IF NOT EXISTS public.media_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('music', 'video', 'podcast')),
    folder_name TEXT NOT NULL,
    folder_path TEXT,
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, media_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_items_user_type ON public.media_items(user_id, media_type);
CREATE INDEX IF NOT EXISTS idx_media_items_user_source ON public.media_items(user_id, source);
CREATE INDEX IF NOT EXISTS idx_media_items_liked ON public.media_items(user_id, is_liked) WHERE is_liked = TRUE;
CREATE INDEX IF NOT EXISTS idx_media_items_rated ON public.media_items(user_id, rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_items_in_progress ON public.media_items(user_id, playback_position) WHERE playback_position > 0;
CREATE INDEX IF NOT EXISTS idx_media_items_last_played ON public.media_items(user_id, last_played_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_playlists_user ON public.media_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_media_playlist_items_playlist ON public.media_playlist_items(playlist_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_items_updated_at
BEFORE UPDATE ON public.media_items
FOR EACH ROW
EXECUTE FUNCTION public.update_media_updated_at();

CREATE TRIGGER update_media_playlists_updated_at
BEFORE UPDATE ON public.media_playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_media_updated_at();

-- RLS Policies
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;

-- Users can only access their own media
CREATE POLICY "Users can manage their own media items" ON public.media_items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlists" ON public.media_playlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlist items" ON public.media_playlist_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.media_playlists
            WHERE id = playlist_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own folders" ON public.media_folders
    FOR ALL USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT ALL ON public.media_items TO authenticated;
GRANT ALL ON public.media_playlists TO authenticated;
GRANT ALL ON public.media_playlist_items TO authenticated;
GRANT ALL ON public.media_folders TO authenticated;
