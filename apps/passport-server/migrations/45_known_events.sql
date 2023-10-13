CREATE TABLE known_events (
  event_id UUID NOT NULL PRIMARY KEY
);

-- Populate known_events table with current state of known_ticket_types
INSERT INTO known_events (event_id)
SELECT DISTINCT event_id::UUID FROM known_ticket_types;

-- We cannot directly cast VARCHAR to UUID, so we must create a temporary column,
-- copy over values, drop the old column, and rename
ALTER TABLE known_ticket_types
ADD COLUMN event_id_uuid UUID;

UPDATE known_ticket_types
SET event_id_uuid = event_id::UUID;

ALTER TABLE known_ticket_types
DROP COLUMN event_id;

ALTER TABLE known_ticket_types
RENAME COLUMN event_id_uuid TO event_id;

-- Add foreign key constraint between known_ticket_types(event_id)
-- and known_events(event_id)
ALTER TABLE known_ticket_types
ADD CONSTRAINT known_ticket_types_event_id_key
FOREIGN KEY (event_id)
REFERENCES known_events(event_id);

ALTER TABLE telegram_bot_events
DROP CONSTRAINT fk_telegram_bot_events_ticket_event_id;

ALTER TABLE telegram_bot_events
ADD FOREIGN KEY (ticket_event_id)
REFERENCES known_events(event_id);