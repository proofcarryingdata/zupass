alter table telegram_chat_anon_nullifiers
	add column chat_topic_id BIGINT;

alter table telegram_chat_anon_nullifiers
	add column telegram_chat_id BIGINT;

alter table telegram_chat_anon_nullifiers
	drop constraint telegram_chat_anon_nullifiers_pkey;

alter table telegram_chat_anon_nullifiers
	add foreign key (chat_topic_id) references telegram_chat_topics(id);

alter table telegram_chat_anon_nullifiers
	add primary key (nullifier, chat_topic_id);
