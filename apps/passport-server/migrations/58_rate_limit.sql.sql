CREATE TABLE rate_limit_types(
  action_type VARCHAR NOT NULL,
  hourly_limit INT NOT NULL,
  PRIMARY KEY(action_type)
);

CREATE TABLE rate_limit_buckets(
  action_type VARCHAR NOT NULL,
  action_id VARCHAR NOT NULL,
  remaining INT NOT NULL,
  last_refill TIMESTAMPTZ,
  PRIMARY KEY(action_type, action_id),
  FOREIGN KEY(action_type) REFERENCES rate_limit_types
);

-- Allow 10 attempts per hour to verify tokens for the same email
INSERT INTO rate_limit_types VALUES('CHECK_EMAIL_TOKEN', 10);
-- Allow 10 attempts per hour to request a new email token, either
-- as part of creating or re-creating an account.
INSERT INTO rate_limit_types VALUES('REQUEST_EMAIL_TOKEN', 10);

-- MIT License

-- Copyright (c) 2017 Fabian Flechtmann

-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:

-- The above copyright notice and this permission notice shall be included in all
-- copies or substantial portions of the Software.

-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.

-- This implements a "token bucket" approach to rate limiting, where each
-- request causes a counter to decrease, where that counter is also re-filled
-- based on time elapsed since the last refill. This allows us to ensure that
-- requests are limited to a certain rate, without hard cut-offs around expiry
-- or without needing to track each individual request.
--
-- Based on code here: https://github.com/fafl/token-bucket-postgres

DROP FUNCTION IF EXISTS take_token(VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION take_token (action_type VARCHAR, action_id VARCHAR, time_now TIMESTAMPTZ) RETURNS boolean AS $$
DECLARE
    rate INTEGER;
    tokens INTEGER;
    extra_tokens INTEGER;
    new_tokens INTEGER;
    last_refill TIMESTAMPTZ;
    this_refill TIMESTAMPTZ;
BEGIN
    -- Check if this action type exists
    SELECT hourly_limit INTO rate FROM rate_limit_types r WHERE r.action_type = $1;
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
        EXTRACT(EPOCH FROM (time_now - last_refill) * rate / 3600.0)
    )::int;
    this_refill := last_refill + (extra_tokens * interval '1 second' * 3600.0 / rate);
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