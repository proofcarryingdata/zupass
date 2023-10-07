-- Step 1: Add semaphore_id column
ALTER TABLE telegram_bot_conversations
ADD column semaphore_id VARCHAR NOT NULL;

-- Step 2: Add foreign key constraint on users commitment
ALTER TABLE telegram_bot_conversations
ADD CONSTRAINT fk_semaphore_commitment
FOREIGN KEY (semaphore_id) REFERENCES users(commitment) ON UPDATE CASCADE;

-- Step 3: Add a unique index on (semaphore_id, telegram_chat_id)
-- This prevents a user with two Telegram accounts from joining the chat multiple times
CREATE UNIQUE INDEX idx_unique_semaphore_telegram
ON telegram_bot_conversations(semaphore_id, telegram_chat_id);