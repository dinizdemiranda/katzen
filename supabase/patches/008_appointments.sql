-- Run this in the Supabase SQL editor. Adds appointments (vet visits, exams,
-- procedures, emergencies) as a distinct concept from incidents — scheduled
-- rather than logged after the fact, can be in the future or the past, and can
-- have multiple documents attached (so it's its own table, not a photo_url column).

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats (id) on delete cascade,
  title text not null,
  type text not null default 'vet_visit' check (type in ('vet_visit', 'clinical_exam', 'procedure', 'emergency')),
  scheduled_at timestamptz not null,
  address text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.appointment_documents (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  file_url text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create index appointments_cat_scheduled_idx on public.appointments (cat_id, scheduled_at);
create index appointment_documents_appointment_idx on public.appointment_documents (appointment_id);

create function public.litter_id_for_appointment(target_appointment_id uuid)
returns uuid as $$
  select public.litter_id_for_cat(cat_id) from public.appointments where id = target_appointment_id;
$$ language sql security definer stable set search_path = public;

alter table public.appointments enable row level security;
alter table public.appointment_documents enable row level security;

create policy "appointments_all" on public.appointments for all
  using (public.is_litter_member(public.litter_id_for_cat(cat_id)))
  with check (public.is_litter_member(public.litter_id_for_cat(cat_id)));

create policy "appointment_documents_all" on public.appointment_documents for all
  using (public.is_litter_member(public.litter_id_for_appointment(appointment_id)))
  with check (public.is_litter_member(public.litter_id_for_appointment(appointment_id)));

-- Storage: same shape as cat-photos/puke-photos. Files are stored as
-- "<litter_id>/<cat_id>/<filename>".
insert into storage.buckets (id, name, public)
values ('appointment-documents', 'appointment-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "appointment_documents_select" on storage.objects;
create policy "appointment_documents_select" on storage.objects for select
  using (bucket_id = 'appointment-documents');

drop policy if exists "appointment_documents_insert" on storage.objects;
create policy "appointment_documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'appointment-documents'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "appointment_documents_update" on storage.objects;
create policy "appointment_documents_update" on storage.objects for update
  using (
    bucket_id = 'appointment-documents'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "appointment_documents_delete" on storage.objects;
create policy "appointment_documents_delete" on storage.objects for delete
  using (
    bucket_id = 'appointment-documents'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );
