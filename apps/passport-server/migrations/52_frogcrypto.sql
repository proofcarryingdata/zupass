create table frogcrypto_frogs (
  id SERIAL PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
  frog JSONB NOT NULL
);

create table frogcrypto_user_scores (
  semaphore_id VARCHAR PRIMARY KEY,
  score BIGINT NOT NULL
);

create table frogcrypto_user_feeds (
  id SERIAL PRIMARY KEY,
  semaphore_id VARCHAR NOT NULL,
  feed_id VARCHAR NOT NULL,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT TIMESTAMPTZ 'epoch'
);

CREATE UNIQUE INDEX idx_unique_semaphore_feed ON frogcrypto_user_feeds(semaphore_id, feed_id);