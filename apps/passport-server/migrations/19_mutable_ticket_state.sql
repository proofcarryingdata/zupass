ALTER TABLE devconnect_pretix_tickets
ADD column is_consumed BOOLEAN NOT NULL DEFAULT FALSE;