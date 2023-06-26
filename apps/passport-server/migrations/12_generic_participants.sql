CREATE TABLE email_tokens (
  email VARCHAR NOT NULL UNIQUE,
  token VARCHAR,
  timeCreated TIMESTAMP,
  timeUpdated TIMESTAMP,
);

ALTER TABLE commitments drop CONSTRAINT commitments_participant_email_fkey;
ALTER TABLE pretix_participants 
  ADD CONSTRAINT pretix_participants_email_fkey FOREIGN KEY (email) 
    REFERENCES commitments(participant_email); 
ALTER TABLE pretix_participants DROP COLUMN email_token;