import { PipelineDefinition } from "../../services/generic-issuance/pipelines/types";

export interface IPipelineDefinitionDB {
  loadPipelineDefinitions(): Promise<PipelineDefinition[]>;
  clearAllDefinitions(): Promise<void>;
  getDefinition(definitionID: string): Promise<PipelineDefinition | undefined>;
  setDefinition(definition: PipelineDefinition): Promise<void>;
  setDefinitions(definitions: PipelineDefinition[]): Promise<void>;
}
