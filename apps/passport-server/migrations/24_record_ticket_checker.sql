alter table devconnect_pretix_tickets
add column checker varchar not null default '';

alter table devconnect_pretix_tickets
add column checkin_timestamp timestamp;