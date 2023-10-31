alter table telegram_chat_anon_nullifiers
	add column topic_id BIGINT;

alter table telegram_chat_anon_nullifiers
	add column telegram_chat_id BIGINT;

alter table telegram_chat_anon_nullifiers
	drop constraint telegram_chat_anon_nullifiers_pkey;

alter table telegram_chat_anon_nullifiers
	add foreign key (telegram_chat_id, topic_id) references telegram_chat_topics(telegram_chat_id, topic_id);

alter table telegram_chat_anon_nullifiers
	add primary key (nullifier, telegram_chat_id, topic_id);
