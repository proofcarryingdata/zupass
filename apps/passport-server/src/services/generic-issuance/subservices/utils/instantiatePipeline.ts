import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  PipelineDefinition,
  isCSVPipelineDefinition,
  isLemonadePipelineDefinition,
  isPretixPipelineDefinition
} from "@pcd/passport-interface";
import { ILemonadeAPI } from "../../../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../../../apis/pretix/genericPretixAPI";
import { IPipelineAtomDB } from "../../../../database/queries/pipelineAtomDB";
import { IPipelineCheckinDB } from "../../../../database/queries/pipelineCheckinDB";
import { IPipelineConsumerDB } from "../../../../database/queries/pipelineConsumerDB";
import { IPipelineSemaphoreHistoryDB } from "../../../../database/queries/pipelineSemaphoreHistoryDB";
import {
  IBadgeGiftingDB,
  IContactSharingDB
} from "../../../../database/queries/ticketActionDBs";
import { PersistentCacheService } from "../../../persistentCacheService";
import { traced } from "../../../telemetryService";
import { tracePipeline } from "../../honeycombQueries";
import { CSVPipeline } from "../../pipelines/CSVPipeline/CSVPipeline";
import { LemonadePipeline } from "../../pipelines/LemonadePipeline";
import { PretixPipeline } from "../../pipelines/PretixPipeline";
import { Pipeline } from "../../pipelines/types";

export interface InstantiatePipelineArgs {
  zupassPublicKey: EdDSAPublicKey;
  eddsaPrivateKey: string;

  cacheService: PersistentCacheService;

  apis: {
    lemonadeAPI: ILemonadeAPI;
    genericPretixAPI: IGenericPretixAPI;
  };

  atomDB: IPipelineAtomDB;
  checkinDB: IPipelineCheckinDB;
  contactDB: IContactSharingDB;
  badgeDB: IBadgeGiftingDB;
  consumerDB: IPipelineConsumerDB;
  semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
}

/**
 * Given a {@link PipelineDefinition} (which is persisted to the database) instantiates
 * a {@link Pipeline} so that it can be used for loading data from an external provider,
 * and expose its {@link Capability}s to the external world.
 */
export function instantiatePipeline(
  definition: PipelineDefinition,
  args: InstantiatePipelineArgs
): Promise<Pipeline> {
  return traced("instantiatePipeline", "instantiatePipeline", async () => {
    tracePipeline(definition);

    let pipeline: Pipeline | undefined = undefined;

    if (isLemonadePipelineDefinition(definition)) {
      pipeline = new LemonadePipeline(
        args.eddsaPrivateKey,
        definition,
        args.atomDB,
        args.apis.lemonadeAPI,
        args.zupassPublicKey,
        args.cacheService,
        args.checkinDB,
        args.contactDB,
        args.badgeDB,
        args.consumerDB,
        args.semaphoreHistoryDB
      );
    } else if (isPretixPipelineDefinition(definition)) {
      pipeline = new PretixPipeline(
        args.eddsaPrivateKey,
        definition,
        args.atomDB,
        args.apis.genericPretixAPI,
        args.zupassPublicKey,
        args.cacheService,
        args.checkinDB,
        args.consumerDB,
        args.semaphoreHistoryDB
      );
    } else if (isCSVPipelineDefinition(definition)) {
      pipeline = new CSVPipeline(args.eddsaPrivateKey, definition, args.atomDB);
    }

    if (pipeline) {
      await pipeline.start();
      return pipeline;
    }

    throw new Error(
      `couldn't instantiate pipeline for configuration ${JSON.stringify(
        definition
      )}`
    );
  });
}
