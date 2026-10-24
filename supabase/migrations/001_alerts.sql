-- 3inLink: patient alerts for the public demo.
-- Run once in the Supabase dashboard (SQL Editor), then run seed.sql.
-- Prototype access model: no staff login yet. The public (anon) key may read alerts,
-- create new unhandled alerts, and set handled_at. Nothing else.

create table if not exists public.alerts (
  id            uuid primary key default gen_random_uuid(),
  patient_code  text not null check (char_length(patient_code) between 1 and 32),
  room          text not null check (char_length(room) between 1 and 16),
  command       text not null check (command in ('toilet','pain','cold','water','hot','bed','family','nurse')),
  created_at    timestamptz not null default now(),
  handled_at    timestamptz,
  source        text not null default 'patient' check (source in ('patient','seed'))
);

-- The nurse app lists the most recent alerts first.
create index if not exists alerts_created_at_idx on public.alerts (created_at desc);

alter table public.alerts enable row level security;

drop policy if exists "demo: anyone can read alerts" on public.alerts;
create policy "demo: anyone can read alerts"
  on public.alerts for select
  to anon, authenticated
  using (true);

drop policy if exists "demo: patient screens create unhandled alerts" on public.alerts;
create policy "demo: patient screens create unhandled alerts"
  on public.alerts for insert
  to anon, authenticated
  with check (handled_at is null and source = 'patient');

drop policy if exists "demo: staff mark alerts handled" on public.alerts;
create policy "demo: staff mark alerts handled"
  on public.alerts for update
  to anon, authenticated
  using (handled_at is null)
  with check (handled_at is not null);

-- Column-level grants: an update can only touch handled_at, and nobody can delete through the API.
revoke insert, update, delete on public.alerts from anon, authenticated;
grant insert (patient_code, room, command) on public.alerts to anon, authenticated;
grant update (handled_at) on public.alerts to anon, authenticated;

-- "Reset demo" in the nurse app: clears the board and restores the six sample alerts.
create or replace function public.reset_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.alerts where true;
  insert into public.alerts (patient_code, room, command, created_at, source) values
    ('PT-10482', '204-B', 'pain',   now() - interval '1 minute',  'seed'),
    ('PT-10517', '211-A', 'nurse',  now() - interval '3 minutes', 'seed'),
    ('PT-10390', '207-A', 'water',  now() - interval '6 minutes', 'seed'),
    ('PT-10455', '215-B', 'bed',    now() - interval '9 minutes', 'seed'),
    ('PT-10508', '209-A', 'cold',   now() - interval '11 minutes','seed'),
    ('PT-10361', '203-B', 'toilet', now() - interval '14 minutes','seed');
end;
$$;

revoke all on function public.reset_demo() from public;
grant execute on function public.reset_demo() to anon, authenticated;

-- Push inserts and updates to subscribed nurse apps.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alerts'
  ) then
    alter publication supabase_realtime add table public.alerts;
  end if;
end;
$$;
