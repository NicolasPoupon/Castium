-- Custom M3U8 streams added by users (radio and TV)
CREATE TABLE IF NOT EXISTS custom_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('radio', 'tv')),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    logo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_custom_streams_user_id ON custom_streams(user_id);
CREATE INDEX idx_custom_streams_type ON custom_streams(user_id, type);

-- Enable RLS
ALTER TABLE custom_streams ENABLE ROW LEVEL SECURITY;

-- Users can only see their own streams
CREATE POLICY "Users can view own custom streams"
    ON custom_streams FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own streams
CREATE POLICY "Users can insert own custom streams"
    ON custom_streams FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own streams
CREATE POLICY "Users can delete own custom streams"
    ON custom_streams FOR DELETE
    USING (auth.uid() = user_id);

-- Users can update their own streams
CREATE POLICY "Users can update own custom streams"
    ON custom_streams FOR UPDATE
    USING (auth.uid() = user_id);
