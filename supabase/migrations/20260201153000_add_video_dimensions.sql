-- Add width/height metadata for uploaded videos
--
-- NOTE: This migration may not be pushable to the linked remote project
-- if its migration history uses legacy 8-digit versions (YYYYMMDD).

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS height integer;
-- Helpful for user feed queries
CREATE INDEX IF NOT EXISTS videos_user_id_created_at_idx
  ON public.videos(user_id, created_at DESC);
