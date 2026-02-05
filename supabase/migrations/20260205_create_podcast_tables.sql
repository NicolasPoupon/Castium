-- Create podcasts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('podcasts', 'podcasts', true)
ON CONFLICT (id) DO NOTHING;

-- Create local_podcasts table for tracking local podcast progress/notes
CREATE TABLE IF NOT EXISTS public.local_podcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File identification
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,

    -- Metadata
    title TEXT,
    artist TEXT, -- Host/Author
    album TEXT,  -- Podcast series
    duration REAL,

    -- User data
    is_liked BOOLEAN DEFAULT FALSE,
    notes TEXT,
    comment TEXT,

    -- Progress tracking
    playback_time REAL DEFAULT 0,
    progress REAL DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    last_played_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, file_path)
);

-- Create cloud_podcasts table for uploaded podcasts
CREATE TABLE IF NOT EXISTS public.cloud_podcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File info
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    duration REAL,

    -- Metadata
    title TEXT,
    artist TEXT, -- Host/Author
    album TEXT,  -- Podcast series
    description TEXT,
    year INTEGER,
    genre TEXT,
    cover_path TEXT,

    -- User data
    is_liked BOOLEAN DEFAULT FALSE,
    notes TEXT,
    comment TEXT,

    -- Progress tracking
    playback_time REAL DEFAULT 0,
    progress REAL DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    last_played_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, file_path)
);

-- Indexes for local_podcasts
CREATE INDEX IF NOT EXISTS idx_local_podcasts_user_id ON public.local_podcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_local_podcasts_is_liked ON public.local_podcasts(user_id, is_liked) WHERE is_liked = true;
CREATE INDEX IF NOT EXISTS idx_local_podcasts_in_progress ON public.local_podcasts(user_id, is_completed) WHERE is_completed = false AND playback_time > 0;

-- Indexes for cloud_podcasts
CREATE INDEX IF NOT EXISTS idx_cloud_podcasts_user_id ON public.cloud_podcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_podcasts_is_liked ON public.cloud_podcasts(user_id, is_liked) WHERE is_liked = true;
CREATE INDEX IF NOT EXISTS idx_cloud_podcasts_in_progress ON public.cloud_podcasts(user_id, is_completed) WHERE is_completed = false AND playback_time > 0;
CREATE INDEX IF NOT EXISTS idx_cloud_podcasts_created_at ON public.cloud_podcasts(created_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_local_podcasts_updated_at
BEFORE UPDATE ON public.local_podcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cloud_podcasts_updated_at
BEFORE UPDATE ON public.cloud_podcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.local_podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_podcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for local_podcasts
CREATE POLICY "Users can view their own local podcasts"
    ON public.local_podcasts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own local podcasts"
    ON public.local_podcasts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own local podcasts"
    ON public.local_podcasts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own local podcasts"
    ON public.local_podcasts FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for cloud_podcasts
CREATE POLICY "Users can view their own cloud podcasts"
    ON public.cloud_podcasts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cloud podcasts"
    ON public.cloud_podcasts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cloud podcasts"
    ON public.cloud_podcasts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cloud podcasts"
    ON public.cloud_podcasts FOR DELETE
    USING (auth.uid() = user_id);

-- Storage policies for podcasts bucket
CREATE POLICY "Users can upload their own podcasts" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'podcasts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their podcasts" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'podcasts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their podcasts" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'podcasts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view podcasts" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'podcasts');
