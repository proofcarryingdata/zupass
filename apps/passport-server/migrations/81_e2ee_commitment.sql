alter table e2ee add column commitment varchar default null;
alter table e2ee add column time_created timestamptz not null default now();
alter table e2ee add column time_updated timestamptz not null default now();