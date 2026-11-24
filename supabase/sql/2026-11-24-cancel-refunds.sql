-- Records the refund share when a player or rider cancels. Safe to run more than once. Nothing is deleted.
alter table players add column if not exists refund_percent integer;
alter table players add column if not exists cancelled_at timestamptz;
alter table cycling_attendees add column if not exists refund_percent integer;
alter table cycling_attendees add column if not exists cancelled_at timestamptz;
