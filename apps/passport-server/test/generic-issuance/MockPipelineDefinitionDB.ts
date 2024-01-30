import { IPipelineDefinitionDB } from "../../src/database/queries/pipelineDefinitionDB";
import { PipelineDefinition } from "../../src/services/generic-issuance/pipelines/types";

/**
 * For testing. In-memory representation of all the pipelines that
 * 'users' have created in the generic issuance backend.
 */
export class MockPipelineDefinitionDB implements IPipelineDefinitionDB {
  private definitions: { [id: string]: PipelineDefinition };

  public constructor() {
    this.definitions = {};
  }

  public async clearAllDefinitions(): Promise<void> {
    this.definitions = {};
  }

  public async setDefinition(definition: PipelineDefinition): Promise<void> {
    this.definitions[definition.id] = definition;
  }

  public async setDefinitions(
    definitions: PipelineDefinition[]
  ): Promise<void> {
    for (const definition of definitions) {
      await this.setDefinition(definition);
    }
  }

  public async getDefinition(
    definitionID: string
  ): Promise<PipelineDefinition | undefined> {
    return this.definitions[definitionID];
  }

  public async loadPipelineDefinitions(): Promise<PipelineDefinition[]> {
    return Object.values(this.definitions);
  }
}
