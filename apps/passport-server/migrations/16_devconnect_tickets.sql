-- Configuration tables - for hosts to manually edit.
-- This represents the source of truth for all organizers
-- and events we are fetching from the Pretix API.
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
  -- event ID from Pretix API
  event_id VARCHAR NOT NULL UNIQUE,
  -- A Pretix "item" corresponds to a product, like a GA ticket, student ticket, or T-shirt.
  -- A Pretix order can have multiple "positions", each of which links to exactly one item.
  -- Some items, like a GA ticket, are relevant for event ticketing, and others, like T-shirts,
  -- are not. This list represents the ID of Pretix items that are relevant for ticketing,
  -- such as only those items whose IDs are in active_item_ids are saved to the Passport DB.
  active_item_ids VARCHAR[] NOT NULL
);

-- Tickets with positions representing items that are configured to be active.
create table devconnect_pretix_tickets (
  id SERIAL PRIMARY KEY,
   -- email address, derived from the `attendee_email` of the the positions in
  --  each Pretix order
  email VARCHAR NOT NULL,
  -- full name, eg "Vitalik Buterin"
  full_name VARCHAR NOT NULL,
  -- FK into `devconnect_pretix_events_info` table
  pretix_events_config_id SERIAL NOT NULL REFERENCES pretix_events_config(id),
  -- active item IDs
  item_ids VARCHAR[] NOT NULL,
  -- each ticket will be unique on (email, pretix_events_config_id)
  UNIQUE (email, pretix_events_config_id)
);

-- Tables for us to keep relevant data from the Pretix API synced. We want up-to-date
-- info here in order to render relevant information to the user on the ticket, such as
-- the event name and item name.
create table devconnect_pretix_events_info (
  id SERIAL PRIMARY KEY,
  -- one-to-one FK with `pretix_events_config` table
  pretix_events_config_id SERIAL NOT NULL UNIQUE REFERENCES pretix_events_config(id),
  -- event name from Pretix API
  event_name VARCHAR NOT NULL
);
create table devconnect_pretix_items_info (
  id SERIAL PRIMARY KEY,
  -- item ID from Pretix API
  item_id VARCHAR NOT NULL UNIQUE,
  -- FK into `devconnect_pretix_events_info` table
  devconnect_pretix_events_info_id SERIAL NOT NULL REFERENCES devconnect_pretix_events_info(id),
  -- item name from Pretix API
  item_name VARCHAR NOT NULL
);

-- Table container "privileged" users that can check status of ticketholders and
-- verify their authenticity. A user with a given email is able to verify a ticket
-- if and only if (email, event) is contained in `devconnect_superusers`,
create table devconnect_superusers (
  id SERIAL PRIMARY KEY,
   -- email address of superuser
  email VARCHAR NOT NULL,
  -- one-to-one FK with `pretix_events_config` table
  pretix_events_config_id SERIAL NOT NULL UNIQUE REFERENCES pretix_events_config(id),
  -- each superuser will be unique on (email, pretix_events_config_id)
  UNIQUE (email, pretix_events_config_id)
);
