-- Add column for storing a user's encryption key for their data,
-- if they elect to skip setting up a password. Note that if this
-- column in non-null, this means that user data is server-side
-- encrypted, not end-to-end-encrypted.
ALTER TABLE users ADD column encryption_key VARCHAR DEFAULT NULL;