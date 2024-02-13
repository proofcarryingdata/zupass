import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import { PipelineDefinition } from "@pcd/passport-interface";
import { ILemonadeAPI } from "../../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../../apis/pretix/genericPretixAPI";
import { IPipelineAtomDB } from "../../../database/queries/pipelineAtomDB";
import { traced } from "../../telemetryService";
import { tracePipeline } from "../honeycombQueries";
import { CSVPipeline } from "./CSVPipeline";
import {
  LemonadePipeline,
  isLemonadePipelineDefinition
} from "./LemonadePipeline";
import {
  PretixPipeline,
  isCSVPipelineDefinition,
  isPretixPipelineDefinition
} from "./PretixPipeline";
import { Pipeline } from "./types";

/**
 * Given a {@link PipelineDefinition} (which is persisted to the database) instantiates
 * a {@link Pipeline} so that it can be used for loading data from an external provider,
 * and expose its {@link Capability}s to the external world.
 */
export function instantiatePipeline(
  eddsaPrivateKey: string,
  definition: PipelineDefinition,
  db: IPipelineAtomDB,
  apis: {
    lemonadeAPI: ILemonadeAPI;
    genericPretixAPI: IGenericPretixAPI;
  },
  zupassPublicKey: EdDSAPublicKey
): Promise<Pipeline> {
  return traced("instantiatePipeline", "instantiatePipeline", async () => {
    tracePipeline(definition);

    if (isLemonadePipelineDefinition(definition)) {
      return new LemonadePipeline(
        eddsaPrivateKey,
        definition,
        db,
        apis.lemonadeAPI,
        zupassPublicKey
      );
    } else if (isPretixPipelineDefinition(definition)) {
      return new PretixPipeline(
        eddsaPrivateKey,
        definition,
        db,
        apis.genericPretixAPI,
        zupassPublicKey
      );
    } else if (isCSVPipelineDefinition(definition)) {
      return new CSVPipeline(eddsaPrivateKey, definition, db, zupassPublicKey);
    }

    throw new Error(
      `couldn't instantiate pipeline for configuration ${JSON.stringify(
        definition
      )}`
    );
  });
}
