-- remove item id unique constraint
alter table devconnect_pretix_items_info
drop column item_id,
add column item_id VARCHAR NOT NULL,
add unique (item_id, devconnect_pretix_events_info_id);

-- remove event id unique constraint, since multiple organizers
alter table pretix_events_config
drop column event_id,
add column event_id VARCHAR NOT NULL,
add unique (event_id, pretix_organizers_config_id);
