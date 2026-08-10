-- Run this in the Supabase SQL editor if your project already ran schema.sql.
-- Adds a notes field to weigh-ins, and fixes cats.weight sync to handle editing
-- or deleting a weigh-in (previously only recomputed on insert, so an edited or
-- deleted weigh-in could leave cats.weight stale).

alter table public.weigh_ins add column if not exists notes text;

create or replace function public.update_cat_weight()
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

drop trigger if exists on_weigh_in_insert on public.weigh_ins;
drop trigger if exists on_weigh_in_change on public.weigh_ins;
create trigger on_weigh_in_change
  after insert or update or delete on public.weigh_ins
  for each row execute procedure public.update_cat_weight();
