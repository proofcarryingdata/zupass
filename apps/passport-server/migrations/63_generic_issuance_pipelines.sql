
CREATE TABLE generic_issuance_users (
  id UUID NOT NULL PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL
);

CREATE TABLE generic_issuance_pipelines (
  id UUID NOT NULL PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES generic_issuance_users(id),
  pipeline_type VARCHAR NOT NULL,
  -- Configuration for specific pipeline types goes here.
  -- This is everything included in the PipelineDefinition that is not either
  -- part of the PipelineDefinition base class, or is the type of the Pipeline.
  config JSON NOT NULL
);

-- Join table for pipeline editors
CREATE TABLE generic_issuance_pipeline_editors (
  pipeline_id UUID NOT NULL REFERENCES generic_issuance_pipelines(id),
  editor_id UUID NOT NULL REFERENCES generic_issuance_users(id),
  PRIMARY KEY(pipeline_id, editor_id)
);
