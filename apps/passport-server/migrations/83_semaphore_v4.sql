alter table users add column semaphore_v4_id VARCHAR UNIQUE default null;
alter table users drop column auth_key;