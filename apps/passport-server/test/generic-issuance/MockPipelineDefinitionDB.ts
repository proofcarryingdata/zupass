import { IPipelineDefinitionDB } from "../../src/database/queries/pipelineDefinitionDB";
import { PipelineDefinition } from "../../src/services/generic-issuance/pipelines/types";

export class MockPipelineDefinitionDB implements IPipelineDefinitionDB {
  private definitions: PipelineDefinition[];

  public constructor() {
    this.definitions = [];
  }

  public async addDefinition(definition: PipelineDefinition): Promise<void> {
    this.definitions.push(definition);
  }

  public async getDefinition(
    definitionID: string
  ): Promise<PipelineDefinition | undefined> {
    return this.definitions.find((d) => d.id === definitionID);
  }

  public async loadPipelineDefinitions(): Promise<PipelineDefinition[]> {
    return this.definitions;
  }
}
