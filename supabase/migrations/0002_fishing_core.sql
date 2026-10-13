-- Smart Fishing Cyprus fishing core draft.
-- Depends on 0001_identity_foundation.sql. Do not run before reviewing ownership rules.

create type public.trip_status as enum ('draft', 'active', 'completed');

create table public.fishing_spots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fishing_trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status public.trip_status not null default 'draft',
  started_at timestamptz,
  ended_at timestamptz,
  start_latitude double precision check (start_latitude is null or start_latitude between -90 and 90),
  start_longitude double precision check (start_longitude is null or start_longitude between -180 and 180),
  end_latitude double precision check (end_latitude is null or end_latitude between -90 and 90),
  end_longitude double precision check (end_longitude is null or end_longitude between -180 and 180),
  notes text check (notes is null or char_length(notes) <= 5000),
  client_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_dates_check check (ended_at is null or started_at is null or ended_at >= started_at)
);

create table public.catches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.fishing_trips (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  species_name text,
  quantity integer not null default 1 check (quantity > 0),
  length_cm numeric(7,2) check (length_cm is null or length_cm > 0),
  weight_kg numeric(8,3) check (weight_kg is null or weight_kg > 0),
  caught_at timestamptz not null default now(),
  bait text,
  technique text,
  photo_path text,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.enforce_catch_owner()
returns trigger
language plpgsql
security invoker
as $$
declare
  trip_owner uuid;
begin
  select owner_id into trip_owner from public.fishing_trips where id = new.trip_id;
  if trip_owner is null or trip_owner <> new.owner_id then
    raise exception 'Catch owner must match trip owner';
  end if;
  return new;
end;
$$;

create trigger catches_enforce_owner
before insert or update on public.catches
for each row execute function public.enforce_catch_owner();

create trigger fishing_spots_set_updated_at
before update on public.fishing_spots
for each row execute function public.set_updated_at();

create trigger fishing_trips_set_updated_at
before update on public.fishing_trips
for each row execute function public.set_updated_at();

create trigger catches_set_updated_at
before update on public.catches
for each row execute function public.set_updated_at();

alter table public.fishing_spots enable row level security;
alter table public.fishing_trips enable row level security;
alter table public.catches enable row level security;

revoke all on public.fishing_spots from anon, authenticated;
revoke all on public.fishing_trips from anon, authenticated;
revoke all on public.catches from anon, authenticated;
grant select, insert, update, delete on public.fishing_spots to authenticated;
grant select, insert, update, delete on public.fishing_trips to authenticated;
grant select, insert, update, delete on public.catches to authenticated;

create policy "Owners manage their fishing spots"
on public.fishing_spots for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners manage their trips"
on public.fishing_trips for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners manage their catches"
on public.catches for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
