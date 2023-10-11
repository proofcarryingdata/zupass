create table telegram_chat_anon_nullifiers (
	nullifier VARCHAR NOT NULL, 
	telegram_chat_id BIGINT NOT NULL,
	topic_id BIGINT NOT NULL,
  nullifier_times_used SMALLINT DEFAULT 0,
	last_used_timestamp TIMESTAMP,
	foreign key (telegram_chat_id, topic_id) references telegram_chat_topics(telegram_chat_id, topic_id),
	primary key (nullifier)
);