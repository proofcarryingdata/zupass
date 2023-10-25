-- Add a unique index instead of a primary key constraint
ALTER TABLE telegram_chat_topics DROP CONSTRAINT telegram_chat_anon_topics_pkey;

-- Make topic id nullable
ALTER TABLE telegram_chat_topics ALTER COLUMN topic_id DROP NOT NULL;
ALTER TABLE telegram_chat_topics ADD CONSTRAINT telegram_chat_topics_idx UNIQUE NULLS NOT DISTINCT(telegram_chat_id, topic_id);

-- A unique id for every entry in telegram_chat_topics 
ALTER TABLE telegram_chat_topics ADD COLUMN id SERIAL PRIMARY KEY;

CREATE TABLE telegram_forwarding (
  sender_chat_topic_id INTEGER  NULL, 
  FOREIGN KEY (sender_chat_topic_id) REFERENCES telegram_chat_topics(id),
  receiver_chat_topic_id INTEGER NULL,
  FOREIGN KEY (receiver_chat_topic_id) REFERENCES telegram_chat_topics(id),
  UNIQUE NULLS NOT DISTINCT (sender_chat_topic_id, receiver_chat_topic_id),

  CHECK (
      -- Ensure that both columns are not NULL simultaneously
      (sender_chat_topic_id IS NOT NULL OR receiver_chat_topic_id IS NOT NULL) AND
      -- Ensure that the columns don't have the same value, if neither is NULL
      (sender_chat_topic_id IS NULL OR receiver_chat_topic_id IS NULL OR sender_chat_topic_id <> receiver_chat_topic_id)
  )

);