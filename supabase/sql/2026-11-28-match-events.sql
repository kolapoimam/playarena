-- Match events: record and correct moments for any match, keep players and
-- team names on each event, and check the super code on the server.
-- Safe to run more than once.

alter table public.match_events add column if not exists assist_player_id uuid references public.players(id) on delete set null;
alter table public.match_events add column if not exists team_index int;
alter table public.match_events add column if not exists updated_at timestamptz default now();

-- Any old limit on the minute stopped late recording for past matches.
-- Drop limits that mention the minute and keep one sane range.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.match_events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%minute%'
  loop
    execute format('alter table public.match_events drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.match_events add constraint match_events_minute_range check (minute between 0 and 200) not valid;

-- Save (insert or update) one event. The super code must match the match.
create or replace function public.save_match_event(p_super_code text, p_event jsonb)
returns public.match_events
language plpgsql security definer set search_path = public as $$
declare m public.matches; r public.match_events;
begin
  select * into m from public.matches where id = (p_event->>'match_id')::uuid;
  if not found then raise exception 'match_not_found'; end if;
  if coalesce(m.super_code::text, '') <> coalesce(p_super_code, '') then raise exception 'wrong_super_code'; end if;
  if coalesce(m.cancellation_status, false) then raise exception 'match_cancelled'; end if;
  insert into public.match_events (id, match_id, type, team_name, team_index, player_id, assist_player_id, minute, description)
  values (
    coalesce(nullif(p_event->>'id', '')::uuid, gen_random_uuid()), m.id, p_event->>'type', p_event->>'team_name',
    nullif(p_event->>'team_index', '')::int, nullif(p_event->>'player_id', '')::uuid, nullif(p_event->>'assist_player_id', '')::uuid,
    greatest(0, least(200, coalesce((p_event->>'minute')::int, 0))), coalesce(p_event->>'description', '')
  )
  on conflict (id) do update set
    type = excluded.type, team_name = excluded.team_name, team_index = excluded.team_index,
    player_id = excluded.player_id, assist_player_id = excluded.assist_player_id,
    minute = excluded.minute, description = excluded.description, updated_at = now()
  where public.match_events.match_id = m.id
  returning * into r;
  return r;
end $$;

create or replace function public.delete_match_event(p_super_code text, p_match_id uuid, p_event_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then raise exception 'match_not_found'; end if;
  if coalesce(m.super_code::text, '') <> coalesce(p_super_code, '') then raise exception 'wrong_super_code'; end if;
  delete from public.match_events where id = p_event_id and match_id = m.id;
end $$;

-- When a team is renamed, every event for that team takes the new name.
create or replace function public.rename_match_team(p_super_code text, p_match_id uuid, p_old text, p_new text, p_index int)
returns void
language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then raise exception 'match_not_found'; end if;
  if coalesce(m.super_code::text, '') <> coalesce(p_super_code, '') then raise exception 'wrong_super_code'; end if;
  update public.match_events set team_name = p_new, team_index = coalesce(p_index, team_index), updated_at = now()
  where match_id = m.id and (team_name = p_old or (p_index is not null and team_index = p_index));
end $$;

grant execute on function public.save_match_event(text, jsonb) to anon, authenticated;
grant execute on function public.delete_match_event(text, uuid, uuid) to anon, authenticated;
grant execute on function public.rename_match_team(text, uuid, text, text, int) to anon, authenticated;

-- Live updates for edits and removals, not just new events
alter table public.match_events replica identity full;
