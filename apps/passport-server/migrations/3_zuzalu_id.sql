
--
-- Allowed participants, from Pretix. Pretix is the system of record.
--
create table pretix_participants (
  -- email address
  email VARCHAR NOT NULL PRIMARY KEY,
  -- Pretix order ID
  order_id VARCHAR NOT NULL,
  -- full name, eg "Vitalik Buterin"
  name VARCHAR NOT NULL,
  -- role, resident or visitor
  role VARCHAR NOT NULL,
  -- where the participant is staying
  residence VARCHAR NOT NULL
);


--
-- Zuzalu participants. See the ZuParticipant type.
--
create table commitments (
  -- UUID of the commitment, for lookup, to avoid enumeration attacks
  uuid UUID NOT NULL PRIMARY KEY,
  -- semaphore commitment
  commitment VARCHAR NOT NULL,
  -- participant ID
  participant_email VARCHAR NOT NULL REFERENCES pretix_participants(email)
);