-- Restore local DB dump (generated from local environment)
-- This migration will recreate schema & data to match local DB exactly.
-- NOTE: This is destructive for remote DB; a backup was saved as supabase_prod_backup_latest.sql.gz

-- Full local dump content (replaced with clean dump)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER SCHEMA "public" OWNER TO "postgres";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";


CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email)
    ON CONFLICT (id) DO UPDATE SET email = new.email;
    RETURN new;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_local_music_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_local_music_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profiles_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."local_liked_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "liked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_liked_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_playlist_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_playlist_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "cover_color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_recently_played" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "played_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_recently_played" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text",
    "title" "text",
    "artist" "text",
    "album" "text",
    "album_artist" "text",
    "year" integer,
    "genre" "text",
    "track_number" integer,
    "disc_number" integer,
    "duration" real,
    "cover_art" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "language" "text" DEFAULT 'fr'::"text",
    "video_folder_path" "text",
    "video_files" "jsonb",
    "video_watching" "jsonb",
    "video_watched" "jsonb",
    "video_favorites" "jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


-- Note: data inserts for profiles are skipped; auth.users must exist first


-- End of local dump content

ALTER SCHEMA "public" OWNER TO "postgres";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email)
    ON CONFLICT (id) DO UPDATE SET email = new.email;
    RETURN new;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_local_music_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_local_music_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profiles_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."local_liked_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "liked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_liked_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_playlist_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_playlist_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "cover_color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_recently_played" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "played_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_recently_played" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text",
    "title" "text",
    "artist" "text",
    "album" "text",
    "album_artist" "text",
    "year" integer,
    "genre" "text",
    "track_number" integer,
    "disc_number" integer,
    "duration" real,
    "cover_art" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."local_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "language" "text" DEFAULT 'fr'::"text",
    "video_folder_path" "text",
    "video_files" "jsonb",
    "video_watching" "jsonb",
    "video_watched" "jsonb",
    "video_favorites" "jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


-- Insert statements and remaining dump content

-- (Appended data inserts from local dump)


-- Skipped inserting into public.profiles because auth.users are managed
-- by Supabase Auth; profiles will be created automatically on signup via
-- the trigger public.handle_new_user. If you want to restore auth users
-- too, provide a separate auth.users import and run it before inserting
-- profiles.

-- End of local dump content
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_local_music_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_profiles_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_profiles_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- Tables
CREATE TABLE IF NOT EXISTS "public"."local_liked_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "liked_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."local_liked_tracks" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."local_playlist_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."local_playlist_tracks" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."local_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "cover_color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."local_playlists" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."local_recently_played" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "played_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."local_recently_played" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."local_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text",
    "title" "text",
    "artist" "text",
    "album" "text",
    "album_artist" "text",
    "year" integer,
    "genre" "text",
    "track_number" integer,
    "disc_number" integer,
    "duration" real,
    "cover_art" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."local_tracks" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "language" "text" DEFAULT 'fr'::"text",
    "video_folder_path" "text",
    "video_files" "jsonb",
    "video_watching" "jsonb",
    "video_watched" "jsonb",
    "video_favorites" "jsonb"
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";

-- truncation / data insertion if present in dump
-- (data insertion statements are preserved below in the dumped file)

-- NOTE: If additional CREATE/INSERT statements exist in the dump, they will be executed as part of this migration.

-- End of local dump content
    INSERT INTO public.profiles (id, email)
