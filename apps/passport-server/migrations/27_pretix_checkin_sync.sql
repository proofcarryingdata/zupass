alter table devconnect_pretix_tickets
add column pretix_checkin_timestamp timestamp;

alter table devconnect_pretix_tickets
rename column checkin_timestamp to pcdpass_checkin_timestamp;

alter table devconnect_pretix_tickets
alter column checker drop not null;

alter table devconnect_pretix_events_info
add column checkin_list_id VARCHAR not null default '0';
