-- 1. add the message_id field to telegram_chat_anon_messages 
ALTER TABLE telegram_chat_anon_messages ADD COLUMN sent_message_id VARCHAR NULL;
-- 2. Make the id unique (it's a uuid)
ALTER TABLE telegram_chat_anon_messages ADD CONSTRAINT telegram_chat_anon_messages_pkey PRIMARY KEY (id);
-- 3. add the create a new table that has two foreign keys (kudosbot_uploaded_proofs id, telegram_chat_anon_messages id)
CREATE TABLE kudos_message_reactions (
  message_id UUID NOT NULL,
  kudos_id INT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES telegram_chat_anon_messages(id),
  FOREIGN KEY (kudos_id) REFERENCES kudosbot_uploaded_proofs(id)
);
-- 4. Reaction watermark for kudos table?
ALTER TABLE kudosbot_uploaded_proofs ADD COLUMN watermark VARCHAR NULL;
