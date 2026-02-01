-- Temporary: allow public (anon) SELECT for testing purposes
-- Remove this migration when you have created users and validated auth

ALTER TABLE public.local_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select local_playlists" ON public.local_playlists;
CREATE POLICY "Public select local_playlists" ON public.local_playlists
  FOR SELECT USING (true);
ALTER TABLE public.local_liked_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select local_liked_tracks" ON public.local_liked_tracks;
CREATE POLICY "Public select local_liked_tracks" ON public.local_liked_tracks
  FOR SELECT USING (true);
ALTER TABLE public.local_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select local_tracks" ON public.local_tracks;
CREATE POLICY "Public select local_tracks" ON public.local_tracks
  FOR SELECT USING (true);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select videos" ON public.videos;
CREATE POLICY "Public select videos" ON public.videos
  FOR SELECT USING (true);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
CREATE POLICY "Public select profiles" ON public.profiles
  FOR SELECT USING (true);
