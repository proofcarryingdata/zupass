CREATE TABLE frogcrypto_user_recaptcha_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
  semaphore_id VARCHAR,
  score DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (semaphore_id)
);