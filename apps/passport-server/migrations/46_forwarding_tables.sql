ALTER TABLE telegram_chat_topics ADD COLUMN is_receiving BOOLEAN DEFAULT FALSE;
ALTER TABLE telegram_chat_topics ADD COLUMN is_forwarding BOOLEAN DEFAULT FALSE;

ALTER TABLE telegram_chat_topics DROP CONSTRAINT telegram_chat_anon_topics_pkey;
ALTER TABLE telegram_chat_topics ADD CONSTRAINT telegram_chat_topics_idx UNIQUE (telegram_chat_id, topic_id);
