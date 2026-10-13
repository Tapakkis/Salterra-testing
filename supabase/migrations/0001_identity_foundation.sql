-- Smart Fishing Cyprus identity foundation.
-- Review and run this migration in Supabase only after creating the project.

create type public.user_role as enum ('buyer', 'amateur', 'professional', 'admin');
create type public.account_status as enum ('pending', 'active', 'suspended', 'disabled');
create type public.professional_application_status as enum ('pending', 'approved', 'rejected', 'expired');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  role public.user_role not null default 'amateur',
  account_status public.account_status not null default 'pending',
  avatar_path text,
  bio text check (bio is null or char_length(bio) <= 500),
  district text,
  phone text,
  phone_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.professional_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  status public.professional_application_status not null default 'pending',
  id_document_path text not null,
  license_document_path text not null,
  license_expires_at date,
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint professional_application_reviewer_check check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending')
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_category text := new.raw_user_meta_data ->> 'requested_category';
  profile_role public.user_role := case
    when requested_category = 'buyer' then 'buyer'::public.user_role
    when requested_category = 'professional' then 'professional'::public.user_role
    else 'amateur'::public.user_role
  end;
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    profile_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.prevent_profile_privilege_changes()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
    or new.account_status is distinct from old.account_status then
    raise exception 'Role and account status are managed by the backend';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_privilege_changes
before update on public.profiles
for each row execute function public.prevent_profile_privilege_changes();

alter table public.profiles enable row level security;
alter table public.professional_applications enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.professional_applications from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.professional_applications to authenticated;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id and role in ('buyer', 'amateur'));

create policy "Users can update their safe profile fields"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and role <> 'admin');

create policy "Applicants can read their own application"
on public.professional_applications for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can submit their own application"
on public.professional_applications for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Administrator review policies will be added only after the admin authorization
-- strategy is finalized. Admin access must never be inferred from client input.
