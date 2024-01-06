-- Make rate limiting work with flexible time periods
ALTER TABLE rate_limit_types RENAME COLUMN hourly_limit TO periodic_limit;
ALTER TABLE rate_limit_types ADD COLUMN time_period_seconds INTEGER;
-- All existing rate limits are hourly by default
UPDATE rate_limit_types SET time_period_seconds = 3600;
ALTER TABLE rate_limit_types ALTER COLUMN time_period_seconds SET NOT NULL;

-- Set up rate limit for account resets, 5 times per day
INSERT INTO rate_limit_types (action_type, periodic_limit, time_period_seconds) VALUES('ACCOUNT_RESET', 5, 86400);

-- Account reset timestamp column no longer required
ALTER TABLE users DROP COLUMN account_reset_timestamps;

-- Re-implementation of function first created in 58_rate_limit.sql
DROP FUNCTION IF EXISTS take_token(VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION take_token (action_type VARCHAR, action_id VARCHAR, time_now TIMESTAMPTZ) RETURNS boolean AS $$
DECLARE
    rate INTEGER;
    rate_seconds INTEGER;
    tokens INTEGER;
    extra_tokens INTEGER;
    new_tokens INTEGER;
    last_refill TIMESTAMPTZ;
    this_refill TIMESTAMPTZ;
BEGIN
    -- Check if this action type exists
    SELECT periodic_limit, time_period_seconds INTO rate, rate_seconds FROM rate_limit_types r WHERE r.action_type = $1;
    IF rate IS NULL THEN
        RAISE EXCEPTION 'Action type % does not have a rate configured', $1;
    END IF;

    -- Lock the buckets until end of transaction
    LOCK TABLE rate_limit_buckets IN EXCLUSIVE MODE;

    -- Read current tokens and last take
    SELECT b.remaining, b.last_refill INTO tokens, last_refill FROM rate_limit_buckets b WHERE b.action_type = $1 AND b.action_id = $2;
    IF tokens IS NULL THEN
        tokens := rate; -- Start with the max amount of tokens
        last_refill = time_now;
        INSERT INTO rate_limit_buckets VALUES ($1, $2, tokens, last_refill);
    END IF;

    -- Calculate newly generated tokens since last call
    extra_tokens := floor(
        EXTRACT(EPOCH FROM (time_now - last_refill) * rate / rate_seconds)
    )::int;
    this_refill := last_refill + (extra_tokens * interval '1 second' * rate_seconds / rate);
    new_tokens := LEAST(rate, tokens + extra_tokens);

    -- If there are no tokens left then we don't need to do anything
    IF new_tokens <= 0 THEN
        RETURN FALSE;
    END IF;

    -- Set new values and return
    UPDATE rate_limit_buckets b SET (remaining, last_refill) = (new_tokens - 1, this_refill) WHERE b.action_type = $1 AND b.action_id = $2;
    RETURN TRUE;
END
$$ LANGUAGE plpgsql;