create table telegram_chat_anon_messages (
	id UUID NOT NULL DEFAULT uuid_generate_v1(),
	nullifier VARCHAR NOT NULL,
	chat_topic_id BIGINT NOT NULL,
	content VARCHAR NOT NULL,
	proof VARCHAR NOT NULL,
	message_timestamp timestamptz NOT NULL,
	foreign key (nullifier, chat_topic_id) REFERENCES telegram_chat_anon_nullifiers(nullifier, chat_topic_id)
);