-- Landmark favourites and notification settings. Safe to run more than once. Nothing is deleted.

-- 1. Notification settings are not tied to a ride, so this column must allow empty values
alter table user_notifications alter column cycling_event_id_uuid drop not null;
alter table user_notifications alter column cycling_event_id drop not null;

-- 2. Saved landmarks, one row per user per landmark
create table if not exists user_landmark_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  landmark_id uuid not null,
  created_at timestamptz default now()
);
create unique index if not exists user_landmark_favourites_once on user_landmark_favourites (user_id, landmark_id);

alter table user_landmark_favourites enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'user_landmark_favourites' and policyname = 'own landmark favourites read') then
    create policy "own landmark favourites read" on user_landmark_favourites for select to authenticated using (auth.uid()::text = user_id::text);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_landmark_favourites' and policyname = 'own landmark favourites add') then
    create policy "own landmark favourites add" on user_landmark_favourites for insert to authenticated with check (auth.uid()::text = user_id::text);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_landmark_favourites' and policyname = 'own landmark favourites remove') then
    create policy "own landmark favourites remove" on user_landmark_favourites for delete to authenticated using (auth.uid()::text = user_id::text);
  end if;
end $$;
