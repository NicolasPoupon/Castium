-- Migration: Add channel_url to iptv_favorites
-- Created: 2026-02-09
-- This allows playing favorites directly without reloading from IPTV API

ALTER TABLE public.iptv_favorites
ADD COLUMN IF NOT EXISTS channel_url TEXT;

-- Comment
COMMENT ON COLUMN public.iptv_favorites.channel_url IS 'Stream URL for the channel';
