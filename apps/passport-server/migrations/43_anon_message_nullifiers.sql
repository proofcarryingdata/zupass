create table telegram_chat_anon_nullifiers (
	nullifier VARCHAR NOT NULL, 
	message_timestamps timestamptz[] not null default array[]::timestamptz[],
	primary key (nullifier)
);