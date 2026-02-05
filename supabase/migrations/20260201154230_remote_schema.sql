drop extension if exists "pg_net";

drop trigger if exists "update_cloud_playlists_updated_at" on "public"."cloud_playlists";

drop trigger if exists "update_cloud_tracks_updated_at" on "public"."cloud_tracks";

drop policy "Users can delete their own cloud liked tracks" on "public"."cloud_liked_tracks";

drop policy "Users can insert their own cloud liked tracks" on "public"."cloud_liked_tracks";

drop policy "Users can view their own cloud liked tracks" on "public"."cloud_liked_tracks";

drop policy "Users can delete from their cloud playlists" on "public"."cloud_playlist_tracks";

drop policy "Users can insert into their cloud playlists" on "public"."cloud_playlist_tracks";

drop policy "Users can view their cloud playlist tracks" on "public"."cloud_playlist_tracks";

drop policy "Users can delete their own cloud playlists" on "public"."cloud_playlists";

drop policy "Users can insert their own cloud playlists" on "public"."cloud_playlists";

drop policy "Users can update their own cloud playlists" on "public"."cloud_playlists";

drop policy "Users can view their own cloud playlists" on "public"."cloud_playlists";

drop policy "Users can delete their own cloud tracks" on "public"."cloud_tracks";

drop policy "Users can insert their own cloud tracks" on "public"."cloud_tracks";

drop policy "Users can update their own cloud tracks" on "public"."cloud_tracks";

drop policy "Users can view their own cloud tracks" on "public"."cloud_tracks";

revoke delete on table "public"."cloud_liked_tracks" from "anon";

revoke insert on table "public"."cloud_liked_tracks" from "anon";

revoke references on table "public"."cloud_liked_tracks" from "anon";

revoke select on table "public"."cloud_liked_tracks" from "anon";

revoke trigger on table "public"."cloud_liked_tracks" from "anon";

revoke truncate on table "public"."cloud_liked_tracks" from "anon";

revoke update on table "public"."cloud_liked_tracks" from "anon";

revoke delete on table "public"."cloud_liked_tracks" from "authenticated";

revoke insert on table "public"."cloud_liked_tracks" from "authenticated";

revoke references on table "public"."cloud_liked_tracks" from "authenticated";

revoke select on table "public"."cloud_liked_tracks" from "authenticated";

revoke trigger on table "public"."cloud_liked_tracks" from "authenticated";

revoke truncate on table "public"."cloud_liked_tracks" from "authenticated";

revoke update on table "public"."cloud_liked_tracks" from "authenticated";

revoke delete on table "public"."cloud_liked_tracks" from "service_role";

revoke insert on table "public"."cloud_liked_tracks" from "service_role";

revoke references on table "public"."cloud_liked_tracks" from "service_role";

revoke select on table "public"."cloud_liked_tracks" from "service_role";

revoke trigger on table "public"."cloud_liked_tracks" from "service_role";

revoke truncate on table "public"."cloud_liked_tracks" from "service_role";

revoke update on table "public"."cloud_liked_tracks" from "service_role";

revoke delete on table "public"."cloud_playlist_tracks" from "anon";

revoke insert on table "public"."cloud_playlist_tracks" from "anon";

revoke references on table "public"."cloud_playlist_tracks" from "anon";

revoke select on table "public"."cloud_playlist_tracks" from "anon";

revoke trigger on table "public"."cloud_playlist_tracks" from "anon";

revoke truncate on table "public"."cloud_playlist_tracks" from "anon";

revoke update on table "public"."cloud_playlist_tracks" from "anon";

revoke delete on table "public"."cloud_playlist_tracks" from "authenticated";

revoke insert on table "public"."cloud_playlist_tracks" from "authenticated";

revoke references on table "public"."cloud_playlist_tracks" from "authenticated";

revoke select on table "public"."cloud_playlist_tracks" from "authenticated";

revoke trigger on table "public"."cloud_playlist_tracks" from "authenticated";

revoke truncate on table "public"."cloud_playlist_tracks" from "authenticated";

revoke update on table "public"."cloud_playlist_tracks" from "authenticated";

revoke delete on table "public"."cloud_playlist_tracks" from "service_role";

revoke insert on table "public"."cloud_playlist_tracks" from "service_role";

revoke references on table "public"."cloud_playlist_tracks" from "service_role";

revoke select on table "public"."cloud_playlist_tracks" from "service_role";

revoke trigger on table "public"."cloud_playlist_tracks" from "service_role";

revoke truncate on table "public"."cloud_playlist_tracks" from "service_role";

