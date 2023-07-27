delete from devconnect_pretix_tickets where 1 = 1;

alter table devconnect_pretix_tickets
drop constraint devconnect_pretix_tickets_email_devconnect_pretix_items_inf_key;

alter table devconnect_pretix_tickets
add column position_id VARCHAR NOT NULL UNIQUE;

