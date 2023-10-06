ALTER TABLE telegram_bot_conversations
ADD column semaphore_id VARCHAR NOT NULL;

ALTER TABLE telegram_bot_conversations
ADD CONSTRAINT fk_semaphore_commitment
FOREIGN KEY (semaphore_id) REFERENCES users(commitment) ON UPDATE CASCADE;