CREATE TABLE generic_issuance_offline_checkins (
  pipeline_id UUID NOT NULL,
  ticket_id UUID NOT NULL,
  checkin_timestamp TIMESTAMPTZ NOT NULL,
  checker_email VARCHAR NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  PRIMARY KEY(ticket_id)
);