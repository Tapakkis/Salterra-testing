-- Apply after 0001-0003. Activates only confirmed pending buyers/amateurs.
-- Professional approval and administrator provisioning remain backend operations.
begin;

create or replace function public.prevent_profile_privilege_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.account_status is distinct from old.account_status)
    and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'Role and account status are managed by the backend';
  end if;
  return new;
end;
$$;

-- The auth trigger creates profiles; clients cannot insert privileged profiles
-- or change role/status through unrestricted table grants.
revoke insert, update on public.profiles from authenticated;
grant update (display_name, avatar_path, bio, district, phone, phone_visible)
  on public.profiles to authenticated;
drop policy if exists "Users can create their own profile" on public.profiles;

create or replace function public.activate_confirmed_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null then
    update public.profiles
    set account_status = 'active'
    where id = new.id and account_status = 'pending' and role in ('buyer', 'amateur');
  end if;
  return new;
end;
$$;
revoke all on function public.activate_confirmed_account() from public, anon, authenticated;

-- PostgreSQL orders same-event triggers by name: run after on_auth_user_created.
create trigger z_activate_confirmed_account_on_insert
after insert on auth.users
for each row execute function public.activate_confirmed_account();
create trigger activate_confirmed_account_on_email_confirmation
after update of email_confirmed_at on auth.users
for each row execute function public.activate_confirmed_account();

update public.profiles p
set account_status = 'active'
from auth.users u
where p.id = u.id and u.email_confirmed_at is not null
  and p.account_status = 'pending' and p.role in ('buyer', 'amateur');

-- An applicant cannot submit a pre-approved application through the API.
drop policy if exists "Users can submit their own application" on public.professional_applications;
create policy "Users can submit their own application"
on public.professional_applications for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending' and reviewed_by is null and reviewed_at is null
  and rejection_reason is null
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'professional'
      and p.account_status in ('pending', 'active')
  )
);
commit;
