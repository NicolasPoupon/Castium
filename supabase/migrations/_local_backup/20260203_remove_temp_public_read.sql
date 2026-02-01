-- Remove temporary public read policies (they were only for debugging)

DROP POLICY IF EXISTS "Public select local_playlists" ON public.local_playlists;
DROP POLICY IF EXISTS "Public select local_liked_tracks" ON public.local_liked_tracks;
DROP POLICY IF EXISTS "Public select local_tracks" ON public.local_tracks;
DROP POLICY IF EXISTS "Public select videos" ON public.videos;
DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
