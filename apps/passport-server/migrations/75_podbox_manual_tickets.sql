CREATE TABLE if not exists pipeline_manual_tickets (
  pipeline_id UUID not null,
  manual_ticket JSONB not null
);
