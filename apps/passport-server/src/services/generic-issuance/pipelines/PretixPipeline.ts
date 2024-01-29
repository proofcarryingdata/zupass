import { PipelineAtomDB } from "../../../database/queries/pipelineAtomDB";
import { PipelineType, PretixPipelineDefinition } from "../types";
import { BasePipeline, Pipeline } from "./types";

/**
 * TODO: implement this. (Probably Rob).
 */
export class PretixPipeline implements BasePipeline {
  public type = PipelineType.Pretix;
  public capabilities = [
    // TODO: fill this out with an issuance and checkin capability
  ];

  private definition: PretixPipelineDefinition;
  private db: PipelineAtomDB;

  public get id(): string {
    return this.definition.id;
  }

  public constructor(definition: PretixPipelineDefinition, db: PipelineAtomDB) {
    this.definition = definition;
    this.db = db;
  }

  public static is(p: Pipeline): p is PretixPipeline {
    return p.type === PipelineType.Pretix;
  }
}
