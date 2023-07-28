CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

delete from devconnect_pretix_tickets where 1 = 1;
delete from devconnect_pretix_items_info where 1 = 1;
delete from devconnect_pretix_events_info where 1 = 1;
delete from pretix_events_config where 1 = 1;
delete from pretix_organizers_config where 1 = 1;

-- 

alter table devconnect_pretix_tickets 
add column uuid_ uuid unique not null default uuid_generate_v1();

alter table devconnect_pretix_items_info 
add column uuid_ uuid unique not null default uuid_generate_v1();

alter table devconnect_pretix_events_info
add column uuid_ uuid unique not null default uuid_generate_v1();

alter table pretix_events_config
add column uuid_ uuid unique not null default uuid_generate_v1();

alter table pretix_organizers_config
add column uuid_ uuid unique not null default uuid_generate_v1();

-- 

alter table devconnect_pretix_tickets drop column id;
alter table devconnect_pretix_tickets rename column uuid_ to id;

alter table devconnect_pretix_tickets drop column devconnect_pretix_items_info_id;
alter table devconnect_pretix_items_info drop column id;
alter table devconnect_pretix_items_info rename column uuid_ to id;
alter table devconnect_pretix_tickets add column devconnect_pretix_items_info_id uuid;
alter table devconnect_pretix_tickets 
add constraint devconnect_pretix_tickets_devconnect_pretix_items_info_id_fkey 
foreign key (devconnect_pretix_items_info_id) references devconnect_pretix_items_info (id);

alter table devconnect_pretix_items_info drop column devconnect_pretix_events_info_id;
alter table devconnect_pretix_events_info drop column id;
alter table devconnect_pretix_events_info rename column uuid_ to id;
alter table devconnect_pretix_items_info add column devconnect_pretix_events_info_id uuid;
alter table devconnect_pretix_items_info 
add constraint devconnect_pretix_items_info_devconnect_pretix_events_info_id_fkey 
foreign key (devconnect_pretix_events_info_id) references devconnect_pretix_events_info (id);

alter table devconnect_pretix_events_info drop column pretix_events_config_id;
alter table pretix_events_config drop column id;
alter table pretix_events_config rename column uuid_ to id;

alter table devconnect_pretix_events_info add column pretix_events_config_id uuid;
alter table devconnect_pretix_events_info 
add constraint devconnect_pretix_events_info_devconnect_pretix_events_config_id_fkey 
foreign key (pretix_events_config_id) references pretix_events_config (id);

alter table pretix_events_config drop column pretix_organizers_config_id;
alter table pretix_organizers_config drop column id;
alter table pretix_organizers_config rename column uuid_ to id;
alter table pretix_events_config add column pretix_organizers_config_id uuid;
alter table pretix_events_config 
add constraint pretix_events_config_pretix_organizers_config_id_fkey 
foreign key (pretix_organizers_config_id) references pretix_organizers_config (id);


