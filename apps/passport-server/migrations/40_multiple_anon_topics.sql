create table telegram_chats (
	telegram_chat_id BIGINT NOT NULL,
	primary key (telegram_chat_id)
);

INSERT INTO telegram_chats (telegram_chat_id)
SELECT DISTINCT telegram_chat_id FROM telegram_bot_events
UNION
SELECT DISTINCT telegram_chat_id FROM telegram_bot_conversations;

alter table telegram_bot_events 
add foreign key (telegram_chat_id) references telegram_chats(telegram_chat_id),
drop column anon_chat_id;

alter table telegram_bot_conversations add foreign key (telegram_chat_id) references telegram_chats(telegram_chat_id);

-- Create a new table to map telegram_chat_id to multiple anon_topic_id rows
create table telegram_chat_anon_topics (
	telegram_chat_id BIGINT NOT NULL references telegram_chats(telegram_chat_id), 
	anon_topic_id BIGINT NOT NULL, 
	anon_topic_name VARCHAR(255) NOT NULL,
	primary key (telegram_chat_id, anon_topic_id)
);

create index idx_telegram_chat_id on telegram_chat_anon_topics(telegram_chat_id);