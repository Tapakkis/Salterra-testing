-- Safe repair for PGRST205 when public.fishing_spots is absent from the
-- Supabase REST schema cache. Run in the Supabase SQL Editor for this project.
-- Requires 0001_identity_foundation.sql to have created public.profiles and
-- public.set_updated_at(). This does not delete or modify existing spot rows.

begin;
()
create table if not exists public.fishing_spots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fishing_spots enable row level security;

revoke all on public.fishing_spots from anon, authenticated;
grant select, insert, update, delete on public.fishing_spots to authenticated;

drop policy if exists "Owners manage their fishing spots" on public.fishing_spots;
create policy "Owners manage their fishing spots"
on public.fishing_spots for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop trigger if exists fishing_spots_set_updated_at on public.fishing_spots;
create trigger fishing_spots_set_updated_at
before update on public.fishing_spots
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

commit;
