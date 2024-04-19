CREATE TABLE if not exists podbox_edit_history (
  id UUID not null unique default uuid_generate_v1(),
  pipeline JSONB not null,
  time_created Timestamp not null,
  editor_user_id varchar
);
