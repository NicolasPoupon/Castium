-- Create music bucket for storing audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;
-- Create cloud_tracks table for uploaded music metadata
CREATE TABLE IF NOT EXISTS public.cloud_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File info
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    duration REAL, -- in seconds

    -- Metadata (extracted from file or user-provided)
    title TEXT,
    artist TEXT,
    album TEXT,
    release_year INTEGER,
    genre TEXT,
    track_number INTEGER,
    disc_number INTEGER,
    cover_path TEXT,

    -- Playback tracking
    play_count INTEGER DEFAULT 0,
    last_played_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint per user
    UNIQUE(user_id, file_path)
);
-- Create cloud_playlists table
CREATE TABLE IF NOT EXISTS public.cloud_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    cover_color TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Create cloud_playlist_tracks junction table
CREATE TABLE IF NOT EXISTS public.cloud_playlist_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.cloud_playlists(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.cloud_tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(playlist_id, track_id)
);
-- Create cloud_liked_tracks table
CREATE TABLE IF NOT EXISTS public.cloud_liked_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.cloud_tracks(id) ON DELETE CASCADE,
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, track_id)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_cloud_tracks_user_id ON public.cloud_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_tracks_artist ON public.cloud_tracks(artist);
CREATE INDEX IF NOT EXISTS idx_cloud_tracks_album ON public.cloud_tracks(album);
CREATE INDEX IF NOT EXISTS idx_cloud_tracks_created_at ON public.cloud_tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cloud_playlists_user_id ON public.cloud_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_playlist_tracks_playlist_id ON public.cloud_playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_cloud_playlist_tracks_track_id ON public.cloud_playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_cloud_liked_tracks_user_id ON public.cloud_liked_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_liked_tracks_track_id ON public.cloud_liked_tracks(track_id);
-- Trigger for updated_at
CREATE TRIGGER update_cloud_tracks_updated_at
BEFORE UPDATE ON public.cloud_tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cloud_playlists_updated_at
BEFORE UPDATE ON public.cloud_playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Function to increment play count
CREATE OR REPLACE FUNCTION public.increment_cloud_track_play_count(track_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.cloud_tracks
    SET play_count = play_count + 1,
        last_played_at = CURRENT_TIMESTAMP
    WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Enable RLS
ALTER TABLE public.cloud_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_liked_tracks ENABLE ROW LEVEL SECURITY;
-- RLS Policies for cloud_tracks
CREATE POLICY "Users can view their own cloud tracks"
    ON public.cloud_tracks FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cloud tracks"
    ON public.cloud_tracks FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cloud tracks"
    ON public.cloud_tracks FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cloud tracks"
    ON public.cloud_tracks FOR DELETE
    USING (auth.uid() = user_id);
-- RLS Policies for cloud_playlists
CREATE POLICY "Users can view their own cloud playlists"
    ON public.cloud_playlists FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cloud playlists"
    ON public.cloud_playlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cloud playlists"
    ON public.cloud_playlists FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cloud playlists"
    ON public.cloud_playlists FOR DELETE
    USING (auth.uid() = user_id);
-- RLS Policies for cloud_playlist_tracks
CREATE POLICY "Users can view their cloud playlist tracks"
    ON public.cloud_playlist_tracks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cloud_playlists
            WHERE cloud_playlists.id = cloud_playlist_tracks.playlist_id
            AND cloud_playlists.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert into their cloud playlists"
    ON public.cloud_playlist_tracks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cloud_playlists
            WHERE cloud_playlists.id = cloud_playlist_tracks.playlist_id
            AND cloud_playlists.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete from their cloud playlists"
    ON public.cloud_playlist_tracks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cloud_playlists
            WHERE cloud_playlists.id = cloud_playlist_tracks.playlist_id
            AND cloud_playlists.user_id = auth.uid()
        )
    );
-- RLS Policies for cloud_liked_tracks
CREATE POLICY "Users can view their own cloud liked tracks"
    ON public.cloud_liked_tracks FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cloud liked tracks"
    ON public.cloud_liked_tracks FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cloud liked tracks"
    ON public.cloud_liked_tracks FOR DELETE
    USING (auth.uid() = user_id);
-- Storage policies for music bucket
CREATE POLICY "Users can upload their own music" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'music' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users can view their music" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'music' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users can delete their music" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'music' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Public can view music" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'music');
