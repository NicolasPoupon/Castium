-- Seed / schema for local Supabase auth & user profiles
-- This file is executed on `supabase db reset` according to `config.toml`.

-- Ensure required extensions
create extension if not exists "uuid-ossp";

-- Profiles table linked to auth.users
-- NOTE: This table is now created in migrations/20260130_create_music_tables.sql
-- We just need to ensure the columns are correct

-- Add any missing columns to profiles table if they don't exist
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS video_folder_path TEXT,
ADD COLUMN IF NOT EXISTS video_files JSONB,
ADD COLUMN IF NOT EXISTS video_watching JSONB,
ADD COLUMN IF NOT EXISTS video_watched JSONB,
ADD COLUMN IF NOT EXISTS video_favorites JSONB;

-- Indexes for performance (if not already existing)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
