-- If the server's `TICKET_ISSUANCE_CUTOFF_DATE` environment variable is set and now is later than that timestamp,
-- a user is only able to get their Devconnect tickets re-issued if this new `extra_issuance` flag is set to true.
-- In the case the user gets their tickets re-issued because this flag is true, the server will set it back
-- to `false`.

alter table users
add column extra_issuance boolean not null default false;
