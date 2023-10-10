-- Rename the table
ALTER TABLE telegram_chat_anon_topics RENAME TO telegram_chat_topics;

-- Rename the columns
ALTER TABLE telegram_chat_topics RENAME COLUMN anon_topic_id TO topic_id;
ALTER TABLE telegram_chat_topics RENAME COLUMN anon_topic_name TO topic_name;
ALTER TABLE telegram_chat_topics ADD COLUMN is_anon_topic BOOLEAN DEFAULT TRUE;
