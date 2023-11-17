CREATE TABLE rate_limit_types(
  event_type VARCHAR NOT NULL,
  hourly_limit INT NOT NULL,
  PRIMARY KEY(event_type)
);

CREATE TABLE rate_limit_buckets(
  event_type VARCHAR NOT NULL,
  event_id VARCHAR NOT NULL,
  remaining INT NOT NULL,
  last_refill TIMESTAMPTZ,
  PRIMARY KEY(event_type, event_id),
  FOREIGN KEY(event_type) REFERENCES rate_limit_types
);

-- Allow 10 password reset attempts per hour
INSERT INTO rate_limit_types VALUES('CHECK_EMAIL_TOKEN', 10);
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

DROP FUNCTION IF EXISTS take_token(VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION take_token (event_type VARCHAR(100), event_id VARCHAR(100)) RETURNS boolean AS $$
DECLARE
    rate INTEGER;
    tokens INTEGER;
    extra_tokens INTEGER;
    new_tokens INTEGER;
    last_refill TIMESTAMP;
    this_refill TIMESTAMP;
BEGIN
    -- Check if this user exists
    SELECT hourly_limit INTO rate FROM rate_limit_types r WHERE r.event_type = $1;
    IF rate IS NULL THEN
        raise notice 'Event type % does not have a rate configured', $1;
        RETURN FALSE;
    END IF;

    -- Lock the buckets until end of transaction
    LOCK TABLE rate_limit_buckets IN EXCLUSIVE MODE;

    -- Read current tokens and last take
    SELECT b.remaining, b.last_refill INTO tokens, last_refill FROM rate_limit_buckets b WHERE b.event_type = $1 AND b.event_id = $2;
    IF tokens IS NULL THEN
        tokens := rate; -- Start with the max amount of tokens
        last_refill = now();
        raise notice 'Setting up a bucket for type % and id % with % tokens', $1, $2, tokens;
        INSERT INTO rate_limit_buckets VALUES ($1, $2, tokens, last_refill);
    END IF;

    -- Calculate newly generated tokens since last call
    extra_tokens := floor(
        EXTRACT(EPOCH FROM (now() - last_refill) * rate / 3600.0)
    )::int;
    this_refill := last_refill + (extra_tokens * interval '1 second' * 3600.0 / rate);
    new_tokens := LEAST(rate, tokens + extra_tokens);
    raise notice 'Bucket %:% has % tokens, last batch generated at %', $1, $2, new_tokens, this_refill;

    -- If there are no tokens left then we don't need to do anything
    IF new_tokens <= 0 THEN
        RETURN FALSE;
    END IF;

    -- Set new values and return
    UPDATE rate_limit_buckets b SET (remaining, last_refill) = (new_tokens - 1, this_refill) WHERE b.event_type = $1 AND b.event_id = $2;
    RETURN TRUE;
END
$$ LANGUAGE plpgsql;