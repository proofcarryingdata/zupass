-- represents a confession made by a semaphore group member
create table confessions (
  id SERIAL PRIMARY KEY,
  -- the confession body
  body VARCHAR NOT NULL,
  -- the semaphore group url for the user who made this confession
  semaphoreGroupUl VARCHAR NOT NULL,
  -- the zk proof for the confession
  proof VARCHAR NOT NULL,
  -- set once at row creation time
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  -- the application should update this every time it updates a row
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);
