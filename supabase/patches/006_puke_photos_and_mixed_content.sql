-- Run this in the Supabase SQL editor. Adds "Mixed" as a valid puke content
-- option, and creates the puke-photos storage bucket entirely via SQL (no
-- dashboard step needed this time) with the same litter-scoped RLS policies
-- used for cat-photos. Files are stored as "<litter_id>/<cat_id>/<filename>".

alter table public.vomit_events drop constraint if exists vomit_events_content_check;
alter table public.vomit_events add constraint vomit_events_content_check
  check (content in ('food', 'foam_bile', 'fur', 'liquid', 'mixed', 'other'));

insert into storage.buckets (id, name, public)
values ('puke-photos', 'puke-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "puke_photos_select" on storage.objects;
create policy "puke_photos_select" on storage.objects for select
  using (bucket_id = 'puke-photos');

drop policy if exists "puke_photos_insert" on storage.objects;
create policy "puke_photos_insert" on storage.objects for insert
  with check (
    bucket_id = 'puke-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "puke_photos_update" on storage.objects;
create policy "puke_photos_update" on storage.objects for update
  using (
    bucket_id = 'puke-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "puke_photos_delete" on storage.objects;
create policy "puke_photos_delete" on storage.objects for delete
  using (
    bucket_id = 'puke-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );
