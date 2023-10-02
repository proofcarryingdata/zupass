-- First, drop the existing unique index on ticket_event_id and telegram_chat_id
ALTER TABLE telegram_bot_events DROP CONSTRAINT telegram_bot_events_ticket_event_id_telegram_chat_id_key;

-- Next, add a new unique index on ticket_event_id
ALTER TABLE telegram_bot_events ADD UNIQUE (ticket_event_id)