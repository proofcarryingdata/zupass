import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import {
  CSVTicketPipelineDefinition,
  PipelineEdDSATicketZuAuthConfig,
  PipelineLoadSummary,
  PipelineLog,
  PipelineSemaphoreGroupInfo,
  PipelineType,
  PipelineZuAuthConfig,
  PollFeedRequest,
  PollFeedResponseValue,
  SignedEmail
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { IPODTicketData, PODTicketPCDPackage } from "@pcd/pod-ticket-pcd";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { parse } from "csv-parse";
import stringify from "fast-json-stable-stringify";
import uniqBy from "lodash/uniqBy";
import PQueue from "p-queue";
import { PoolClient } from "postgres-pool";
import { v5 as uuidv5 } from "uuid";
import * as v from "valibot";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../../database/queries/pipelineAtomDB";
import { IPipelineConsumerDB } from "../../../../database/queries/pipelineConsumerDB";
import { IPipelineSemaphoreHistoryDB } from "../../../../database/queries/pipelineSemaphoreHistoryDB";
import { sqlTransaction } from "../../../../database/sqlQuery";
import { ApplicationContext } from "../../../../types";
import { logger } from "../../../../util/logger";
import { PersistentCacheService } from "../../../persistentCacheService";
import { setError, traced } from "../../../telemetryService";
import {
  SemaphoreGroupProvider,
  SemaphoreGroupTicketInfo
} from "../../SemaphoreGroupProvider";
import {
  FeedIssuanceCapability,
  makeGenericIssuanceFeedUrl
} from "../../capabilities/FeedIssuanceCapability";
import { SemaphoreGroupCapability } from "../../capabilities/SemaphoreGroupCapability";
import { PipelineCapability } from "../../capabilities/types";
import { tracePipeline } from "../../honeycombQueries";
import { CredentialSubservice } from "../../subservices/CredentialSubservice";
import { BasePipelineCapability } from "../../types";
import { makePLogErr, makePLogInfo } from "../logging";
import { BasePipeline, Pipeline } from "../types";

const LOG_NAME = "CSVTicketPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export interface CSVTicketAtom extends PipelineAtom {
  id: string;
  ticketName: string;
  attendeeName: string;
  attendeeEmail: string;
  imageUrl: string;
  ticketId: string;
  eventId: string;
  productId: string;
}

const InputRowSchema = v.tuple([
  v.string(),
  v.string(),
  v.pipe(v.string(), v.email()),
  v.pipe(v.string(), v.url())
] as [
  ticketName: ReturnType<typeof v.string>,
  attendeeName: ReturnType<typeof v.string>,
  attendeeEmail: ReturnType<typeof v.string>,
  imageUrl: ReturnType<typeof v.string>
]);

export class CSVTicketPipeline implements BasePipeline {
  public type = PipelineType.CSVTicket;
  public capabilities: BasePipelineCapability[] = [];

  private stopped = false;
  private eddsaPrivateKey: string;
  private db: IPipelineAtomDB<CSVTicketAtom>;
  private definition: CSVTicketPipelineDefinition;
  private credentialSubservice: CredentialSubservice;
  private semaphoreGroupProvider?: SemaphoreGroupProvider;
  private consumerDB: IPipelineConsumerDB;
  private semaphoreUpdateQueue: PQueue;
  private cacheService: PersistentCacheService;
  private context: ApplicationContext;

  public get id(): string {
    return this.definition.id;
  }

  public get feedCapability(): FeedIssuanceCapability {
    return this.capabilities[0] as FeedIssuanceCapability;
  }

  public constructor(
    context: ApplicationContext,
    eddsaPrivateKey: string,
    definition: CSVTicketPipelineDefinition,
    db: IPipelineAtomDB,
    credentialSubservice: CredentialSubservice,
    consumerDB: IPipelineConsumerDB,
    semaphoreHistoryDB: IPipelineSemaphoreHistoryDB,
    cacheService: PersistentCacheService
  ) {
    this.context = context;
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<CSVTicketAtom>;
    this.capabilities = [
      {
        type: PipelineCapability.FeedIssuance,
        issue: this.issue.bind(this),
        feedUrl: makeGenericIssuanceFeedUrl(
          this.id,
          this.definition.options.feedOptions.feedId
        ),
        options: this.definition.options.feedOptions,
        getZuAuthConfig: this.getZuAuthConfig.bind(this)
      } satisfies FeedIssuanceCapability,
      {
        type: PipelineCapability.SemaphoreGroup,
        getSerializedLatestGroup: async (
          groupId: string
        ): Promise<SerializedSemaphoreGroup | undefined> => {
          return sqlTransaction(
            this.context.dbPool,
            async (client) =>
              this.semaphoreGroupProvider?.getSerializedLatestGroup(
                client,
                groupId
              )
          );
        },
        getLatestGroupRoot: async (
          groupId: string
        ): Promise<string | undefined> => {
          return sqlTransaction(
            this.context.dbPool,
            async (client) =>
              this.semaphoreGroupProvider?.getLatestGroupRoot(client, groupId)
          );
        },
        getSerializedHistoricalGroup: async (
          groupId: string,
          rootHash: string
        ): Promise<SerializedSemaphoreGroup | undefined> => {
          return sqlTransaction(
            this.context.dbPool,
            async (client) =>
              this.semaphoreGroupProvider?.getSerializedHistoricalGroup(
                client,
                groupId,
                rootHash
              )
          );
        },
        getSupportedGroups: (): PipelineSemaphoreGroupInfo[] => {
          return this.semaphoreGroupProvider?.getSupportedGroups() ?? [];
        }
      } satisfies SemaphoreGroupCapability
    ] as unknown as BasePipelineCapability[];
    this.credentialSubservice = credentialSubservice;
    this.consumerDB = consumerDB;
    if (definition.options.semaphoreGroupName) {
      this.semaphoreGroupProvider = new SemaphoreGroupProvider(
        this.context,
        this.id,
        [
          {
            name: definition.options.semaphoreGroupName,
            groupId: uuidv5(this.id, this.id),
            memberCriteria: []
          }
        ],
        consumerDB,
        semaphoreHistoryDB
      );
    }
    this.semaphoreUpdateQueue = new PQueue({ concurrency: 1 });
    this.cacheService = cacheService;
  }

