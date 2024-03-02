CREATE TABLE if not exists ecd_frog_scores (
  semaphore_id varchar not null unique,
  score float default 0
);
