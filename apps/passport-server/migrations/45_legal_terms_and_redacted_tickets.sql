ALTER TABLE users ADD COLUMN terms_agreed int NOT NULL DEFAULT 0;

CREATE TABLE devconnect_pretix_redacted_tickets (
  id UUID NOT NULL DEFAULT uuid_generate_v1(),
  hashed_email VARCHAR NOT NULL,
  is_consumed BOOLEAN NOT NULL DEFAULT 'FALSE',
  position_id VARCHAR NOT NULL,
  secret VARCHAR NOT NULL,
  checker VARCHAR,
  pretix_checkin_timestamp TIMESTAMP,
  devconnect_pretix_items_info_id UUID,
  pretix_events_config_id UUID,
  CONSTRAINT devconnect_pretix_redacted_tickets_devconnect_pretix_items_info_id_fkey
    FOREIGN KEY(devconnect_pretix_items_info_id)
      REFERENCES devconnect_pretix_items_info(id),
  CONSTRAINT devconnect_pretix_redacted_tickets_pretix_events_config_id_fkey
    FOREIGN KEY(pretix_events_config_id)
      REFERENCES pretix_events_config(id)
  -- zupass_checkin_timestamp can't exist so isn't needed
  -- is_deleted also makes no sense here
);

CREATE UNIQUE INDEX devconnect_pretix_redacted_tickets_position_id_pretix_events_config_id
ON devconnect_pretix_redacted_tickets (position_id, pretix_events_config_id);

ALTER TABLE devconnect_pretix_tickets ADD COLUMN pretix_events_config_id UUID;
ALTER TABLE devconnect_pretix_tickets ADD CONSTRAINT devconnect_pretix_tickets_pretix_events_config_id
FOREIGN KEY(pretix_events_config_id) REFERENCES pretix_events_config (id);

ALTER TABLE devconnect_pretix_tickets DROP CONSTRAINT unique_position_id;
ALTER TABLE devconnect_pretix_tickets DROP CONSTRAINT devconnect_pretix_tickets_position_id_key;

CREATE UNIQUE INDEX devconnect_pretix_tickets_position_id_pretix_events_config_id
ON devconnect_pretix_tickets (position_id, pretix_events_config_id);