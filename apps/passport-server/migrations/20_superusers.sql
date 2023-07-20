alter table pretix_events_config
add column superuser_item_ids VARCHAR[] NOT NULL
DEFAULT '{}';

drop table devconnect_superusers;