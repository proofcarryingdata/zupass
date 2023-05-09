--
-- Only one commitment per email
--
alter table commitments add constraint participant_email_unique unique (participant_email);