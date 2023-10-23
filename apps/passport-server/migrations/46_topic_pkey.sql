ALTER TABLE telegram_chat_topics DROP CONSTRAINT telegram_chat_anon_topics_pkey;
ALTER TABLE telegram_chat_topics ADD CONSTRAINT telegram_chat_topics_idx UNIQUE (telegram_chat_id, topic_id);

-- Unique id that can be referenced in the forwarding table
ALTER TABLE telegram_chat_topics ADD COLUMN id SERIAL PRIMARY KEY