-- 1. add the message_id field to telegram_chat_anon_messages 
ALTER TABLE telegram_chat_anon_messages ADD COLUMN sent_message_id VARCHAR NULL;
-- 2. Make the id unique (it's a uuid)
ALTER TABLE telegram_chat_anon_messages ADD CONSTRAINT telegram_chat_anon_messages_pkey PRIMARY KEY (id);

CREATE TABLE telegram_chat_reactions (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
	proof VARCHAR NOT NULL,
  reaction VARCHAR NOT NULL,
  anon_message_id UUID NOT NULL,
  FOREIGN KEY (anon_message_id) REFERENCES telegram_chat_anon_messages(id)
);