create table semaphore_history (
  id SERIAL PRIMARY KEY,
  groupId VARCHAR NOT NULL,
  rootHash VARCHAR NOT NULL,
  serializedGroup VARCHAR NOT NULL,
  timeCreated TIMESTAMP NOT NULL DEFAULT NOW()
);
