-- Ajouter les colonnes pour le suivi avancé des vidéos
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS video_watching JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS video_watched JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS video_favorites JSONB DEFAULT '[]';

-- Index pour de meilleures performances
CREATE INDEX IF NOT EXISTS idx_profiles_video_watching ON public.profiles USING GIN (video_watching);
CREATE INDEX IF NOT EXISTS idx_profiles_video_watched ON public.profiles USING GIN (video_watched);
CREATE INDEX IF NOT EXISTS idx_profiles_video_favorites ON public.profiles USING GIN (video_favorites);