  private async issue(req: PollFeedRequest): Promise<PollFeedResponseValue> {
    return traced(LOG_NAME, "issue", async (span) => {
      logger(LOG_TAG, `issue`, req);
      tracePipeline(this.definition);

      const atoms = await this.db.load(this.id);
      span?.setAttribute("atoms", atoms.length);

      let requesterEmails: SignedEmail[] | undefined;
      let requesterSemaphoreId: string | undefined;
      let requesterSemaphoreV4Id: string | undefined;

      if (req.pcd) {
        try {
          const { emails, semaphoreId, semaphoreV4Id } =
            await this.credentialSubservice.verifyAndExpectZupassEmail(req.pcd);

          if (!emails || emails.length === 0) {
            throw new Error("missing emails in credential");
          }

          requesterEmails = emails;
          requesterSemaphoreId = semaphoreId;
          requesterSemaphoreV4Id = semaphoreV4Id;
          // Consumer is validated, so save them in the consumer list
          // let didUpdate = false;
          // await sqlTransaction(this.context.dbPool, async (client) => {
          //   for (const email of emails) {
          //     didUpdate =
          //       didUpdate ||
          //       (await this.consumerDB.save(
          //         client,
          //         this.id,
          //         email.email,
          //         semaphoreId,
          //         new Date()
          //       ));
          //   }

          //   if (this.definition.options.semaphoreGroupName) {
          //     // If the user's Semaphore commitment has changed, `didUpdate` will be
          //     // true, and we need to update the Semaphore groups
          //     if (didUpdate) {
          //       span?.setAttribute("semaphore_groups_updated", true);
          //       await this.triggerSemaphoreGroupUpdate(client);
          //     }
          //   }
          // });
        } catch (e) {
          logger(LOG_TAG, "credential PCD not verified for req", req);
        }
      }

      if (
        requesterSemaphoreId === undefined ||
        requesterSemaphoreV4Id === undefined
      ) {
        throw new Error(
          "Credential does not contain Semaphore ID or Semaphore V4 ID"
        );
      }

      const semaphoreId: string = requesterSemaphoreId;
      const semaphoreV4Id: string = requesterSemaphoreV4Id;

      /**
       * @todo issue all tickets to unmatched emails?
       */
      const atomsForUser = atoms.filter((atom) => {
        return requesterEmails?.some(
          (email) => email.email === atom.attendeeEmail
        );
      });

      /**
       * @todo: caching
       */
      const pcds = await Promise.all(
        atomsForUser.flatMap((atom) => {
          return [
            this.issueEdDSATicketPCD(atom, semaphoreId),
            this.issuePODTicketPCD(atom, semaphoreV4Id)
          ];
        })
      );

      logger(
        LOG_TAG,
        `pipeline ${this.id} of type CSVTicketPipeline issuing`,
        pcds.length,
        "PCDs"
      );

      return {
        actions: [
          {
            type: PCDActionType.DeleteFolder,
            folder: this.definition.options.feedOptions.feedFolder,
            recursive: false
          },
          {
            type: PCDActionType.ReplaceInFolder,
            folder: this.definition.options.feedOptions.feedFolder,
            pcds
          }
        ]
      };
    });
  }

