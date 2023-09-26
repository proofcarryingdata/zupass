create table telegram_bot_anon_nullifiers (
	id VARCHAR NOT NULL PRIMARY KEY, -- Semaphore ID
	ticket_event_id UUID NOT NULL,
	telegram_chat_id BIGINT NOT NULL,
  nullifier_times_used SMALLINT DEFAULT 0,
	last_used_timestamp TIMESTAMP,

	FOREIGN KEY (ticket_event_id, telegram_chat_id) REFERENCES telegram_bot_events(ticket_event_id, telegram_chat_id)
);