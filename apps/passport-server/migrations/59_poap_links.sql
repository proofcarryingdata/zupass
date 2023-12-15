CREATE TABLE poap_claim_links (
  claim_url VARCHAR NOT NULL PRIMARY KEY,
  poap_event VARCHAR NOT NULL,
  hashed_ticket_id VARCHAR UNIQUE
);

-- This partial index speeds up query performance in the case where a user
-- that has not claimed their POAP wants to claim their link, and our server
-- searches for a new unclaimed POAP link with a given `poap_event`.
CREATE INDEX idx_unclaimed_poap_link ON poap_claim_links (poap_event)
WHERE hashed_ticket_id IS NULL;
