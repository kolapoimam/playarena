-- Welcome, engagement and feedback emails, plus ride feedback.
-- Safe to run more than once.

-- One row per email sent, so no user ever gets the same email twice.
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,          -- welcome, day_7, day_21, day_30, day_90, day_120, day_180, day_365, feedback_match, feedback_ride
  ref text not null default '', -- the match or ride for feedback emails
  status text not null default 'sending',
  provider_id text,
  error text,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
alter table public.email_log enable row level security;
-- Only the server writes here. Users can see what they were sent.
drop policy if exists "email_log own read" on public.email_log;
create policy "email_log own read" on public.email_log for select to authenticated using (user_id = auth.uid());

-- Email consent. No row means the user gets engagement emails, as agreed at sign up.
create table if not exists public.email_preferences (
  user_id uuid primary key,
  engagement boolean not null default true,
  feedback boolean not null default true,
  unsubscribed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.email_preferences enable row level security;
drop policy if exists "email_prefs own" on public.email_preferences;
create policy "email_prefs own" on public.email_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Opens and clicks reported by Resend, when its webhook is turned on
create table if not exists public.email_events (
  id bigserial primary key,
  provider_id text,
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.email_events enable row level security;

-- Ride feedback, the same idea as match feedback
create table if not exists public.ride_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.cycling_events(id_uuid) on delete cascade,
  attendee_id uuid not null references public.cycling_attendees(id_uuid) on delete cascade,
  overall int not null check (overall between 1 and 5),
  organisation int check (organisation between 1 and 5),
  route int check (route between 1 and 5),
  comments text,
  created_at timestamptz not null default now(),
  unique (event_id, attendee_id)
);
alter table public.ride_feedback enable row level security;
drop policy if exists "ride_feedback read" on public.ride_feedback;
create policy "ride_feedback read" on public.ride_feedback for select using (true);

-- Riders submit with the code on their ticket. The code is checked on the server.
create or replace function public.submit_ride_feedback(p_slug text, p_code text, p_overall int, p_organisation int, p_route int, p_comments text)
returns text
language plpgsql security definer set search_path = public as $$
declare e public.cycling_events; a public.cycling_attendees;
begin
  select * into e from public.cycling_events where slug = p_slug;
  if not found then raise exception 'ride_not_found'; end if;
  select * into a from public.cycling_attendees where cycling_event_id_uuid = e.id_uuid and confirmation_code = p_code limit 1;
  if not found then raise exception 'wrong_code'; end if;
  insert into public.ride_feedback (event_id, attendee_id, overall, organisation, route, comments)
  values (e.id_uuid, a.id_uuid, p_overall, nullif(p_organisation, 0), nullif(p_route, 0), nullif(trim(p_comments), ''))
  on conflict (event_id, attendee_id) do nothing;
  if not found then return 'already'; end if;
  return 'saved';
end $$;
grant execute on function public.submit_ride_feedback(text, text, int, int, int, text) to anon, authenticated;
