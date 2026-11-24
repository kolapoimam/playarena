-- Booking codes that repeat, and cancelled or stopped codes. Safe to run more than once. Nothing is deleted.

alter table booking_access_codes add column if not exists is_recurring boolean not null default false;
alter table booking_access_codes add column if not exists recurring_frequency text;
alter table booking_access_codes add column if not exists recurring_occurrences integer;
alter table booking_access_codes add column if not exists recurring_days integer[];
alter table booking_access_codes add column if not exists recurring_until date;
alter table booking_access_codes add column if not exists times_used integer not null default 0;
alter table booking_access_codes add column if not exists cancelled_at timestamptz;
alter table booking_access_codes add column if not exists deactivated_at timestamptz;
alter table booking_access_codes add column if not exists booker_name text;
alter table booking_access_codes add column if not exists booker_phone text;

-- Only sensible schedules can be saved
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'booking_codes_frequency_ok') then
    alter table booking_access_codes add constraint booking_codes_frequency_ok
      check (recurring_frequency is null or lower(recurring_frequency) in ('daily', 'weekly', 'monthly')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'booking_codes_days_ok') then
    alter table booking_access_codes add constraint booking_codes_days_ok
      check (recurring_days is null or recurring_days <@ array[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]) not valid;
  end if;
end $$;

-- Codes that were used before this update count as used once
update booking_access_codes set times_used = 1 where times_used = 0 and (booking_id is not null or status = 'active');

-- Codes cannot be made for days that have passed
create or replace function booking_codes_not_in_past() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.match_date is not null and new.match_date < (now() at time zone 'Africa/Lagos')::date then
    raise exception 'Booking codes cannot be made for past dates';
  end if;
  return new;
end $$;

drop trigger if exists booking_codes_not_in_past on booking_access_codes;
create trigger booking_codes_not_in_past before insert on booking_access_codes
  for each row execute function booking_codes_not_in_past();
