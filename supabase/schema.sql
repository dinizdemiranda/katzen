-- Katzen schema: run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to run top-to-bottom on a fresh project.

-- ============================================================
-- Tables
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

create table public.litters (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  active_modules text[] not null default array['weight', 'vomit'],
  created_at timestamptz not null default now()
);

create table public.litter_members (
  litter_id uuid not null references public.litters (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (litter_id, user_id)
);

create table public.litter_invites (
  id uuid primary key default gen_random_uuid(),
  litter_id uuid not null references public.litters (id) on delete cascade,
  email text not null,
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now()
);

create table public.cats (
  id uuid primary key default gen_random_uuid(),
  litter_id uuid not null references public.litters (id) on delete cascade,
  name text not null,
  birthday date,
  weight numeric,
  color text not null,
  gender text check (gender in ('male', 'female')),
  microchip_number text,
  photo_url text, -- reserved for a future S3-backed photo upload
  -- One "Unknown" cat per litter (auto-created, see handle_new_litter below) so vomit
  -- events can be logged without pinning them on a specific cat when it's ambiguous.
  is_unknown boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats (id) on delete cascade,
  weight numeric not null,
  method text not null default 'delta' check (method in ('delta', 'direct')),
  person_weight numeric,
  person_cat_weight numeric,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Custom incident types a household can add (e.g. "Hiding", "Limping"). The four
-- built-in types (puke, litter_box, coughing, seizure) are fixed in the app itself,
-- not stored here — this table is only for user-added ones.
create table public.incident_types (
  id uuid primary key default gen_random_uuid(),
  litter_id uuid not null references public.litters (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

-- A general log of things that happen to a cat. Puke was the original (and still
-- most detailed) incident type — content/amount/timing only apply when type = 'puke'.
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats (id) on delete cascade,
  type text not null default 'puke' check (type in ('puke', 'litter_box', 'coughing', 'seizure', 'custom')),
  custom_type_id uuid references public.incident_types (id) on delete set null,
  content text check (content in ('food', 'foam_bile', 'fur', 'liquid', 'mixed', 'other')),
  amount text check (amount in ('small', 'medium', 'large')),
  timing text check (timing in ('right_after_eating', 'fasting', 'unknown')),
  appetite text not null default 'normal' check (appetite in ('normal', 'reduced', 'not_eating')),
  energy_level text not null default 'normal' check (energy_level in ('normal', 'low', 'very_low')),
  diarrhea boolean not null default false,
  blood boolean not null default false,
  urine_changes boolean not null default false,
  notes text,
  photo_url text, -- uploaded via the puke-photos storage bucket (used for all incident types)
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint incidents_custom_type_consistency check ((type = 'custom') = (custom_type_id is not null))
);

-- Scheduled events — vet visits, exams, procedures — as opposed to incidents, which
-- are logged after the fact. scheduled_at can be in the future or the past.
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

-- An appointment can have several attached documents (referral letters, invoices,
-- scan results), so this is its own table rather than a single photo_url column.
create table public.appointment_documents (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  file_url text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create index weigh_ins_cat_created_idx on public.weigh_ins (cat_id, created_at);
create index incidents_cat_created_idx on public.incidents (cat_id, created_at);
create index appointments_cat_scheduled_idx on public.appointments (cat_id, scheduled_at);
create index appointment_documents_appointment_idx on public.appointment_documents (appointment_id);
create index litter_invites_email_idx on public.litter_invites (email);

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep cats.weight in sync with the most recent weigh-in (by occurred-at time, not
-- insert order) so list views don't need a join. Weigh-ins can be backdated, edited,
-- or deleted, so this recomputes from scratch on any change rather than trusting
-- whichever row triggered it.
create function public.update_cat_weight()
returns trigger as $$
declare
  target_cat_id uuid := coalesce(new.cat_id, old.cat_id);
begin
  update public.cats
  set weight = (
    select weight from public.weigh_ins
    where cat_id = target_cat_id
    order by created_at desc
    limit 1
  )
  where id = target_cat_id;
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_weigh_in_change
  after insert or update or delete on public.weigh_ins
  for each row execute procedure public.update_cat_weight();

-- Every litter gets a standing "Unknown" cat, for logging events when it's genuinely
-- unclear which cat did it (vomit especially). Hidden from normal cat lists/management.
create function public.handle_new_litter()
returns trigger as $$
begin
  insert into public.cats (litter_id, name, color, is_unknown)
  values (new.id, 'Unknown', '#7a756c', true);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_litter_created
  after insert on public.litters
  for each row execute procedure public.handle_new_litter();

-- ============================================================
-- RLS helper functions
-- ============================================================

create function public.is_litter_member(target_litter_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.litter_members
    where litter_id = target_litter_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create function public.litter_id_for_cat(target_cat_id uuid)
returns uuid as $$
  select litter_id from public.cats where id = target_cat_id;
$$ language sql security definer stable set search_path = public;

create function public.litter_id_for_appointment(target_appointment_id uuid)
returns uuid as $$
  select public.litter_id_for_cat(cat_id) from public.appointments where id = target_appointment_id;
$$ language sql security definer stable set search_path = public;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.litters enable row level security;
alter table public.litter_members enable row level security;
alter table public.litter_invites enable row level security;
alter table public.cats enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_types enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_documents enable row level security;

-- profiles: see your own row, plus rows of people you share a litter with.
create policy "profiles_select" on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.litter_members lm1
      join public.litter_members lm2 on lm1.litter_id = lm2.litter_id
      where lm1.user_id = auth.uid() and lm2.user_id = profiles.id
    )
  );

create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid());

-- litters: only members can see/manage a litter. Anyone can create one (they add
-- themselves as owner in the same flow, which is what makes them a member).
create policy "litters_select" on public.litters for select
  using (public.is_litter_member(id));

create policy "litters_insert" on public.litters for insert
  with check (auth.uid() is not null);

create policy "litters_update" on public.litters for update
  using (public.is_litter_member(id));

-- litter_members: members can see the roster. You can only insert/delete your own
-- membership row (joining/leaving) — this is what makes invite-acceptance and
-- litter creation self-serve without letting anyone add someone else directly.
create policy "litter_members_select" on public.litter_members for select
  using (public.is_litter_member(litter_id));

create policy "litter_members_insert" on public.litter_members for insert
  with check (user_id = auth.uid());

create policy "litter_members_delete" on public.litter_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.litter_members me
      where me.litter_id = litter_members.litter_id
        and me.user_id = auth.uid()
        and me.role = 'owner'
    )
  );

