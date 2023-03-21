alter table e2ee rename column token to blob_key;
alter table e2ee drop column email;
alter table e2ee add primary key (blob_key);