revoke update on table "public"."cloud_playlist_tracks" from "service_role";

revoke delete on table "public"."cloud_playlists" from "anon";

revoke insert on table "public"."cloud_playlists" from "anon";

revoke references on table "public"."cloud_playlists" from "anon";

revoke select on table "public"."cloud_playlists" from "anon";

revoke trigger on table "public"."cloud_playlists" from "anon";

revoke truncate on table "public"."cloud_playlists" from "anon";

revoke update on table "public"."cloud_playlists" from "anon";

revoke delete on table "public"."cloud_playlists" from "authenticated";

revoke insert on table "public"."cloud_playlists" from "authenticated";

revoke references on table "public"."cloud_playlists" from "authenticated";

revoke select on table "public"."cloud_playlists" from "authenticated";

revoke trigger on table "public"."cloud_playlists" from "authenticated";

revoke truncate on table "public"."cloud_playlists" from "authenticated";

revoke update on table "public"."cloud_playlists" from "authenticated";

revoke delete on table "public"."cloud_playlists" from "service_role";

revoke insert on table "public"."cloud_playlists" from "service_role";

revoke references on table "public"."cloud_playlists" from "service_role";

revoke select on table "public"."cloud_playlists" from "service_role";

revoke trigger on table "public"."cloud_playlists" from "service_role";

revoke truncate on table "public"."cloud_playlists" from "service_role";

revoke update on table "public"."cloud_playlists" from "service_role";

revoke delete on table "public"."cloud_tracks" from "anon";

revoke insert on table "public"."cloud_tracks" from "anon";

revoke references on table "public"."cloud_tracks" from "anon";

revoke select on table "public"."cloud_tracks" from "anon";

revoke trigger on table "public"."cloud_tracks" from "anon";

revoke truncate on table "public"."cloud_tracks" from "anon";

revoke update on table "public"."cloud_tracks" from "anon";

revoke delete on table "public"."cloud_tracks" from "authenticated";

revoke insert on table "public"."cloud_tracks" from "authenticated";

revoke references on table "public"."cloud_tracks" from "authenticated";

revoke select on table "public"."cloud_tracks" from "authenticated";

revoke trigger on table "public"."cloud_tracks" from "authenticated";

revoke truncate on table "public"."cloud_tracks" from "authenticated";

revoke update on table "public"."cloud_tracks" from "authenticated";

revoke delete on table "public"."cloud_tracks" from "service_role";

revoke insert on table "public"."cloud_tracks" from "service_role";

revoke references on table "public"."cloud_tracks" from "service_role";

revoke select on table "public"."cloud_tracks" from "service_role";

revoke trigger on table "public"."cloud_tracks" from "service_role";

revoke truncate on table "public"."cloud_tracks" from "service_role";

revoke update on table "public"."cloud_tracks" from "service_role";

revoke delete on table "public"."local_liked_tracks" from "anon";

revoke insert on table "public"."local_liked_tracks" from "anon";

revoke references on table "public"."local_liked_tracks" from "anon";

revoke trigger on table "public"."local_liked_tracks" from "anon";

revoke truncate on table "public"."local_liked_tracks" from "anon";

revoke update on table "public"."local_liked_tracks" from "anon";

revoke references on table "public"."local_liked_tracks" from "authenticated";

revoke trigger on table "public"."local_liked_tracks" from "authenticated";

revoke truncate on table "public"."local_liked_tracks" from "authenticated";

revoke delete on table "public"."local_liked_tracks" from "service_role";

revoke insert on table "public"."local_liked_tracks" from "service_role";

revoke references on table "public"."local_liked_tracks" from "service_role";

revoke select on table "public"."local_liked_tracks" from "service_role";

revoke trigger on table "public"."local_liked_tracks" from "service_role";

revoke truncate on table "public"."local_liked_tracks" from "service_role";

revoke update on table "public"."local_liked_tracks" from "service_role";

revoke delete on table "public"."local_playlist_tracks" from "anon";

revoke insert on table "public"."local_playlist_tracks" from "anon";

revoke references on table "public"."local_playlist_tracks" from "anon";

revoke trigger on table "public"."local_playlist_tracks" from "anon";

revoke truncate on table "public"."local_playlist_tracks" from "anon";

revoke update on table "public"."local_playlist_tracks" from "anon";

revoke references on table "public"."local_playlist_tracks" from "authenticated";

revoke trigger on table "public"."local_playlist_tracks" from "authenticated";

revoke truncate on table "public"."local_playlist_tracks" from "authenticated";

