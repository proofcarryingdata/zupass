alter table users add column semaphore_v4_commitment VARCHAR UNIQUE default null;
alter table users add column semaphore_v4_pubkey VARCHAR UNIQUE default null;
alter table users drop column auth_key;