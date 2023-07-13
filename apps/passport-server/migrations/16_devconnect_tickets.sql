-- Tickets with active items, aggregated by (email, event, organizer)
create table devconnect_pretix_tickets (
  id SERIAL PRIMARY KEY,
   -- email address
  email VARCHAR NOT NULL,
  -- full name, eg "Vitalik Buterin"
  full_name VARCHAR NOT NULL,
  -- role, resident or visitor
  event_id VARCHAR NOT NULL,
  -- URL of the Pretix organizer
  organizer_url VARCHAR NOT NULL,
  -- active item IDs
  item_ids VARCHAR[] NOT NULL,
  -- each ticket will be unique on (email, event_id, organizer_url)
   UNIQUE (email, event_id, organizer_url)
);

-- Configuration tables - for hosts to manually edit
create table pretix_organizers_config (
  id SERIAL PRIMARY KEY,
   -- URL of the Pretix organizer
  organizer_url VARCHAR NOT NULL UNIQUE,
  -- Pretix API token
  token VARCHAR NOT NULL
);
create table pretix_events_config (
  id SERIAL PRIMARY KEY,
  -- FK into `pretix_organizers_config_id` table
  pretix_organizers_config_id SERIAL NOT NULL REFERENCES pretix_organizers_config(id),
  -- Event ID from Pretix API
  event_id VARCHAR NOT NULL UNIQUE,
  -- Relevant item IDs that correspond to ticket products.
  -- We skip processing of all item IDs that are not in this list.
  active_item_ids VARCHAR[] NOT NULL
);

-- Tables for us to keep relevant data from the Pretix API synced
-- References rows from config tables
create table devconnect_pretix_events_info (
  id SERIAL PRIMARY KEY,
  -- One-to-one FK with `pretix_events_config` table
  pretix_events_config_id SERIAL NOT NULL UNIQUE REFERENCES pretix_events_config(id),
  -- Event name from Pretix API
  event_name VARCHAR NOT NULL
);
create table devconnect_pretix_items_info (
  id SERIAL PRIMARY KEY,
  -- Item ID from Pretix API
  item_id VARCHAR NOT NULL UNIQUE,
  -- FK into `devconnect_pretix_events_info` table
  devconnect_pretix_events_info_id SERIAL NOT NULL REFERENCES devconnect_pretix_events_info(id),
  -- Item name from Pretix API
  item_name VARCHAR NOT NULL
);

-- Privileged users that can check status of ticketholders
create table devconnect_superusers (
  id SERIAL PRIMARY KEY,
   -- email address
  email VARCHAR NOT NULL,
  -- One-to-one FK with `pretix_events_config` table
  pretix_events_config_id SERIAL NOT NULL UNIQUE REFERENCES pretix_events_config(id)
);