revoke delete on table "public"."local_playlist_tracks" from "service_role";

revoke insert on table "public"."local_playlist_tracks" from "service_role";

revoke references on table "public"."local_playlist_tracks" from "service_role";

revoke select on table "public"."local_playlist_tracks" from "service_role";

revoke trigger on table "public"."local_playlist_tracks" from "service_role";

revoke truncate on table "public"."local_playlist_tracks" from "service_role";

revoke update on table "public"."local_playlist_tracks" from "service_role";

revoke delete on table "public"."local_playlists" from "anon";

revoke insert on table "public"."local_playlists" from "anon";

revoke references on table "public"."local_playlists" from "anon";

revoke trigger on table "public"."local_playlists" from "anon";

revoke truncate on table "public"."local_playlists" from "anon";

revoke update on table "public"."local_playlists" from "anon";

revoke references on table "public"."local_playlists" from "authenticated";

revoke trigger on table "public"."local_playlists" from "authenticated";

revoke truncate on table "public"."local_playlists" from "authenticated";

revoke delete on table "public"."local_playlists" from "service_role";

revoke insert on table "public"."local_playlists" from "service_role";

revoke references on table "public"."local_playlists" from "service_role";

revoke select on table "public"."local_playlists" from "service_role";

revoke trigger on table "public"."local_playlists" from "service_role";

revoke truncate on table "public"."local_playlists" from "service_role";

revoke update on table "public"."local_playlists" from "service_role";

revoke delete on table "public"."local_recently_played" from "anon";

revoke insert on table "public"."local_recently_played" from "anon";

revoke references on table "public"."local_recently_played" from "anon";

revoke trigger on table "public"."local_recently_played" from "anon";

revoke truncate on table "public"."local_recently_played" from "anon";

revoke update on table "public"."local_recently_played" from "anon";

revoke references on table "public"."local_recently_played" from "authenticated";

revoke trigger on table "public"."local_recently_played" from "authenticated";

revoke truncate on table "public"."local_recently_played" from "authenticated";

revoke delete on table "public"."local_recently_played" from "service_role";

revoke insert on table "public"."local_recently_played" from "service_role";

revoke references on table "public"."local_recently_played" from "service_role";

revoke select on table "public"."local_recently_played" from "service_role";

revoke trigger on table "public"."local_recently_played" from "service_role";

revoke truncate on table "public"."local_recently_played" from "service_role";

revoke update on table "public"."local_recently_played" from "service_role";

revoke delete on table "public"."local_tracks" from "anon";

revoke insert on table "public"."local_tracks" from "anon";

revoke references on table "public"."local_tracks" from "anon";

revoke trigger on table "public"."local_tracks" from "anon";

revoke truncate on table "public"."local_tracks" from "anon";

revoke update on table "public"."local_tracks" from "anon";

revoke references on table "public"."local_tracks" from "authenticated";

revoke trigger on table "public"."local_tracks" from "authenticated";

revoke truncate on table "public"."local_tracks" from "authenticated";

revoke delete on table "public"."local_tracks" from "service_role";

revoke insert on table "public"."local_tracks" from "service_role";

revoke references on table "public"."local_tracks" from "service_role";

revoke select on table "public"."local_tracks" from "service_role";

revoke trigger on table "public"."local_tracks" from "service_role";

revoke truncate on table "public"."local_tracks" from "service_role";

revoke update on table "public"."local_tracks" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."videos" from "anon";

revoke insert on table "public"."videos" from "anon";

revoke references on table "public"."videos" from "anon";

revoke trigger on table "public"."videos" from "anon";

revoke truncate on table "public"."videos" from "anon";

revoke update on table "public"."videos" from "anon";

revoke references on table "public"."videos" from "authenticated";

revoke trigger on table "public"."videos" from "authenticated";

revoke truncate on table "public"."videos" from "authenticated";

revoke delete on table "public"."videos" from "service_role";

revoke insert on table "public"."videos" from "service_role";

revoke references on table "public"."videos" from "service_role";

revoke select on table "public"."videos" from "service_role";

revoke trigger on table "public"."videos" from "service_role";

revoke truncate on table "public"."videos" from "service_role";

revoke update on table "public"."videos" from "service_role";

alter table "public"."cloud_liked_tracks" drop constraint "cloud_liked_tracks_track_id_fkey";

alter table "public"."cloud_liked_tracks" drop constraint "cloud_liked_tracks_user_id_fkey";

alter table "public"."cloud_liked_tracks" drop constraint "cloud_liked_tracks_user_id_track_id_key";

