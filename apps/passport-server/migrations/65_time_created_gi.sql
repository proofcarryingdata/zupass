alter table generic_issuance_pipelines
add column time_created timestamp not null default NOW();

alter table generic_issuance_pipelines
add column time_updated timestamp not null default NOW();