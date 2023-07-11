-- List of the organizers within the event
create table pretix_organizers (
   -- URL of the Pretix organizer
  organizer_url VARCHAR NOT NULL PRIMARY KEY,
  -- Event IDs to sync with
  event_ids VARCHAR[] NOT NULL,
  -- Pretix API token
  token VARCHAR NOT NULL
)