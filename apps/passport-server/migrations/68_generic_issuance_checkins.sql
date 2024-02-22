CREATE TABLE generic_issuance_checkins (
  pipeline_id UUID NOT NULL,
  ticket_id UUID NOT NULL,
  checkin_timestamp TIMESTAMPTZ NOT NULL,
  -- Ticket IDs should be globally unique
  PRIMARY KEY(ticket_id)
);