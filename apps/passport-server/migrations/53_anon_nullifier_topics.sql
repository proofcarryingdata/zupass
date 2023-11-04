alter table telegram_chat_anon_nullifiers
	add column chat_topic_id BIGINT;

alter table telegram_chat_anon_nullifiers
	drop constraint telegram_chat_anon_nullifiers_pkey;

alter table telegram_chat_anon_nullifiers
	add foreign key (chat_topic_id) references telegram_chat_topics(id);

alter table telegram_chat_anon_nullifiers
	add constraint nullifier_chat_topic_id_unique UNIQUE NULLS NOT DISTINCT (nullifier, chat_topic_id);
