drop table contributions;
drop table repositories;
drop table public_keys;
drop table redemptions;

create table users (
  id SERIAL PRIMARY KEY,
  -- email
  identifier VARCHAR NOT NULL,
  -- REGULAR = 0, UNVERIFIED = 1 for now
  status SMALLINT NOT NULL,
  -- set once at row creation time
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Encrypted PCD store
  encrypted_blob TEXT NOT NULL,
  -- Authentication for user
  server_password VARCHAR NOT NULL,
  -- the passport should update this every time it updates a row
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

create index users_identifier on users (identifier);