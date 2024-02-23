CREATE TABLE if not exists podbox_shared_contacts (
  pipeline_id UUID NOT NULL,
  sharer_email varchar not null,
  receiver_email varchar not null,
  time_created TIMESTAMP not null default NOW(),
  constraint unique_contacts unique(pipeline_id, sharer_email, receiver_email)
);

CREATE TABLE if not exists podbox_awarded_badges (
  pipeline_id UUID NOT NULL,
  receiver_email varchar not null,
  badge_id varchar not null,
  time_created TIMESTAMP not null default NOW(),
  constraint unique_badges unique(pipeline_id, receiver_email, badge_id)
);