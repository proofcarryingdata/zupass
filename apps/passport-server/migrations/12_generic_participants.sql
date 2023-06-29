CREATE TABLE email_tokens (
  email VARCHAR NOT NULL UNIQUE,
  token VARCHAR,
  timeCreated TIMESTAMP,
  timeUpdated TIMESTAMP
);

ALTER TABLE commitments drop CONSTRAINT commitments_participant_email_fkey;
ALTER TABLE pretix_participants DROP COLUMN email_token;
