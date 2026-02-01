-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_liked_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_recently_played ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own tracks" ON public.local_tracks;
DROP POLICY IF EXISTS "Users can insert their own tracks" ON public.local_tracks;
DROP POLICY IF EXISTS "Users can update their own tracks" ON public.local_tracks;
DROP POLICY IF EXISTS "Users can delete their own tracks" ON public.local_tracks;
DROP POLICY IF EXISTS "Users can view their own playlists" ON public.local_playlists;
DROP POLICY IF EXISTS "Users can insert their own playlists" ON public.local_playlists;
DROP POLICY IF EXISTS "Users can update their own playlists" ON public.local_playlists;
DROP POLICY IF EXISTS "Users can delete their own playlists" ON public.local_playlists;
DROP POLICY IF EXISTS "Users can view playlist tracks from their own playlists" ON public.local_playlist_tracks;
DROP POLICY IF EXISTS "Users can insert tracks to their own playlists" ON public.local_playlist_tracks;
DROP POLICY IF EXISTS "Users can delete tracks from their own playlists" ON public.local_playlist_tracks;
DROP POLICY IF EXISTS "Users can view their own liked tracks" ON public.local_liked_tracks;
DROP POLICY IF EXISTS "Users can insert their own liked tracks" ON public.local_liked_tracks;
DROP POLICY IF EXISTS "Users can delete their own liked tracks" ON public.local_liked_tracks;
DROP POLICY IF EXISTS "Users can view their own recently played" ON public.local_recently_played;
DROP POLICY IF EXISTS "Users can insert to their own recently played" ON public.local_recently_played;
DROP POLICY IF EXISTS "Users can update their own recently played" ON public.local_recently_played;
DROP POLICY IF EXISTS "Users can delete from their own recently played" ON public.local_recently_played;
DROP POLICY IF EXISTS "Users can view their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Local Tracks: Users can view, insert, update, and delete their own tracks
CREATE POLICY "Users can view their own tracks" ON public.local_tracks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracks" ON public.local_tracks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks" ON public.local_tracks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks" ON public.local_tracks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Local Playlists: Users can view, insert, update, and delete their own playlists
CREATE POLICY "Users can view their own playlists" ON public.local_playlists
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists" ON public.local_playlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON public.local_playlists
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON public.local_playlists
  FOR DELETE
  USING (auth.uid() = user_id);

-- Local Playlist Tracks: Users can view, insert, and delete tracks from their own playlists
CREATE POLICY "Users can view playlist tracks from their own playlists" ON public.local_playlist_tracks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.local_playlists
      WHERE local_playlists.id = local_playlist_tracks.playlist_id
      AND local_playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tracks to their own playlists" ON public.local_playlist_tracks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_playlists
      WHERE local_playlists.id = local_playlist_tracks.playlist_id
      AND local_playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tracks from their own playlists" ON public.local_playlist_tracks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.local_playlists
      WHERE local_playlists.id = local_playlist_tracks.playlist_id
      AND local_playlists.user_id = auth.uid()
    )
  );

-- Local Liked Tracks: Users can view, insert, and delete their own likes
CREATE POLICY "Users can view their own liked tracks" ON public.local_liked_tracks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own liked tracks" ON public.local_liked_tracks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liked tracks" ON public.local_liked_tracks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Local Recently Played: Users can view, insert, and update their own history
CREATE POLICY "Users can view their own recently played" ON public.local_recently_played
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their own recently played" ON public.local_recently_played
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recently played" ON public.local_recently_played
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own recently played" ON public.local_recently_played
  FOR DELETE
  USING (auth.uid() = user_id);

-- Videos: Users can view, insert, update, and delete their own videos
CREATE POLICY "Users can view their own videos" ON public.videos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" ON public.videos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" ON public.videos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" ON public.videos
  FOR DELETE
  USING (auth.uid() = user_id);
