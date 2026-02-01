-- Fix PostgREST permissions (SQL GRANTs) for Supabase API roles.
-- RLS policies control row access; GRANTs control whether the role can access the table at all.

-- Schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- Allow API roles to use sequences (needed for inserts with defaults)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
-- Read access for anon is safe with strict RLS (auth.uid() is NULL),
-- and prevents hard 42501 errors before a session is established.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
-- Full CRUD for authenticated users (still constrained by RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
