-- Moving rate limit configuration to TypeScript code, so this is no longer
-- needed.
ALTER TABLE rate_limit_buckets DROP CONSTRAINT rate_limit_buckets_action_type_fkey;
DROP TABLE rate_limit_types;
ALTER TABLE rate_limit_buckets DROP COLUMN last_refill;
ALTER TABLE rate_limit_buckets ADD COLUMN expiry_time TIMESTAMPTZ;

-- Account reset timestamp column no longer required
ALTER TABLE users DROP COLUMN account_reset_timestamps;

DROP FUNCTION IF EXISTS take_token(VARCHAR, VARCHAR, TIMESTAMPTZ);