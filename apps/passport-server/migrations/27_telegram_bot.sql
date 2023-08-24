-- Users that are engaged in a conversation
create table telegram_bot_conversations (
  id SERIAL PRIMARY KEY,
  -- user_id corresponding the Telegram user
  telegram_user_id BIGINT NOT NULL UNIQUE,
  -- chat_id between the bot and the Telegram user
  telegram_chat_id BIGINT NOT NULL UNIQUE,
  -- whether the user has been verified via PCDPass
  verified BOOLEAN NOT NULL DEFAULT FALSE
);