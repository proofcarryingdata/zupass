-- Tickets with active items, aggregated by (email, event, organizer)
create table devconnect_pretix_tickets (
   -- email address
  email VARCHAR NOT NULL,
  -- full name, eg "Vitalik Buterin"
  full_name VARCHAR NOT NULL,
  -- role, resident or visitor
  event_id VARCHAR NOT NULL,
  -- URL of the Pretix organizer
  organizer_url VARCHAR NOT NULL,
  -- active item IDs
  item_ids BIGINT[] NOT NULL,
  -- rows of Table will b unique on (email, event_id, organizer_url)
   primary key(email, event_id, organizer_url)
);

-- Configuration tables - for hosts to manually edit
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
  active_item_ids BIGINT[] NOT NULL
);

-- Tables for us to keep relevant data from the Pretix API synced
-- References rows from config tables
create table devconnect_pretix_events_info (
  event_id VARCHAR NOT NULL PRIMARY KEY,
  organizer_url VARCHAR REFERENCES pretix_organizers_config(organizer_url),
  event_name VARCHAR NOT NULL
);
create table devconnect_pretix_items_info (
  item_id BIGINT NOT NULL PRIMARY KEY,
  event_id VARCHAR NOT NULL REFERENCES pretix_events_config(event_id),
  item_name VARCHAR NOT NULL
);

-- Privileged users that can check status of ticketholders
create table devconnect_superusers (
   -- email address
  email VARCHAR NOT NULL PRIMARY KEY,
  -- Pretix event ID
  event_id VARCHAR NOT NULL,
  -- URL of the Pretix organizer
  organizer_url VARCHAR NOT NULL
);
