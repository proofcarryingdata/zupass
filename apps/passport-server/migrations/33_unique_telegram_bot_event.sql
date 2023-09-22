ALTER TABLE
    telegram_bot_events
ADD
    UNIQUE ("ticket_event_id", "telegram_chat_id");

ALTER TABLE telegram_bot_events
ADD CONSTRAINT fk_telegram_bot_events_ticket_event_id
FOREIGN KEY (ticket_event_id)
REFERENCES pretix_events_config(id);