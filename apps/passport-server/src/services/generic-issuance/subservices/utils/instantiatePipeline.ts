import {
  PipelineDefinition,
  isCSVPipelineDefinition,
  isCSVTicketPipelineDefinition,
  isLemonadePipelineDefinition,
  isPODPipelineDefinition,
  isPretixPipelineDefinition
} from "@pcd/passport-interface";
import { ILemonadeAPI } from "../../../../apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "../../../../apis/pretix/genericPretixAPI";
import { IPipelineAtomDB } from "../../../../database/queries/pipelineAtomDB";
import { IPipelineCheckinDB } from "../../../../database/queries/pipelineCheckinDB";
import { IPipelineConsumerDB } from "../../../../database/queries/pipelineConsumerDB";
import { IPipelineDefinitionDB } from "../../../../database/queries/pipelineDefinitionDB";
import { IPipelineEmailDB } from "../../../../database/queries/pipelineEmailDB";
import { IPipelineManualTicketDB } from "../../../../database/queries/pipelineManualTicketDB";
import { IPipelineSemaphoreHistoryDB } from "../../../../database/queries/pipelineSemaphoreHistoryDB";
import {
  IBadgeGiftingDB,
  IContactSharingDB
} from "../../../../database/queries/ticketActionDBs";
import { ApplicationContext } from "../../../../types";
import { logger } from "../../../../util/logger";
import { EmailService } from "../../../emailService";
import { LocalFileService } from "../../../LocalFileService";
import { PersistentCacheService } from "../../../persistentCacheService";
import { traced } from "../../../telemetryService";
import { tracePipeline } from "../../honeycombQueries";
import { CSVPipeline } from "../../pipelines/CSVPipeline/CSVPipeline";
import { CSVTicketPipeline } from "../../pipelines/CSVTicketPipeline/CSVTicketPipeline";
import { LemonadePipeline } from "../../pipelines/LemonadePipeline";
import { PODPipeline } from "../../pipelines/PODPipeline/PODPipeline";
import { PretixPipeline } from "../../pipelines/PretixPipeline";
import { Pipeline } from "../../pipelines/types";
import { CredentialSubservice } from "../CredentialSubservice";

/**
 * All the state necessary to instantiate any type of {@link Pipeline}.
 * The current pipeline types are:
 * - {@link LemonadePipeline}
 * - {@link CSVPipeline}
 * - {@link PretixPipeline}
 */
export interface InstantiatePipelineArgs {
  /**
   * Used to sign all PCDs created by all the {@link Pipeline}s.
   */
  eddsaPrivateKey: string;
  cacheService: PersistentCacheService;
  lemonadeAPI: ILemonadeAPI;
  genericPretixAPI: IGenericPretixAPI;
  pipelineAtomDB: IPipelineAtomDB;
  pipelineDB: IPipelineDefinitionDB;
  checkinDB: IPipelineCheckinDB;
  contactDB: IContactSharingDB;
  emailDB: IPipelineEmailDB;
  badgeDB: IBadgeGiftingDB;
  consumerDB: IPipelineConsumerDB;
  manualTicketDB: IPipelineManualTicketDB;
  semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  credentialSubservice: CredentialSubservice;
  emailService: EmailService;
  context: ApplicationContext;
  localFileService: LocalFileService | null;
}

/**
 * Given a {@link PipelineDefinition} (which is persisted to the database) instantiates
 * a {@link Pipeline} so that it can be used for loading data from an external provider,
 * and expose its {@link Capability}s to the external world.
 */
export function instantiatePipeline(
  context: ApplicationContext,
  definition: PipelineDefinition,
  args: InstantiatePipelineArgs
): Promise<Pipeline> {
  return traced("instantiatePipeline", "instantiatePipeline", async () => {
    logger(
      "[INSTANTIATE_PIPELINE]",
      `instantiating pipeline with id '${definition.id}'` +
        ` of type '${definition.type}'`
    );

    tracePipeline(definition);

    let pipeline: Pipeline | undefined = undefined;

    if (isLemonadePipelineDefinition(definition)) {
      pipeline = new LemonadePipeline(
        args.eddsaPrivateKey,
        definition,
        args.pipelineAtomDB,
        args.lemonadeAPI,
        args.cacheService,
        args.checkinDB,
        args.contactDB,
        args.emailDB,
        args.badgeDB,
        args.consumerDB,
        args.semaphoreHistoryDB,
        args.credentialSubservice,
        args.emailService,
        args.context
      );
    } else if (isPretixPipelineDefinition(definition)) {
      pipeline = new PretixPipeline(
        args.eddsaPrivateKey,
        definition,
        args.pipelineAtomDB,
        args.pipelineDB,
        args.genericPretixAPI,
        args.credentialSubservice,
        args.cacheService,
        args.checkinDB,
        args.consumerDB,
        args.manualTicketDB,
        args.semaphoreHistoryDB,
        args.context,
        args.localFileService
      );
    } else if (isCSVPipelineDefinition(definition)) {
      pipeline = new CSVPipeline(
        context,
        args.eddsaPrivateKey,
        definition,
        args.pipelineAtomDB,
        args.credentialSubservice,
        args.consumerDB,
        args.semaphoreHistoryDB
      );
    } else if (isPODPipelineDefinition(definition)) {
      pipeline = new PODPipeline(
        context,
        args.eddsaPrivateKey,
        definition,
        args.pipelineAtomDB,
        args.credentialSubservice,
        args.consumerDB,
        args.cacheService
      );
    } else if (isCSVTicketPipelineDefinition(definition)) {
      pipeline = new CSVTicketPipeline(
        context,
        args.eddsaPrivateKey,
        definition,
        args.pipelineAtomDB,
        args.credentialSubservice,
        args.consumerDB,
        args.semaphoreHistoryDB,
        args.cacheService
      );
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
