alter table devconnect_pretix_events_info
add column is_deleted boolean not null default false; 

alter table devconnect_pretix_items_info
add column is_deleted boolean not null default false; 
