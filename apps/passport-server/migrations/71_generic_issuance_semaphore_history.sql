CREATE TABLE generic_issuance_semaphore_history (
  id BIGSERIAL PRIMARY KEY,
  pipeline_id UUID NOT NULL,
  group_id UUID NOT NULL,
  root_hash VARCHAR NOT NULL,
  serialized_group VARCHAR NOT NULL,
  time_created TIMESTAMP NOT NULL DEFAULT now(),
  -- If a pipeline is deleted, delete the semaphore groups
  CONSTRAINT fk_pipeline
    FOREIGN KEY (pipeline_id)
    REFERENCES generic_issuance_pipelines (id)
    ON DELETE CASCADE
);

CREATE INDEX idx_generic_issuance_semaphore_history_pipeline_id ON generic_issuance_semaphore_history(pipeline_id);
CREATE INDEX idx_generic_issuance_semaphore_history_root_hash ON generic_issuance_semaphore_history(root_hash);
CREATE INDEX idx_generic_issuance_semaphore_history_group_id ON generic_issuance_semaphore_history(group_id);