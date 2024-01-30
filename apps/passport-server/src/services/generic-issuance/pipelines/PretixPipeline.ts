import { IPipelineAtomDB } from "../../../database/queries/pipelineAtomDB";
import {
  BasePipeline,
  BasePipelineDefinition,
  Pipeline,
  PipelineDefinition,
  PipelineType
} from "./types";

/**
 * TODO: implement this. (Probably Rob).
 */
export class PretixPipeline implements BasePipeline {
  public type = PipelineType.Pretix;
  public capabilities = [
    // TODO: fill this out with an issuance and checkin capability
  ];

  private eddsaPrivateKey: string;
  private definition: PretixPipelineDefinition;
  private db: IPipelineAtomDB;

  public get id(): string {
    return this.definition.id;
  }

  public constructor(
    eddsaPrivateKey: string,
    definition: PretixPipelineDefinition,
    db: IPipelineAtomDB
  ) {
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db;
  }

  public async load(): Promise<void> {
    return;
  }

  public static is(p: Pipeline): p is PretixPipeline {
    return p.type === PipelineType.Pretix;
  }
}

/**
 * Similar to {@link LemonadePipelineDefinition} but for Pretix-based Pipelines.
 */
export interface PretixPipelineDefinition extends BasePipelineDefinition {
  type: PipelineType.Pretix;
  options: PretixPipelineOptions;
}

export function isPretixPipelineDefinition(
  d: PipelineDefinition
): d is PretixPipelineDefinition {
  return d.type === PipelineType.Pretix;
}

/**
 * TODO: this needs to take into account the actual {@link PretixPipeline}, which
 * has not been implemented yet.
 */
export interface PretixPipelineOptions {
  pretixAPIKey: string;
  pretixOrgUrl: string;
  events: PretixEventConfig[];
}

/**
 * This object represents a configuration from which the server can instantiate
 * a functioning {@link PretixPipeline}. It's entirely specified by the user.
 *
 * TODO:
 * - how do these map to product and event ids?
 */
export interface PretixEventConfig {
  id: string;
  name: string;
  productIds: string[];
  superUserProductIds: string[];
}
