-- this fixes some of the unique constraints that were causing
-- issues if two org urls have the same event id, or if two events
-- have the same item id

-- remove item id unique constraint
ALTER TABLE devconnect_pretix_items_info
DROP column item_id,
ADD column item_id VARCHAR NOT NULL,
ADD UNIQUE (item_id, devconnect_pretix_events_info_id);

-- remove event id unique constraint, since multiple organizers
ALTER TABLE pretix_events_config
DROP column event_id,
ADD column event_id VARCHAR NOT NULL,
ADD UNIQUE (event_id, pretix_organizers_config_id);
