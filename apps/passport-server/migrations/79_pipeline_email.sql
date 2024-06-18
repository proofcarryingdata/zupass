create table generic_issuance_emails (
  pipeline_id varchar not null,
  email_type varchar not null,
  email_address varchar not null,
  time_created timestamp not null default NOW(),
  PRIMARY KEY(pipeline_id, email_type, email_address)
)