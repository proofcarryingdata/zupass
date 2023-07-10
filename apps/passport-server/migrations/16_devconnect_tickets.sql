create table devconnect_pretix_tickets (
   -- email address
  email VARCHAR NOT NULL PRIMARY KEY,
  -- Pretix order ID
  order_id VARCHAR NOT NULL,
  -- full name, eg "Vitalik Buterin"
  name VARCHAR NOT NULL,
  -- role, resident or visitor
  ticket_name VARCHAR NOT NULL,
  -- Pretix event ID
  event_id VARCHAR NOT NULL
);

-- Privileged users that can check status of ticketholders
create table devconnect_superusers (
   -- email address
  email VARCHAR NOT NULL PRIMARY KEY,
  -- Pretix event ID
  event_id VARCHAR NOT NULL
)
