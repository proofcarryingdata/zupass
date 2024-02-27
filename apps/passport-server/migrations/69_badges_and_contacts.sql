CREATE TABLE if not exists podbox_given_badges (
  pipeline_id UUID NOT NULL,
  giver_email varchar not null,
  receiver_email varchar not null,
  badge_id varchar not null,
  badge_name varchar,
  badge_url varchar,
  time_created TIMESTAMP not null default NOW(),
  constraint unique_badges unique(pipeline_id, giver_email, receiver_email, badge_id)
);

CREATE TABLE if not exists podbox_collected_contacts (
  pipeline_id UUID NOT NULL,
  collector_email varchar not null,
  contact_email varchar not null,
  time_created TIMESTAMP not null default NOW(),
  constraint unique_contacts unique(pipeline_id, collector_email, contact_email)
);
