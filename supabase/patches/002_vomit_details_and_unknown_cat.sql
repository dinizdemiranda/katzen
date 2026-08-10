-- Run this in the Supabase SQL editor if your project already ran schema.sql (and
-- patch 001). Adds the richer vomit-log fields, an auto-created "Unknown" cat per
-- litter (for when it's unclear which cat vomited), and a photo_url placeholder
-- column for a future S3-backed upload. Not meant to be re-run twice as-is (the
-- "add constraint" statements aren't idempotent).

alter table public.cats add column if not exists is_unknown boolean not null default false;

alter table public.vomit_events
  add column if not exists content text,
  add column if not exists amount text,
  add column if not exists timing text not null default 'unknown',
  add column if not exists appetite text not null default 'normal',
  add column if not exists energy_level text not null default 'normal',
  add column if not exists diarrhea boolean not null default false,
  add column if not exists blood boolean not null default false,
  add column if not exists urine_changes boolean not null default false,
  add column if not exists photo_url text;

-- Backfill any existing rows before content/amount become NOT NULL.
update public.vomit_events set content = 'other' where content is null;
update public.vomit_events set amount = 'medium' where amount is null;

alter table public.vomit_events alter column content set not null;
alter table public.vomit_events alter column amount set not null;

alter table public.vomit_events add constraint vomit_events_content_check
  check (content in ('food', 'foam_bile', 'fur', 'liquid', 'other'));
alter table public.vomit_events add constraint vomit_events_amount_check
  check (amount in ('small', 'medium', 'large'));
alter table public.vomit_events add constraint vomit_events_timing_check
  check (timing in ('right_after_eating', 'fasting', 'unknown'));
alter table public.vomit_events add constraint vomit_events_appetite_check
  check (appetite in ('normal', 'reduced', 'not_eating'));
alter table public.vomit_events add constraint vomit_events_energy_check
  check (energy_level in ('normal', 'low', 'very_low'));

-- Auto-create an "Unknown" cat for every future litter.
create or replace function public.handle_new_litter()
returns trigger as $$
begin
  insert into public.cats (litter_id, name, color, is_unknown)
  values (new.id, 'Unknown', '#7a756c', true);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_litter_created on public.litters;
create trigger on_litter_created
  after insert on public.litters
  for each row execute procedure public.handle_new_litter();

-- Backfill: give every existing litter an Unknown cat if it doesn't have one yet.
insert into public.cats (litter_id, name, color, is_unknown)
select l.id, 'Unknown', '#7a756c', true
from public.litters l
where not exists (
  select 1 from public.cats c where c.litter_id = l.id and c.is_unknown = true
);
