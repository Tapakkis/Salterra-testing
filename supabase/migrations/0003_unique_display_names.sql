-- Make display names unique regardless of case or surrounding whitespace.
-- Existing collisions must be resolved before this migration can be applied.

do $$
begin
  if exists (
    select 1
    from public.profiles
    group by lower(btrim(display_name))
    having count(*) > 1
  ) then
    raise exception 'Cannot add unique display names: resolve existing duplicate names first.';
  end if;
end;
$$;

create or replace function public.normalize_profile_display_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.display_name := btrim(new.display_name);
  if char_length(new.display_name) < 2 or char_length(new.display_name) > 80 then
    raise exception 'Display name must be between 2 and 80 characters.';
  end if;
  return new;
end;
$$;

create trigger profiles_normalize_display_name
before insert or update of display_name on public.profiles
for each row execute function public.normalize_profile_display_name();

create unique index profiles_display_name_unique_idx
on public.profiles (lower(btrim(display_name)));
