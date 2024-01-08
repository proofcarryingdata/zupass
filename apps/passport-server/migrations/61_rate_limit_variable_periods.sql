-- Moving rate limit configuration to TypeScript code, so this is no longer
-- needed.
ALTER TABLE rate_limit_buckets DROP CONSTRAINT rate_limit_buckets_action_type_fkey;
DROP TABLE rate_limit_types;

-- Account reset timestamp column no longer required
ALTER TABLE users DROP COLUMN account_reset_timestamps;

-- Re-implementation of function first created in 58_rate_limit.sql
-- This is simplified by allowing more values to be passed in from the calling
-- side, instead of relying on lookups from the rate_limit_types table.
--
-- This means that the caller (RateLimitService) can manage its own
-- configuration of which types of action exist, how many actions are allowed,
-- and what the time period is.
-- See the `limits` private member variable in `RateLimitService`.
DROP FUNCTION IF EXISTS take_token(VARCHAR, VARCHAR, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION take_token(
  action_type VARCHAR, -- The type of action, such as "ACCOUNT_RESET"
  action_id VARCHAR, -- A unique identifier, such as the account ID being reset
  periodic_limit INTEGER, -- How many of these actions are permitted per period
  time_period_seconds INTEGER, -- The time period, in seconds
  time_now TIMESTAMPTZ) -- The current time
  RETURNS boolean AS $$
DECLARE
    tokens INTEGER;
    extra_tokens INTEGER;
    new_tokens INTEGER;
    last_refill TIMESTAMPTZ;
    this_refill TIMESTAMPTZ;
BEGIN
    -- Lock the buckets until end of transaction
    LOCK TABLE rate_limit_buckets IN EXCLUSIVE MODE;

    -- Read the current status of the rate limit for this bucket
    SELECT b.remaining, b.last_refill INTO tokens, last_refill FROM rate_limit_buckets b WHERE b.action_type = $1 AND b.action_id = $2;
    -- If we don't have a status for this bucket, give the maxmimum remaining attempts
    IF tokens IS NULL THEN
        tokens := periodic_limit; -- Start with the max amount of tokens
        last_refill = time_now;
        INSERT INTO rate_limit_buckets VALUES ($1, $2, tokens, last_refill);
    END IF;

    -- last_refill tells us the last time we checked the rate limit. If, since
    -- that time there ought to be additional attempts allowed, calculate
    -- those and add them.
    extra_tokens := floor(
        EXTRACT(EPOCH FROM (time_now - last_refill) * periodic_limit / time_period_seconds)
    )::int;
    this_refill := last_refill + (extra_tokens * interval '1 second' * time_period_seconds / periodic_limit);
    -- What is the final count of remaining actions?
    new_tokens := LEAST(periodic_limit, tokens + extra_tokens);

    -- If the count is zero then the request is denied
    IF new_tokens <= 0 THEN
        RETURN FALSE;
    END IF;

    -- Otherwise, update the remaining count and allow the action to proceed
    UPDATE rate_limit_buckets b SET (remaining, last_refill) = (new_tokens - 1, this_refill) WHERE b.action_type = $1 AND b.action_id = $2;
    RETURN TRUE;
END
$$ LANGUAGE plpgsql;