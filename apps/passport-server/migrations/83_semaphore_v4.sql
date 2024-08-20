update table users add column semaphore_v4_id VARCHAR UNIQUE default null;
update table users drop column auth_key;