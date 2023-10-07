-- Create a new table to map telegram_chat_id to multiple anon_topic_id rows
create table telegram_chat_anon_topics (
	ticket_event_id UUID NOT NULL, 
	anon_topic_id BIGINT NOT NULL, 
	anon_topic_name VARCHAR(255) NOT NULL,
	primary key (ticket_event_id, anon_topic_id),
	foreign key (ticket_event_id) references telegram_bot_events(ticket_event_id) 
);

create index idx_ticket_event_id on telegram_chat_anon_topics(ticket_event_id);

alter table telegram_bot_events 
drop column anon_chat_id;

