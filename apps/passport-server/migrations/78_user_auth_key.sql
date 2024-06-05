alter table users
add column
auth_key uuid not null default uuid_generate_v4();