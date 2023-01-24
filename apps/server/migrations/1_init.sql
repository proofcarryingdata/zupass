-- represents a repository which we have deemed to be a 
-- schelling point, the contributors of whichare worthy of
-- goerli eth disbursement.
create table repositories (
  id SERIAL PRIMARY KEY,
  -- corresponds to the id according to GitHub's API
  repoId INTEGER NOT NULL UNIQUE,
  -- `<user or org>/<repo name>`. this can change so we update
  -- it every time we do a sync
  fullName VARCHAR NOT NULL UNIQUE,
  -- set once at row creation time
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  -- the application should update this every time it updates a row
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

-- represents an association between a user and a repository
create table contributions (
  id SERIAL PRIMARY KEY,
  -- the id of the user according to the GitHub API
  userId INTEGER NOT NULL,
  -- the id of the repository according to GitHub's API to which
  -- this user has contributed.
  repoId INTEGER NOT NULL REFERENCES repositories(repoId),
  -- set once at row creation time
  createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);

-- represents a key which should be granted ETH upon request
create table public_keys (
  id SERIAL PRIMARY KEY,
  -- the id of the user according to the GitHub API
  userId VARCHAR NOT NULL,
  publicKey VARCHAR NOT NULL UNIQUE,
  -- set once at creation time
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  -- the application should update this every time it updates a row
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  -- keys that are 'hardcoded' were added by the admins, and should
  -- not be removed if they do not appear to be contributors to a
  -- relevant open source project.
  hardcoded BOOLEAN NOT NULL DEFAULT FALSE,
  -- keys are 'removed' either:
  -- - if they belong to a contributor that was once part of a relevant 
  --   open source project, but no longer are part of one.
  -- - or if they belong to a contributor who removed this key from their 
  --   key set.
  removed BOOLEAN NOT NULL DEFAULT FALSE
);

create table redemptions (
  id SERIAL PRIMARY KEY,
  amount DOUBLE PRECISION NOT NULL,
  nullifier VARCHAR NOT NULL UNIQUE
);