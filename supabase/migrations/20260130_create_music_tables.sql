-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Trigger for profiles updated_at
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();
-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email)
    ON CONFLICT (id) DO UPDATE SET email = new.email;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
-- Create local_tracks table for storing local music metadata
CREATE TABLE IF NOT EXISTS public.local_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File info
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT,

    -- Metadata
    title TEXT,
    artist TEXT,
    album TEXT,
    album_artist TEXT,
    year INTEGER,
    genre TEXT,
    track_number INTEGER,
    disc_number INTEGER,
    duration REAL, -- in seconds

    -- Cover art (stored as base64 or path)
    cover_art TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint per user
    UNIQUE(user_id, file_path)
);
-- Create local_playlists table
CREATE TABLE IF NOT EXISTS public.local_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    cover_color TEXT, -- Hex color for playlist cover

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create playlist_tracks junction table
CREATE TABLE IF NOT EXISTS public.local_playlist_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.local_playlists(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.local_tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(playlist_id, track_id)
);
-- Create liked_tracks table
CREATE TABLE IF NOT EXISTS public.local_liked_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.local_tracks(id) ON DELETE CASCADE,
    liked_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, track_id)
);
-- Create recently_played table
CREATE TABLE IF NOT EXISTS public.local_recently_played (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.local_tracks(id) ON DELETE CASCADE,
    played_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes
CREATE INDEX IF NOT EXISTS local_tracks_user_id_idx ON public.local_tracks(user_id);
CREATE INDEX IF NOT EXISTS local_tracks_artist_idx ON public.local_tracks(artist);
CREATE INDEX IF NOT EXISTS local_tracks_album_idx ON public.local_tracks(album);
CREATE INDEX IF NOT EXISTS local_playlists_user_id_idx ON public.local_playlists(user_id);
CREATE INDEX IF NOT EXISTS local_playlist_tracks_playlist_id_idx ON public.local_playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS local_liked_tracks_user_id_idx ON public.local_liked_tracks(user_id);
CREATE INDEX IF NOT EXISTS local_recently_played_user_id_idx ON public.local_recently_played(user_id);
CREATE INDEX IF NOT EXISTS local_recently_played_played_at_idx ON public.local_recently_played(played_at DESC);
-- Enable RLS
ALTER TABLE public.local_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_liked_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_recently_played ENABLE ROW LEVEL SECURITY;
-- RLS Policies for local_tracks
CREATE POLICY "Users can view their own tracks"
    ON public.local_tracks FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tracks"
    ON public.local_tracks FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tracks"
    ON public.local_tracks FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tracks"
    ON public.local_tracks FOR DELETE
    USING (auth.uid() = user_id);
-- RLS Policies for local_playlists
CREATE POLICY "Users can view their own playlists"
    ON public.local_playlists FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own playlists"
    ON public.local_playlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own playlists"
    ON public.local_playlists FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own playlists"
    ON public.local_playlists FOR DELETE
    USING (auth.uid() = user_id);
-- RLS Policies for local_playlist_tracks
CREATE POLICY "Users can view their playlist tracks"
    ON public.local_playlist_tracks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.local_playlists
            WHERE id = playlist_id AND user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert their playlist tracks"
    ON public.local_playlist_tracks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.local_playlists
            WHERE id = playlist_id AND user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete their playlist tracks"
    ON public.local_playlist_tracks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.local_playlists
            WHERE id = playlist_id AND user_id = auth.uid()
        )
    );
-- RLS Policies for local_liked_tracks
CREATE POLICY "Users can view their liked tracks"
    ON public.local_liked_tracks FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their liked tracks"
    ON public.local_liked_tracks FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their liked tracks"
    ON public.local_liked_tracks FOR DELETE
    USING (auth.uid() = user_id);
-- RLS Policies for local_recently_played
CREATE POLICY "Users can view their recently played"
    ON public.local_recently_played FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their recently played"
    ON public.local_recently_played FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their recently played"
    ON public.local_recently_played FOR DELETE
    USING (auth.uid() = user_id);
-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_local_music_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_local_tracks_updated_at ON public.local_tracks;
CREATE TRIGGER update_local_tracks_updated_at
    BEFORE UPDATE ON public.local_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_local_music_updated_at();
DROP TRIGGER IF EXISTS update_local_playlists_updated_at ON public.local_playlists;
CREATE TRIGGER update_local_playlists_updated_at
    BEFORE UPDATE ON public.local_playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_local_music_updated_at();
