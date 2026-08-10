-- Run this in the Supabase SQL editor if your project already ran the original
-- schema.sql. It's the only thing that changed: weigh-ins can now be backdated
-- (a date/time field was added to the weigh-in form), so the trigger that keeps
-- cats.weight in sync must recompute from the most recent occurred-at time
-- instead of just copying whatever row was inserted last.
create or replace function public.update_cat_weight()
returns trigger as $$
begin
  update public.cats
  set weight = (
    select weight from public.weigh_ins
    where cat_id = new.cat_id
    order by created_at desc
    limit 1
  )
  where id = new.cat_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
