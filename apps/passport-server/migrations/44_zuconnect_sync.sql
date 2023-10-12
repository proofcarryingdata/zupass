CREATE TABLE zuconnect_tickets (
  -- Our internal ID for the ticket
  ticket_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  -- Tripsha's ticket ID
  external_ticket_id VARCHAR NOT NULL UNIQUE,
  attendee_email VARCHAR NOT NULL,
  attendee_name VARCHAR NOT NULL,
  product_id VARCHAR NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY(ticket_id)
);

