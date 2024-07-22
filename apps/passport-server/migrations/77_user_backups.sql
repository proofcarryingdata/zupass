create table if not exists user_backups (
  uuid UUID primary key not null,
  commitment varchar not null,
  email varchar not null unique,
  salt varchar,
  extra_issuance boolean not null default false,
  encryption_key varchar,
  terms_agreed int,
  time_created timestamp not null default now(),
  time_updated timestamp not null default now()
);