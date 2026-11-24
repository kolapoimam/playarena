-- Notification settings. Safe to run more than once. Nothing is deleted.

-- CHECK. Shows the rules on the table today. Paste the result back if saving still fails.
select policyname, cmd, qual, with_check from pg_policies where tablename = 'user_notifications';

-- CHECK. Users with the same setting saved twice. Should return no rows.
select user_id, event_type, count(*) from user_notifications group by 1, 2 having count(*) > 1;

-- Let each signed in user read, add and change only their own settings.
alter table user_notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'user_notifications' and policyname = 'own settings read') then
    create policy "own settings read" on user_notifications for select to authenticated using (auth.uid()::text = user_id::text);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_notifications' and policyname = 'own settings add') then
    create policy "own settings add" on user_notifications for insert to authenticated with check (auth.uid()::text = user_id::text);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_notifications' and policyname = 'own settings change') then
    create policy "own settings change" on user_notifications for update to authenticated using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
  end if;
end $$;

-- One saved setting per user per event. Run this only when the second check returned no rows.
create unique index if not exists user_notifications_user_event_once on user_notifications (user_id, event_type);
