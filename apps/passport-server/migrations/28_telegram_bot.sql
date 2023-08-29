-- Users that are engaged in a conversation
create table telegram_bot_conversations (
  id SERIAL PRIMARY KEY,
  -- user_id corresponding the Telegram user
  telegram_user_id BIGINT NOT NULL,
  -- chat_id between the bot and the Telegram user
  telegram_chat_id BIGINT NOT NULL,
  -- whether the user has been verified via PCDPass
  verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX user_chat ON telegram_bot_conversations (telegram_user_id, telegram_chat_id); 

create table telegram_bot_events (
  -- the event ID matching the ticketData from the PCD
  ticket_event_id UUID NOT NULL,
  -- the ID of the Telegram channel granted access to
  telegram_chat_id BIGINT NOT NULL
);