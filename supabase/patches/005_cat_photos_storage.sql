-- Run this in the Supabase SQL editor. Your "cat-photos" bucket already exists
-- (created via the dashboard), so this just adds the access policies — without
-- them, uploads/deletes are blocked by storage's RLS even though the bucket
-- itself is public (public only affects reads via the public URL endpoint).
--
-- Files are stored as "<litter_id>/<cat_id>/<filename>", so the first path
-- segment doubles as the litter-membership check.

insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "cat_photos_select" on storage.objects;
create policy "cat_photos_select" on storage.objects for select
  using (bucket_id = 'cat-photos');

drop policy if exists "cat_photos_insert" on storage.objects;
create policy "cat_photos_insert" on storage.objects for insert
  with check (
    bucket_id = 'cat-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "cat_photos_update" on storage.objects;
create policy "cat_photos_update" on storage.objects for update
  using (
    bucket_id = 'cat-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "cat_photos_delete" on storage.objects;
create policy "cat_photos_delete" on storage.objects for delete
  using (
    bucket_id = 'cat-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );
