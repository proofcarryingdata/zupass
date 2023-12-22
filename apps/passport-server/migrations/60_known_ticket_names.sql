ALTER TABLE known_ticket_types
ADD COLUMN event_name VARCHAR NOT NULL DEFAULT '';

UPDATE known_ticket_types SET event_name = 'Zuzalu ''23' WHERE ticket_group = 'Zuzalu23';
UPDATE known_ticket_types SET event_name = 'ZuConnect ''23' WHERE ticket_group = 'Zuconnect23';
UPDATE known_ticket_types SET event_name = 'Devconnet ''23' WHERE ticket_group = 'Devconnect23';

ALTER TABLE known_ticket_types
ALTER COLUMN event_name DROP DEFAULT;