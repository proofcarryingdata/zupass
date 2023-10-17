ALTER TABLE users ADD COLUMN terms_agreed int NOT NULL DEFAULT 0;

CREATE TABLE devconnect_pretix_redacted_tickets (
  id UUID NOT NULL DEFAULT uuid_generate_v1(),
  hashed_email VARCHAR NOT NULL,
  is_consumed BOOLEAN NOT NULL DEFAULT 'FALSE',
  position_id VARCHAR NOT NULL UNIQUE,
  secret VARCHAR NOT NULL,
  checker VARCHAR,
  pretix_checkin_timestamp TIMESTAMP,
  devconnect_pretix_items_info_id UUID
  -- zupass_checkin_timestamp can't exist so isn't needed
  -- is_deleted also makes no sense here
);