alter table devconnect_pretix_tickets
add column pretix_checkin_timestamp timestamp;

alter table devconnect_pretix_events_info
add column checkin_list_id VARCHAR not null;