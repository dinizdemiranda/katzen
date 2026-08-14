-- Run this in the Supabase SQL editor. Generalizes puke tracking into "incidents" —
-- a broader record of things that happen to a cat (litter box issues, coughing,
-- seizures, or custom types a household defines), while puke-specific fields
-- (content/amount/timing) become optional and only apply when type = 'puke'.
-- Existing puke history is preserved automatically: renaming a table keeps all
-- rows, and the new "type" column defaults to 'puke' so every existing row is
-- classified correctly with no backfill step needed.

alter table public.vomit_events rename to incidents;
alter policy "vomit_events_all" on public.incidents rename to "incidents_all";
alter index vomit_events_pkey rename to incidents_pkey;
alter index vomit_events_cat_created_idx rename to incidents_cat_created_idx;

-- Custom incident types a household can add (e.g. "Hiding", "Limping"). The four
-- built-in types (puke, litter_box, coughing, seizure) are fixed in the app itself,
-- not stored here — this table is only for user-added ones.
create table public.incident_types (
  id uuid primary key default gen_random_uuid(),
  litter_id uuid not null references public.litters (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.incident_types enable row level security;

create policy "incident_types_all" on public.incident_types for all
  using (public.is_litter_member(litter_id))
  with check (public.is_litter_member(litter_id));

alter table public.incidents add column type text not null default 'puke';
alter table public.incidents add column custom_type_id uuid references public.incident_types (id) on delete set null;

alter table public.incidents alter column content drop not null;
alter table public.incidents alter column amount drop not null;
alter table public.incidents alter column timing drop not null;

alter table public.incidents add constraint incidents_type_check
  check (type in ('puke', 'litter_box', 'coughing', 'seizure', 'custom'));

alter table public.incidents add constraint incidents_custom_type_consistency
  check ((type = 'custom') = (custom_type_id is not null));