alter table "public"."cloud_playlist_tracks" drop constraint "cloud_playlist_tracks_playlist_id_fkey";

alter table "public"."cloud_playlist_tracks" drop constraint "cloud_playlist_tracks_playlist_id_track_id_key";

alter table "public"."cloud_playlist_tracks" drop constraint "cloud_playlist_tracks_track_id_fkey";

alter table "public"."cloud_playlists" drop constraint "cloud_playlists_user_id_fkey";

alter table "public"."cloud_tracks" drop constraint "cloud_tracks_user_id_file_path_key";

alter table "public"."cloud_tracks" drop constraint "cloud_tracks_user_id_fkey";

drop function if exists "public"."increment_cloud_track_play_count"(track_id uuid);

alter table "public"."cloud_liked_tracks" drop constraint "cloud_liked_tracks_pkey";

alter table "public"."cloud_playlist_tracks" drop constraint "cloud_playlist_tracks_pkey";

alter table "public"."cloud_playlists" drop constraint "cloud_playlists_pkey";

alter table "public"."cloud_tracks" drop constraint "cloud_tracks_pkey";

drop index if exists "public"."cloud_liked_tracks_pkey";

drop index if exists "public"."cloud_liked_tracks_user_id_track_id_key";

drop index if exists "public"."cloud_playlist_tracks_pkey";

drop index if exists "public"."cloud_playlist_tracks_playlist_id_track_id_key";

drop index if exists "public"."cloud_playlists_pkey";

drop index if exists "public"."cloud_tracks_pkey";

drop index if exists "public"."cloud_tracks_user_id_file_path_key";

drop index if exists "public"."idx_cloud_liked_tracks_track_id";

drop index if exists "public"."idx_cloud_liked_tracks_user_id";

drop index if exists "public"."idx_cloud_playlist_tracks_playlist_id";

drop index if exists "public"."idx_cloud_playlist_tracks_track_id";

drop index if exists "public"."idx_cloud_playlists_user_id";

drop index if exists "public"."idx_cloud_tracks_album";

drop index if exists "public"."idx_cloud_tracks_artist";

drop index if exists "public"."idx_cloud_tracks_created_at";

drop index if exists "public"."idx_cloud_tracks_user_id";

drop index if exists "public"."videos_user_id_created_at_idx";

drop table "public"."cloud_liked_tracks";

drop table "public"."cloud_playlist_tracks";

drop table "public"."cloud_playlists";

drop table "public"."cloud_tracks";

alter table "public"."profiles" add column "language" text default 'fr'::text;

alter table "public"."profiles" add column "video_favorites" jsonb;

alter table "public"."profiles" add column "video_files" jsonb;

alter table "public"."profiles" add column "video_folder_path" text;

alter table "public"."profiles" add column "video_watched" jsonb;

alter table "public"."profiles" add column "video_watching" jsonb;

alter table "public"."videos" drop column "height";

alter table "public"."videos" drop column "width";

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);

CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);


  create policy "Users can delete their own liked tracks"
  on "public"."local_liked_tracks"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own liked tracks"
  on "public"."local_liked_tracks"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own liked tracks"
  on "public"."local_liked_tracks"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete tracks from their own playlists"
  on "public"."local_playlist_tracks"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.local_playlists
  WHERE ((local_playlists.id = local_playlist_tracks.playlist_id) AND (local_playlists.user_id = auth.uid())))));



  create policy "Users can insert tracks to their own playlists"
  on "public"."local_playlist_tracks"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.local_playlists
  WHERE ((local_playlists.id = local_playlist_tracks.playlist_id) AND (local_playlists.user_id = auth.uid())))));



  create policy "Users can view playlist tracks from their own playlists"
  on "public"."local_playlist_tracks"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.local_playlists
  WHERE ((local_playlists.id = local_playlist_tracks.playlist_id) AND (local_playlists.user_id = auth.uid())))));



  create policy "Users can delete from their own recently played"
  on "public"."local_recently_played"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert to their own recently played"
  on "public"."local_recently_played"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own recently played"
  on "public"."local_recently_played"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own recently played"
  on "public"."local_recently_played"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view their own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can delete their own videos"
  on "public"."videos"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own videos"
  on "public"."videos"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own videos"
  on "public"."videos"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own videos"
  on "public"."videos"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


drop policy "Public can view music" on "storage"."objects";

drop policy "Users can delete their music" on "storage"."objects";

drop policy "Users can upload their own music" on "storage"."objects";

drop policy "Users can view their music" on "storage"."objects";


