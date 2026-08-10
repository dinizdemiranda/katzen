-- Run this in the Supabase SQL editor if your project already ran schema.sql.
-- Adds optional cat profile fields: gender, microchip number, and a photo_url
-- placeholder for a future S3-backed upload. All nullable, so existing cats are
-- unaffected until edited.

alter table public.cats add column if not exists gender text check (gender in ('male', 'female'));
alter table public.cats add column if not exists microchip_number text;
alter table public.cats add column if not exists photo_url text;
