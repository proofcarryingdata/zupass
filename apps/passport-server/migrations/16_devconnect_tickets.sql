-- Tickets with active items, aggregated by (email, event, organizer)
create table devconnect_pretix_tickets (
   -- email address
  email VARCHAR NOT NULL,
  -- full name, eg "Vitalik Buterin"
  name VARCHAR NOT NULL,
  -- role, resident or visitor
  event_id VARCHAR NOT NULL,
  -- URL of the Pretix organizer
  organizer_url VARCHAR NOT NULL,
  -- active item IDs
  item_ids BIGINT[] NOT NULL
);

-- Table will be unique on (email, event_id, organizer_url)
alter table devconnect_pretix_tickets
add primary key (email, event_id, organizer_url);

-- Privileged users that can check status of ticketholders
create table devconnect_superusers (
   -- email address
  email VARCHAR NOT NULL PRIMARY KEY,
  -- Pretix event ID
  event_id VARCHAR NOT NULL,
  -- URL of the Pretix organizer
  organizer_url VARCHAR NOT NULL
);
