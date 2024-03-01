CREATE TABLE if not exists ecd_frog_scores (
  email varchar not null unique,
  score int default 0
);
