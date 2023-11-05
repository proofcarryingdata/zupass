-- 1. add the message_id field to telegram_chat_anon_messages 
ALTER TABLE telegram_chat_anon_messages ADD COLUMN sent_message_id VARCHAR NULL;
-- 2. Make the id unique (it's a uuid)
ALTER TABLE telegram_chat_anon_messages ADD CONSTRAINT telegram_chat_anon_messages_pkey PRIMARY KEY (id);