-- litter_invites: litter members can invite/see/revoke invites for their litter;
-- an invited (not-yet-member) person can see and accept invites addressed to their email.
create policy "litter_invites_select" on public.litter_invites for select
  using (
    public.is_litter_member(litter_id)
    or email = (auth.jwt() ->> 'email')
  );

create policy "litter_invites_insert" on public.litter_invites for insert
  with check (public.is_litter_member(litter_id));

create policy "litter_invites_update" on public.litter_invites for update
  using (email = (auth.jwt() ->> 'email'));

create policy "litter_invites_delete" on public.litter_invites for delete
  using (public.is_litter_member(litter_id));

-- cats / weigh_ins / incidents / incident_types: anyone in the litter can manage its data.
create policy "cats_all" on public.cats for all
  using (public.is_litter_member(litter_id))
  with check (public.is_litter_member(litter_id));

create policy "weigh_ins_all" on public.weigh_ins for all
  using (public.is_litter_member(public.litter_id_for_cat(cat_id)))
  with check (public.is_litter_member(public.litter_id_for_cat(cat_id)));

create policy "incidents_all" on public.incidents for all
  using (public.is_litter_member(public.litter_id_for_cat(cat_id)))
  with check (public.is_litter_member(public.litter_id_for_cat(cat_id)));

create policy "incident_types_all" on public.incident_types for all
  using (public.is_litter_member(litter_id))
  with check (public.is_litter_member(litter_id));

create policy "appointments_all" on public.appointments for all
  using (public.is_litter_member(public.litter_id_for_cat(cat_id)))
  with check (public.is_litter_member(public.litter_id_for_cat(cat_id)));

create policy "appointment_documents_all" on public.appointment_documents for all
  using (public.is_litter_member(public.litter_id_for_appointment(appointment_id)))
  with check (public.is_litter_member(public.litter_id_for_appointment(appointment_id)));

-- ============================================================
-- Storage (cat photos)
-- ============================================================

-- Public bucket: reads go through the public URL endpoint and bypass RLS entirely,
-- which is fine — a cat photo isn't sensitive. Writes always go through the
-- authenticated API, so they still need explicit policies below. Files are stored
-- as "<litter_id>/<cat_id>/<filename>", so the first path segment doubles as the
-- litter-membership check.
insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', true)
on conflict (id) do nothing;

create policy "cat_photos_select" on storage.objects for select
  using (bucket_id = 'cat-photos');

create policy "cat_photos_insert" on storage.objects for insert
  with check (
    bucket_id = 'cat-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

create policy "cat_photos_update" on storage.objects for update
  using (
    bucket_id = 'cat-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

create policy "cat_photos_delete" on storage.objects for delete
  using (
    bucket_id = 'cat-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

-- ============================================================
-- Storage (incident photos)
-- ============================================================

-- Bucket is still named "puke-photos" for historical reasons — it's used for
-- every incident type now, not just puke, but renaming it isn't worth the
-- migration risk since it's an internal identifier the UI never shows. Same
-- shape as cat-photos: public bucket, reads bypass RLS via the public URL
-- endpoint, writes are litter-scoped. Files are stored as
-- "<litter_id>/<cat_id>/<filename>".
insert into storage.buckets (id, name, public)
values ('puke-photos', 'puke-photos', true)
on conflict (id) do nothing;

create policy "puke_photos_select" on storage.objects for select
  using (bucket_id = 'puke-photos');

create policy "puke_photos_insert" on storage.objects for insert
  with check (
    bucket_id = 'puke-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

create policy "puke_photos_update" on storage.objects for update
  using (
    bucket_id = 'puke-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

create policy "puke_photos_delete" on storage.objects for delete
  using (
    bucket_id = 'puke-photos'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

-- ============================================================
-- Storage (appointment documents)
-- ============================================================

-- Same shape again: public bucket, litter-scoped writes. Files are stored as
-- "<litter_id>/<cat_id>/<filename>".
insert into storage.buckets (id, name, public)
values ('appointment-documents', 'appointment-documents', true)
on conflict (id) do nothing;

create policy "appointment_documents_select" on storage.objects for select
  using (bucket_id = 'appointment-documents');

create policy "appointment_documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'appointment-documents'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

create policy "appointment_documents_update" on storage.objects for update
  using (
    bucket_id = 'appointment-documents'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );

create policy "appointment_documents_delete" on storage.objects for delete
  using (
    bucket_id = 'appointment-documents'
    and public.is_litter_member(((storage.foldername(name))[1])::uuid)
  );
