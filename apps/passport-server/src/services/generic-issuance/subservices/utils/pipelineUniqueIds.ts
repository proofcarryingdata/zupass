import { PipelineDefinition, PipelineType } from "@pcd/passport-interface";
import { assertUnreachable } from "@pcd/util";
import { CSVPipeline } from "../../pipelines/CSVPipeline/CSVPipeline";
import { CSVTicketPipeline } from "../../pipelines/CSVTicketPipeline/CSVTicketPipeline";
import { LemonadePipeline } from "../../pipelines/LemonadePipeline";
import { PODPipeline } from "../../pipelines/PODPipeline/PODPipeline";
import { PretixPipeline } from "../../pipelines/PretixPipeline";

/**
 * Returns all of the unique IDs stored in a Pipeline definition.
 *
 * If new fields are added to the Pipeline definition that declare new unique
 * IDs, then support for them must be added to the relevant static method on
 * the pipeline.
 */
export function uniqueIdsForPipelineDefinition(
  definition: PipelineDefinition
): string[] {
  switch (definition.type) {
    case PipelineType.CSV:
      return CSVPipeline.uniqueIds(definition);
    case PipelineType.Lemonade:
      return LemonadePipeline.uniqueIds(definition);
    case PipelineType.Pretix:
      return PretixPipeline.uniqueIds(definition);
    case PipelineType.POD:
      return PODPipeline.uniqueIds(definition);
    case PipelineType.CSVTicket:
      return CSVTicketPipeline.uniqueIds(definition);
    default:
      return assertUnreachable(definition);
  }
}