  private async issueEdDSATicketPCD(
    atom: CSVTicketAtom,
    semaphoreId: string
  ): Promise<SerializedPCD> {
    const stringifiedAtom = stringify(atom);
    const cachedTicket = await this.cacheService.getValue(
      `eddsa-ticket-${stringifiedAtom}`
    );
    if (cachedTicket) {
      return JSON.parse(cachedTicket.cache_value);
    }

    const ticket: ITicketData = {
      ...atom,
      attendeeSemaphoreId: semaphoreId,
      eventName: this.definition.options.eventName,
      ticketCategory: TicketCategory.Generic,
      timestampConsumed: 0,
      timestampSigned: new Date().getTime(),
      isConsumed: false,
      isRevoked: false
    };

    const pcd = await EdDSATicketPCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: `eddsa-ticket-${atom.ticketId}`
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: this.eddsaPrivateKey
      },
      ticket: {
        argumentType: ArgumentTypeName.Object,
        value: ticket
      }
    });

    const serialized = await EdDSATicketPCDPackage.serialize(pcd);
    await this.cacheService.setValue(
      `eddsa-ticket-${stringifiedAtom}`,
      JSON.stringify(serialized)
    );

    return serialized;
  }

  private async issuePODTicketPCD(
    atom: CSVTicketAtom,
    semaphoreV4Id: string
  ): Promise<SerializedPCD> {
    const stringifiedAtom = stringify(atom);
    const cachedTicket = await this.cacheService.getValue(
      `pod-ticket-${stringifiedAtom}`
    );
    if (cachedTicket) {
      return JSON.parse(cachedTicket.cache_value);
    }

    const ticket: IPODTicketData = {
      ...atom,
      owner: semaphoreV4Id,
      eventName: this.definition.options.eventName,
      ticketCategory: TicketCategory.Generic,
      timestampConsumed: 0,
      timestampSigned: new Date().getTime(),
      isConsumed: false,
      isRevoked: false
    };

    const pcd = await PODTicketPCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: `pod-ticket-${atom.ticketId}`
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: this.eddsaPrivateKey
      },
      ticket: {
        argumentType: ArgumentTypeName.Object,
        value: ticket
      }
    });

    const serialized = await PODTicketPCDPackage.serialize(pcd);
    await this.cacheService.setValue(
      `pod-ticket-${stringifiedAtom}`,
      JSON.stringify(serialized)
    );

    return serialized;
  }

  public async load(): Promise<PipelineLoadSummary> {
    return traced(LOG_NAME, "load", async (span) => {
      tracePipeline(this.definition);
      logger(LOG_TAG, "load", this.id, this.definition.type);

      const start = new Date();
      const logs: PipelineLog[] = [];
      logs.push(makePLogInfo(`parsing csv`));

      const eventId = uuidv5(this.id, this.id);

      try {
        const TicketAtomSchema = v.pipe(
          // First make sure we have the correct inputs
          InputRowSchema,
          // Then transform to an object
          v.transform(([ticketName, attendeeName, attendeeEmail, imageUrl]) => {
            const productId = uuidv5(ticketName, eventId);
            const ticketId = uuidv5(`${attendeeEmail}-${productId}`, eventId);

            return {
              id: ticketId,
              ticketName,
              attendeeName,
              attendeeEmail,
              imageUrl,
              ticketId,
              eventId,
              productId
            };
          })
        );

        const parsedCSV = await parseCSV(this.definition.options.csv);
        const titleRow = parsedCSV.shift();
        logs.push(makePLogInfo(`skipped title row '${titleRow}'`));

        const atoms: CSVTicketAtom[] = [];

        for (const row of parsedCSV) {
          const atom = v.safeParse(TicketAtomSchema, row);

          if (atom.success) {
            atoms.push(atom.output);
          } else {
            // log parsing error
            logs.push(makePLogErr(`error parsing row: ${atom.issues}`));
          }
        }

        await this.db.clear(this.id);
        logs.push(makePLogInfo(`cleared old data`));
        await this.db.save(this.id, atoms);
        logs.push(makePLogInfo(`saved parsed data: ${atoms.length} entries`));
        span?.setAttribute("atom_count", atoms.length);

        const end = new Date();
        logs.push(
          makePLogInfo(`load finished in ${end.getTime() - start.getTime()}ms`)
        );

        const eventAndProductIds = Object.fromEntries(
          uniqBy(atoms, (a) => a.productId).map((atom) => {
            return [
              `${this.definition.options.eventName} (${atom.ticketName})`,
              {
                eventId: atom.eventId,
                productId: atom.productId
              }
            ];
          })
        );

        logs.push(
          makePLogInfo(
            `\n\nevent and product ids summary:\n${JSON.stringify(
              eventAndProductIds,
              null,
              2
            )}`
          )
        );

        return {
          fromCache: false,
          paused: false,
          atomsLoaded: atoms.length,
          atomsExpected: parsedCSV.length,
          lastRunEndTimestamp: end.toISOString(),
          lastRunStartTimestamp: start.toISOString(),
          latestLogs: logs,
          success: true,
          semaphoreGroups: this.semaphoreGroupProvider?.getSupportedGroups()
        } satisfies PipelineLoadSummary;
      } catch (e) {
        setError(e, span);
        logs.push(makePLogErr(`failed to load csv: ${e}`));
        logs.push(makePLogErr(`csv was ${this.definition.options.csv}`));

        const end = new Date();
        logs.push(
          makePLogInfo(`load finished in ${end.getTime() - start.getTime()}ms`)
        );

        return {
          fromCache: false,
          paused: false,
          atomsLoaded: 0,
          atomsExpected: 0,
          lastRunEndTimestamp: end.toISOString(),
          lastRunStartTimestamp: start.toISOString(),
          latestLogs: logs,
          success: false
        } satisfies PipelineLoadSummary;
      }
    });
  }

  public isStopped(): boolean {
    return this.stopped;
  }

  public async start(): Promise<void> {
    if (this.stopped) {
      throw new Error(`pipeline ${this.id} already stopped`);
    }
    logger(LOG_TAG, `starting csv ticket pipeline with id ${this.id}`);
    await this.semaphoreGroupProvider?.start();
  }

  public async stop(): Promise<void> {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    logger(LOG_TAG, `stopping ticket pipeline`);
  }

  public static is(pipeline: Pipeline): pipeline is CSVTicketPipeline {
    return pipeline.type === PipelineType.CSVTicket;
  }

  /**
   * Retrieves ZuAuth configuration for this pipeline's PCDs.
   */
  private async getZuAuthConfig(): Promise<PipelineZuAuthConfig[]> {
    const publicKey = await getEdDSAPublicKey(this.eddsaPrivateKey);
    const uniqueProductMetadata: Record<
      string,
      PipelineEdDSATicketZuAuthConfig
    > = {};
    // Find all of the unique products and create a metadata entry
    for (const atom of uniqBy(
      await this.db.load(this.id),
      (a) => a.productId
    )) {
      uniqueProductMetadata[atom.productId] = {
        pcdType: "eddsa-ticket-pcd",
        publicKey,
        productId: atom.productId,
        eventId: atom.eventId,
        eventName: this.definition.options.eventName,
        productName: atom.ticketName
      };
    }
    return Object.values(uniqueProductMetadata);
  }

  /**
   * Collects data that is require for Semaphore groups to update.
   * Returns an array of { eventId, productId, email } objects, which the
   * SemaphoreGroupProvider will use to look up Semaphore IDs and match them
   * to configured Semaphore groups.
   */
  private async semaphoreGroupData(): Promise<SemaphoreGroupTicketInfo[]> {
    return traced(LOG_NAME, "semaphoreGroupData", async (span) => {
      const data = [];

      for (const atom of await this.db.load(this.id)) {
        data.push({
          email: atom.attendeeEmail,
          eventId: atom.eventId,
          productId: atom.productId
        });
      }

      span?.setAttribute("ticket_data_length", data.length);
      return data;
    });
  }

  /**
   * Tell the Semaphore group provider to update memberships.
   * Marked as public so that it can be called from tests, but otherwise should
   * not be called from outside the class.
   */
  public async triggerSemaphoreGroupUpdate(client: PoolClient): Promise<void> {
    return traced(LOG_NAME, "triggerSemaphoreGroupUpdate", async (_span) => {
      tracePipeline(this.definition);
      // Whenever an update is triggered, we want to make sure that the
      // fetching of data and the actual update are atomic.
      // If there were two concurrenct updates, it might be possible for them
      // to use slightly different data sets, but send them to the `update`
      // method in the wrong order, producing unexpected outcomes. Although the
      // group diffing mechanism would eventually cause the group to converge
      // on the correct membership, we can avoid any temporary inconsistency by
      // queuing update requests.
      // By returning this promise, we allow the caller to await on the update
      // having been processed.
      return this.semaphoreUpdateQueue.add(async () => {
        const data = await this.semaphoreGroupData();
        await this.semaphoreGroupProvider?.update(client, data);
      });
    });
  }

  /**
   * Returns all of the unique IDs associated with a ticket pipeline
   * definition.
   */
  public static uniqueIds(definition: CSVTicketPipelineDefinition): string[] {
    const ids = [definition.id];
    return ids;
  }
}

export function parseCSV(csv: string): Promise<string[][]> {
  return traced("parseCSV", "parseCSV", async (span) => {
    return new Promise<string[][]>((resolve, reject) => {
      span?.setAttribute("text_length", csv.length);

      const parser = parse();
      const records: string[][] = [];

      parser.on("readable", function () {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record);
        }
      });

      parser.on("error", (err) => {
        setError(err);
        reject(err);
      });

      parser.on("end", () => {
        span?.setAttribute("records", records.length);
        resolve(records);
      });

      parser.write(csv);
      parser.end();
    });
  });
}
