import { PipelineDefinition } from "../../services/generic-issuance/pipelines/types";

export interface IPipelineDefinitionDB {
  loadPipelineDefinitions(): Promise<PipelineDefinition[]>;
}
