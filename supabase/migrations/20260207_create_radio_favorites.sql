-- Create radio_favorites table for storing user favorite radio stations
CREATE TABLE IF NOT EXISTS public.radio_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL,
    station_name TEXT NOT NULL,
    station_logo TEXT,
    station_country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, station_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_radio_favorites_user_id ON public.radio_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_radio_favorites_station_country ON public.radio_favorites(station_country);

-- Enable RLS
ALTER TABLE public.radio_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own favorites
CREATE POLICY "Users can view own radio favorites"
    ON public.radio_favorites FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own radio favorites"
    ON public.radio_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own radio favorites"
    ON public.radio_favorites FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.radio_favorites TO authenticated;
