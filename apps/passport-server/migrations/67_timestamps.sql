alter table generic_issuance_users
add column time_created timestamp
not null default now();

alter table generic_issuance_users
add column time_updated timestamp
not null default now();

alter table users
add column time_created timestamp
not null default now();

alter table users
add column time_updated timestamp
not null default now();
