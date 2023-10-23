ALTER TABLE telegram_chat_topics ADD COLUMN receiving_chat_id bigint null;
ALTER TABLE telegram_chat_topics ADD COLUMN receiving_topic_id bigint null;

ALTER TABLE telegram_chat_topics 
ADD CONSTRAINT fk_receiving_chat_topic
FOREIGN KEY (receiving_chat_id, receiving_topic_id) 
REFERENCES telegram_chat_topics(telegram_chat_id, topic_id);