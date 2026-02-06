-- ============================================
-- PHOTOS TABLES
-- Tables for cloud photo storage and management
-- ============================================

-- Create photos bucket for storing image files
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create cloud_photos table for uploaded photo metadata
CREATE TABLE IF NOT EXISTS public.cloud_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File info
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,

    -- Image dimensions
    width INTEGER,
    height INTEGER,

    -- Metadata (extracted from EXIF or user-provided)
    title TEXT,
    description TEXT,

    -- EXIF data
    taken_at TIMESTAMP WITH TIME ZONE,
    camera_make TEXT,
    camera_model TEXT,
    lens_model TEXT,
    focal_length TEXT,
    aperture TEXT,
    shutter_speed TEXT,
    iso INTEGER,
    flash_used BOOLEAN,

    -- GPS data
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    location_name TEXT,

    -- Thumbnail
    thumbnail_path TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint per user
    UNIQUE(user_id, file_path)
);

-- Create cloud_photo_folders table for organizing photos
CREATE TABLE IF NOT EXISTS public.cloud_photo_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.cloud_photo_folders(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    cover_color TEXT,
    cover_photo_id UUID REFERENCES public.cloud_photos(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Unique name per parent folder per user
    UNIQUE(user_id, parent_id, name)
);

-- Create cloud_photo_folder_items junction table
CREATE TABLE IF NOT EXISTS public.cloud_photo_folder_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES public.cloud_photo_folders(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES public.cloud_photos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(folder_id, photo_id)
);

-- Create cloud_liked_photos table
CREATE TABLE IF NOT EXISTS public.cloud_liked_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES public.cloud_photos(id) ON DELETE CASCADE,
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, photo_id)
);

-- Create local_liked_photos table for IndexedDB sync
CREATE TABLE IF NOT EXISTS public.local_liked_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Local file reference
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,

    -- Basic metadata for display when file not available
    title TEXT,
    width INTEGER,
    height INTEGER,
    taken_at TIMESTAMP WITH TIME ZONE,

    -- Thumbnail as base64 for offline display
    thumbnail_base64 TEXT,

    liked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, file_path)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cloud_photos_user_id ON public.cloud_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_photos_taken_at ON public.cloud_photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_cloud_photos_created_at ON public.cloud_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cloud_photo_folders_user_id ON public.cloud_photo_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_photo_folders_parent_id ON public.cloud_photo_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_cloud_photo_folder_items_folder_id ON public.cloud_photo_folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_cloud_photo_folder_items_photo_id ON public.cloud_photo_folder_items(photo_id);
CREATE INDEX IF NOT EXISTS idx_cloud_liked_photos_user_id ON public.cloud_liked_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_liked_photos_photo_id ON public.cloud_liked_photos(photo_id);
CREATE INDEX IF NOT EXISTS idx_local_liked_photos_user_id ON public.local_liked_photos(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_cloud_photos_updated_at
BEFORE UPDATE ON public.cloud_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cloud_photo_folders_updated_at
BEFORE UPDATE ON public.cloud_photo_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.cloud_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_photo_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_photo_folder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_liked_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_liked_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cloud_photos
CREATE POLICY "Users can view their own cloud photos"
    ON public.cloud_photos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cloud photos"
    ON public.cloud_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cloud photos"
    ON public.cloud_photos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cloud photos"
    ON public.cloud_photos FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for cloud_photo_folders
CREATE POLICY "Users can view their own cloud photo folders"
    ON public.cloud_photo_folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cloud photo folders"
    ON public.cloud_photo_folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cloud photo folders"
    ON public.cloud_photo_folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cloud photo folders"
    ON public.cloud_photo_folders FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for cloud_photo_folder_items
CREATE POLICY "Users can view their cloud photo folder items"
    ON public.cloud_photo_folder_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cloud_photo_folders
            WHERE cloud_photo_folders.id = cloud_photo_folder_items.folder_id
            AND cloud_photo_folders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert into their cloud photo folders"
    ON public.cloud_photo_folder_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cloud_photo_folders
            WHERE cloud_photo_folders.id = cloud_photo_folder_items.folder_id
            AND cloud_photo_folders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete from their cloud photo folders"
    ON public.cloud_photo_folder_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cloud_photo_folders
            WHERE cloud_photo_folders.id = cloud_photo_folder_items.folder_id
            AND cloud_photo_folders.user_id = auth.uid()
        )
    );

-- RLS Policies for cloud_liked_photos
CREATE POLICY "Users can view their own cloud liked photos"
    ON public.cloud_liked_photos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cloud liked photos"
    ON public.cloud_liked_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cloud liked photos"
    ON public.cloud_liked_photos FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for local_liked_photos
CREATE POLICY "Users can view their own local liked photos"
    ON public.local_liked_photos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own local liked photos"
    ON public.local_liked_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own local liked photos"
    ON public.local_liked_photos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own local liked photos"
    ON public.local_liked_photos FOR DELETE
    USING (auth.uid() = user_id);

-- Storage policies for photos bucket
CREATE POLICY "Users can upload their own photos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their photos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their photos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'photos');

-- Grant access to authenticated users
GRANT ALL ON public.cloud_photos TO authenticated;
GRANT ALL ON public.cloud_photo_folders TO authenticated;
GRANT ALL ON public.cloud_photo_folder_items TO authenticated;
GRANT ALL ON public.cloud_liked_photos TO authenticated;
GRANT ALL ON public.local_liked_photos TO authenticated;
