-- Run this in the Supabase SQL editor. Adds the "title" field to appointments —
-- introduced after 008_appointments.sql had already been run, so that migration's
-- create table statement doesn't have it. Backfills any existing rows using their
-- type label before making the column required.

alter table public.appointments add column if not exists title text;

update public.appointments
set title = case type
  when 'vet_visit' then 'Vet visit'
  when 'clinical_exam' then 'Clinical Exam'
  when 'procedure' then 'Procedure'
  when 'emergency' then 'Emergency'
  else 'Appointment'
end
where title is null;

alter table public.appointments alter column title set not null;
