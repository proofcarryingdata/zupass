-- add a new column to store preference to share TG info
ALTER TABLE
  frogcrypto_user_scores
ADD
  COLUMN telegram_sharing_allowed BOOLEAN NULL;