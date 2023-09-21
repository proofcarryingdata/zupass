ALTER TABLE
    "public"."telegram_bot_events"
ADD
    UNIQUE ("ticket_event_id", "telegram_chat_id");
