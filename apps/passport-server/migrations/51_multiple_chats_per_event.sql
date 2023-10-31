ALTER TABLE telegram_bot_events DROP CONSTRAINT telegram_bot_events_ticket_event_id_key;
ALTER TABLE telegram_bot_events ADD UNIQUE (telegram_chat_id, ticket_event_id);
