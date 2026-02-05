-- Add video ratings and playlists columns to profiles table

-- Local video ratings (keyed by video path)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS video_ratings JSONB DEFAULT '{}'::jsonb;

-- Cloud video ratings (keyed by video id)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cloud_video_ratings JSONB DEFAULT '{}'::jsonb;

-- Cloud video playlists (array of playlist names)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cloud_video_playlists JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.video_ratings IS 'Local video ratings: {path: {rating: number, comment: string, createdAt: string}}';
COMMENT ON COLUMN public.profiles.cloud_video_ratings IS 'Cloud video ratings: {id: {rating: number, comment: string}}';
COMMENT ON COLUMN public.profiles.cloud_video_playlists IS 'Cloud video playlist names: string[]';
