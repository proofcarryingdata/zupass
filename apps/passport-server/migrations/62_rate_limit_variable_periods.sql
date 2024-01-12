 -- Semantics of this table have changed enough that we should wipe it
DELETE FROM rate_limit_buckets;
-- rate_limit_types is no longer needed as this is managed in TypeScript now
ALTER TABLE rate_limit_buckets DROP CONSTRAINT rate_limit_buckets_action_type_fkey;
DROP TABLE rate_limit_types;
-- Method of calculating rate limit bucket expiry has changed
ALTER TABLE rate_limit_buckets DROP COLUMN last_refill;
ALTER TABLE rate_limit_buckets ADD COLUMN expiry_time TIMESTAMPTZ;

-- Account reset timestamp column no longer required
ALTER TABLE users DROP COLUMN account_reset_timestamps;

-- SQL procedure for checking rate limit is no longer needed
DROP FUNCTION IF EXISTS take_token(VARCHAR, VARCHAR, TIMESTAMPTZ);