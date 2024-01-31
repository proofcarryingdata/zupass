import { PipelineDefinition } from "../../services/generic-issuance/pipelines/types";

/**
 * This doesn't follow the general convention we've had so far of queries
 * being functions exported from js modules, but I've done it this way to
 * facilitate simpler prototyping while we figure out what the schemas for
 * stuff should be. I actually kind of like encapsulating stuff like this in
 * interfaces, but it doesn't strictly have to end up that way for production.
 */
export interface IPipelineDefinitionDB {
  loadPipelineDefinitions(): Promise<PipelineDefinition[]>;
  clearDefinition(definitionID: string): Promise<void>;
  clearAllDefinitions(): Promise<void>;
  getDefinition(definitionID: string): Promise<PipelineDefinition | undefined>;
  setDefinition(definition: PipelineDefinition): Promise<void>;
  setDefinitions(definitions: PipelineDefinition[]): Promise<void>;
}
