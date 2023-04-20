create table SemaphoreHistory (
  id SERIAL PRIMARY KEY,
  groupId VARCHAR NOT NULL,
  rootHash VARCHAR NOT NULL,
  group VARCHAR NOT NULL,
  timeCreated TIMESTAMP NOT NULL DEFAULT NOW()
);