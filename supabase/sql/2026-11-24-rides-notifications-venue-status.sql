-- Ride notification settings and the venue Active switch. Safe to run more than once. Nothing is deleted.

-- 1. New notification types for rides
alter type notification_event add value if not exists 'ride_reminder';
alter type notification_event add value if not exists 'landmark_favourite_ride';
alter type notification_event add value if not exists 'ride_new_rider';
alter type notification_event add value if not exists 'ride_full';

-- 2. Venues can be switched off for bookings. Every venue starts as active.
alter table venues add column if not exists is_active boolean not null default true;

-- 3. A venue manager can update their own venue, for the Active switch
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'venues' and policyname = 'manager updates own venue') then
    create policy "manager updates own venue" on venues for update to authenticated
      using (
        auth.uid()::text = user_id::text
        or exists (select 1 from access_pins p where p.venue_id = venues.id and p.user_id::text = auth.uid()::text)
      )
      with check (
        auth.uid()::text = user_id::text
        or exists (select 1 from access_pins p where p.venue_id = venues.id and p.user_id::text = auth.uid()::text)
      );
  end if;
end $$;
