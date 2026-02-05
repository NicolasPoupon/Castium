-- Migration: Create IPTV favorites table
-- Created: 2026-02-06

-- Create iptv_favorites table
CREATE TABLE IF NOT EXISTS public.iptv_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Channel identification
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_logo TEXT,
    channel_group TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, channel_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_iptv_favorites_user_id ON public.iptv_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_iptv_favorites_channel_group ON public.iptv_favorites(user_id, channel_group);

-- Enable RLS
ALTER TABLE public.iptv_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own IPTV favorites"
    ON public.iptv_favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IPTV favorites"
    ON public.iptv_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IPTV favorites"
    ON public.iptv_favorites FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.iptv_favorites TO authenticated;
GRANT ALL ON public.iptv_favorites TO service_role;
