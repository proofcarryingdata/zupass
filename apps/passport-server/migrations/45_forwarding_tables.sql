-- Creating the chats_receiving table
CREATE TABLE chats_receiving (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR,
    topic_id VARCHAR NULL,
    topic_name VARCHAR NULL,
    UNIQUE (chat_id, topic_id)

);

-- Creating the chats_forwarding table
CREATE TABLE chats_forwarding (
    chat_id VARCHAR,
    topic_id VARCHAR NULL,
    chat_receiving_id SERIAL NOT NULL REFERENCES chats_receiving(id)
);