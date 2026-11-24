-- SportCliq: make bookings, booking codes and payments single use at the database level.
-- The app already checks all of this. These rules stop anyone who skips the app.
-- Safe to run more than once. Run the CHECK queries first. If any returns rows,
-- send them to the developer before running the rules below.

-- CHECK 1: payments used for more than one booking
select payment_reference, count(*) from bookings
where payment_reference is not null group by 1 having count(*) > 1;

-- CHECK 2: payments used for more than one player
select match_id, details->>'payment_reference' as ref, count(*) from players
where details->>'payment_reference' is not null group by 1, 2 having count(*) > 1;

-- CHECK 3: bookings linked to more than one match code
select booking_id, count(*) from booking_access_codes
where booking_id is not null group by 1 having count(*) > 1;

-- RULE 1: one booking per payment
create unique index if not exists bookings_payment_reference_once
  on bookings (payment_reference) where payment_reference is not null;

-- RULE 2: one player entry per payment for each match
create unique index if not exists players_payment_reference_once
  on players (match_id, (details->>'payment_reference')) where details->>'payment_reference' is not null;

-- RULE 3: one code per booking
create unique index if not exists booking_access_codes_booking_once
  on booking_access_codes (booking_id) where booking_id is not null;
