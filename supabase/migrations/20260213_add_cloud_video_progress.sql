-- Add cloud video watching progress and favorites columns to profiles table

-- Cloud video watching progress (keyed by video id, stores current time)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cloud_video_watching JSONB DEFAULT '{}'::jsonb;

-- Cloud video favorites (array of video ids)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cloud_video_favorites JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.cloud_video_watching IS 'Cloud video watching progress: {videoId: currentTime (number)}';
COMMENT ON COLUMN public.profiles.cloud_video_favorites IS 'Cloud video favorite ids: string[]';
