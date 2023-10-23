CREATE TABLE telegram_forwarding (
  telegram_chat_topics_id INTEGER NOT NULL, 
  FOREIGN KEY (telegram_chat_topics_id) REFERENCES telegram_chat_topics(id),
  is_forwarding BOOLEAN NOT NULL DEFAULT FALSE,
  is_receiving BOOLEAN NOT NULL DEFAULT FALSE,
  forward_topic_destination INTEGER NULL,
  FOREIGN KEY (forward_topic_destination) REFERENCES telegram_chat_topics(id),
  
  UNIQUE (telegram_chat_topics_id, is_forwarding, is_receiving, forward_topic_destination)

);
