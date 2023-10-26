create table kudosbot_uploaded_proofs (
  id SERIAL PRIMARY KEY,
  proof VARCHAR NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);
