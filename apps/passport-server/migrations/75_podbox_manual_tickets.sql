CREATE TABLE if not exists pipeline_manual_tickets (
  pipelineId UUID not null,
  manualTicket JSONB not null
);
