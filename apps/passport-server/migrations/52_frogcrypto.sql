create table frogcrypto_frogs (
  id SERIAL PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  description VARCHAR NOT NULL,
  biome VARCHAR NOT NULL,
  rarity VARCHAR NOT NULL,
  temperament VARCHAR,
  drop_weight DOUBLE PRECISION NOT NUlL,
  jump_min INT,
  jump_max INT,
  speed_min INT,
  speed_max INT,
  intelligence_min INT,
  intelligence_max INT,
  beauty_min INT,
  beauty_max INT
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