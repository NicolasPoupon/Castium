-- Create videos bucket for storing video files
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;
-- Create videos table for metadata
CREATE TABLE IF NOT EXISTS public.videos (
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
    release_year INTEGER,
    description TEXT,

    -- Playback tracking
    playback_position REAL DEFAULT 0,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'watching', 'completed')),
    last_watched_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Indexes for videos table
CREATE INDEX idx_videos_user_id ON public.videos (user_id);
CREATE INDEX idx_videos_status ON public.videos (status);
CREATE INDEX idx_videos_created_at ON public.videos (created_at DESC);
-- Trigger for updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Storage policies for videos bucket
CREATE POLICY "Users can upload their own videos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users can view their videos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users can delete their videos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Public can view videos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'videos');
