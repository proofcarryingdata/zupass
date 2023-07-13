ALTER TABLE devconnect_pretix_tickets
-- drops timestamp column, and also drops unique index associated with this column
DROP COLUMN deleted_at,
-- boolean to indicate whether a ticket is "soft deleted"
ADD is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
-- each ticket will be unique on (email, pretix_events_config_id)
ADD UNIQUE (email, devconnect_pretix_items_info_id);