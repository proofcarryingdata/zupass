create table cache (
  id SERIAL,
  cache_key VARCHAR UNIQUE,
  cache_value VARCHAR,
  time_created TIMESTAMP,
  time_updated TIMESTAMP
);
