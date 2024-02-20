-- A list of all consumers for a pipeline.
-- These are Zupass users who have authenticated as a consumer of the pipeline,
-- e.g. by requesting a feed.

CREATE TABLE generic_issuance_consumers (
  pipeline_id UUID NOT NULL,
  -- The email and Semaphore commitment, as contained in the EmailPCD used to
  -- authenticate to a feed.
  email VARCHAR NOT NULL,
  commitment VARCHAR NOT NULL,
  -- At some point, we might consider users who have not actively consumed
  -- anything for a period of time to be inactive, so we store this data for
  -- some future-proofing and for metrics.
  time_created TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The same email can only be saved for the same pipeline once
  -- If the user resets their account and returns with a new Semaphore ID, that
  -- will overwrite the previous one.
  PRIMARY KEY(pipeline_id, email),
  -- If a pipeline is deleted, delete the consumer data
  CONSTRAINT fk_pipeline
    FOREIGN KEY (pipeline_id)
    REFERENCES generic_issuance_pipelines (id)
    ON DELETE CASCADE
);