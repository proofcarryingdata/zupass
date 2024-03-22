CREATE TABLE if not exists podbox_edit_history (
  semaphore_id varchar not null unique,
  pipeline JSONB not null,
  time_created Date,
  editor_user_id varchar
);
