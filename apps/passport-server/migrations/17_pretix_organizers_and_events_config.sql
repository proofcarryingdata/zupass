create table pretix_organizers_config (
   -- URL of the Pretix organizer
  organizer_url VARCHAR NOT NULL PRIMARY KEY,
  -- Pretix API token
  token VARCHAR NOT NULL
);

create table pretix_events_config (
  organizer_url VARCHAR NOT NULL REFERENCES pretix_organizers_config(organizer_url),
  -- Event ID
  event_id VARCHAR NOT NULL PRIMARY KEY,
  -- Relevant item IDs that correspond to ticket products
  active_item_ids BIGINT[] NOT NULL,
  -- Question ID of "attendee email" question on items
  attendee_email_question_id BIGINT NOT NULL
);
