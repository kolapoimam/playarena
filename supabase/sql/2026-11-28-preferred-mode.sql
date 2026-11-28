-- The sport a user wants SportCliq to show first. It never limits what they can use.
alter table public.profiles add column if not exists preferred_mode text;
alter table public.profiles drop constraint if exists profiles_preferred_mode_check;
alter table public.profiles add constraint profiles_preferred_mode_check
  check (preferred_mode is null or preferred_mode in ('football', 'cycling', 'horse_riding', 'paintball'));
