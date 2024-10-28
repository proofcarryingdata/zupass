import { getHash } from "@pcd/passport-crypto";
import {
  PipelineEdDSATicketZuAuthConfig,
  PipelineLoadSummary,
  PipelineLog,
  PipelineType,
  PODPipelineDefinition,
  PODPipelineInputType,
  PODPipelineOutput,
  PODPipelineOutputMatch,
  PollFeedRequest,
  PollFeedResponseValue,
  VerifiedCredential
} from "@pcd/passport-interface";
import { PCDAction, PCDActionType } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { PODEntries, podEntriesToJSON } from "@pcd/pod";
import { PODPCDPackage } from "@pcd/pod-pcd";
import { CSVInput, Input } from "@pcd/podbox-shared";
import { assertUnreachable } from "@pcd/util";
import PQueue from "p-queue";
import { v5 as uuidv5 } from "uuid";
import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../../../database/queries/pipelineAtomDB";
import { IPipelineConsumerDB } from "../../../../database/queries/pipelineConsumerDB";
import { sqlTransaction } from "../../../../database/sqlQuery";
import { ApplicationContext } from "../../../../types";
import { logger } from "../../../../util/logger";
import { PersistentCacheService } from "../../../persistentCacheService";
import { setError, traced } from "../../../telemetryService";
import {
  FeedIssuanceCapability,
  makeGenericIssuanceFeedUrl
} from "../../capabilities/FeedIssuanceCapability";
import { PipelineCapability } from "../../capabilities/types";
import { tracePipeline } from "../../honeycombQueries";
import { CredentialSubservice } from "../../subservices/CredentialSubservice";
import { BasePipelineCapability } from "../../types";
import { makePLogErr, makePLogInfo } from "../logging";
import { BasePipeline } from "../types";
import { atomize } from "./utils/atomize";
import { finalizeAtom } from "./utils/finalizeAtom";

const LOG_NAME = "PODPipeline";
const LOG_TAG = `[${LOG_NAME}]`;

export interface PODAtom extends PipelineAtom {
  matchTo: PODPipelineOutputMatch;
  outputId: string;
  entries: PODEntries;
}

export class PODPipeline implements BasePipeline {
  public type = PipelineType.POD;
  public capabilities: BasePipelineCapability[];

  private stopped = false;
  private context: ApplicationContext;
  private eddsaPrivateKey: string;
  private db: IPipelineAtomDB<PODAtom>;
  private definition: PODPipelineDefinition;
  private credentialSubservice: CredentialSubservice;
  private consumerDB: IPipelineConsumerDB;
  private cacheService: PersistentCacheService;
  private dbQueue: PQueue;

  public get id(): string {
    return this.definition.id;
  }

  public get feedCapability(): FeedIssuanceCapability {
    return this.capabilities[0] as FeedIssuanceCapability;
  }

  public constructor(
    context: ApplicationContext,
    eddsaPrivateKey: string,
    definition: PODPipelineDefinition,
    db: IPipelineAtomDB,
    credentialSubservice: CredentialSubservice,
    consumerDB: IPipelineConsumerDB,
    cacheService: PersistentCacheService
  ) {
    this.context = context;
    this.eddsaPrivateKey = eddsaPrivateKey;
    this.definition = definition;
    this.db = db as IPipelineAtomDB<PODAtom>;
    this.credentialSubservice = credentialSubservice;
    this.consumerDB = consumerDB;
    this.cacheService = cacheService;
    this.capabilities = [
      {
        issue: this.feedIssue.bind(this),
        options: this.definition.options.feedOptions,
        type: PipelineCapability.FeedIssuance,
        feedUrl: makeGenericIssuanceFeedUrl(
          this.id,
          this.definition.options.feedOptions.feedId
        ),
        getZuAuthConfig: async (): Promise<
          PipelineEdDSATicketZuAuthConfig[]
        > => []
      } satisfies FeedIssuanceCapability
    ] as unknown as BasePipelineCapability[];
    this.dbQueue = new PQueue({ concurrency: 1 });
  }

  /**
   * Load the POD pipeline.
   *
   * Begins by loading input data from the definition, then creates atoms from
   * the input and outputs. Finally saves those atoms and returns summary
   * information.
   *
   * @returns A summary of the load operation
   */
  public async load(): Promise<PipelineLoadSummary> {
    return traced(LOG_NAME, "load", async (span) => {
      tracePipeline(this.definition);
      logger(LOG_TAG, "load", this.definition.id, this.definition.type);

      const start = new Date();
      const logs: PipelineLog[] = [];

      logger(
        LOG_TAG,
        `loading for pipeline id ${this.definition.id} with type ${this.definition.type}`
      );
      logs.push(
        makePLogInfo(`loading data for pipeline '${this.definition.id}'`)
      );

      try {
        const input = PODPipeline.loadInputFromDefinition(this.definition);

        logs.push(
          makePLogInfo(
            `input columns: ${Object.keys(input.getColumns()).join(", ")}`
          )
        );
        logs.push(makePLogInfo(`loaded ${input.getRows().length} rows`));

        const atoms = PODPipeline.createAtoms(
          input,
          this.definition.options.outputs,
          this.definition.id
        );

        /**
         * Atomically clear and save the Atom DB for this pipeline.
         */
        await this.dbQueue.add(
          async () => {
            await this.db.clear(this.definition.id);
            logs.push(makePLogInfo(`cleared old data`));
            await this.db.save(this.definition.id, atoms);
            logs.push(
              makePLogInfo(`saved parsed data: ${atoms.length} entries`)
            );
            await this.db.markAsLoaded(this.id);
          },
          // High priority means that this will run before any other DB access,
          // including reads.
          { priority: 10 }
        );

        span?.setAttribute("atom_count", atoms.length);

        const end = new Date();

        logs.push(
          makePLogInfo(`load finished in ${end.getTime() - start.getTime()}ms`)
        );

        return {
          fromCache: false,
          paused: false,
          lastRunStartTimestamp: start.toISOString(),
          lastRunEndTimestamp: end.toISOString(),
          latestLogs: logs,
          atomsLoaded: atoms.length,
          atomsExpected: atoms.length,
          success: true
        } satisfies PipelineLoadSummary;
      } catch (e) {
        setError(e, span);
        logs.push(makePLogErr(`failed to load input: ${e}`));
        logs.push(
          makePLogErr(
            `input was ${JSON.stringify(
              this.definition.options.input,
              null,
              2
            )}`
          )
        );

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
    logger(`starting pod pipeline ${this.definition.id}`);
  }

  public async stop(): Promise<void> {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    logger(`Stopping POD Pipeline ${this.definition.id}`);
  }

  /**
   * Loads the atoms that match the given credential.
   *
   * @param credential The credential to match against
   * @returns The atoms that match the given credential
   */
  private async loadMatchingAtoms({
    emails,
    semaphoreId
  }: VerifiedCredential): Promise<PODAtom[]> {
    // Use the queue to ensure that we are not interleaving with the DB
    // clear/save operation in load().
    const atoms = await this.dbQueue.add(() => this.db.load(this.id));
    const matchingAtoms: PODAtom[] = [];

    for (const atom of atoms) {
      if (atom.matchTo.type === "none") {
        // No filter, so all atoms match to all credentials
        matchingAtoms.push(atom);
      } else {
        const entry = atom.entries[atom.matchTo.entry];
        if (
          atom.matchTo.type === "email" &&
          entry.type === "string" &&
          emails
            ?.map((e) => e.email.toLowerCase())
            ?.includes(entry.value.toLowerCase())
        ) {
          matchingAtoms.push(atom);
        } else if (
          atom.matchTo.type === "semaphoreID" &&
          entry.type === "cryptographic" &&
          entry.value.toString() === semaphoreId
        ) {
          // semaphoreId is a string representation of a Semaphore commitment, as
          // retrieved from the user's credential, which is a
          // SemaphoreSignaturePCD.
          // However, in PODs we use bigints (the POD "cryptographic" type) for
          // this, so it's necessary to convert the value to a string for
          // comparison above.
          matchingAtoms.push(atom);
        }
      }
    }

    return matchingAtoms;
  }

  /**
   * Get a cached PCD for the given ID. IDs are derived from the POD
   * entries and pipeline ID. We also want to ensure that the POD was signed
   * with the current EdDSA private key, so we include that in the cache key.
   *
   * @param id The id of the PCD to get
   * @returns The cached PCD, or undefined if it is not cached
   */
  private async getCachedPCD(id: string): Promise<SerializedPCD | undefined> {
    const key = await getHash(`${id}${this.eddsaPrivateKey}`);
    const cacheEntry = await this.cacheService.getValue(key);
    if (cacheEntry) {
      return JSON.parse(cacheEntry.cache_value);
    }
    return undefined;
  }

  /**
   * Store a serialized PCD in the cache.
   *
   * @param id The id of the PCD to store
   * @param serializedPCD The PCD to store
   */
  private async storeCachedPCD(
    id: string,
    serializedPCD: SerializedPCD
  ): Promise<void> {
    const key = await getHash(`${id}${this.eddsaPrivateKey}`);
    await this.cacheService.setValue(key, JSON.stringify(serializedPCD));
  }

  /**
   * Return a response to the feed issuance request. This takes the form of
   * an array of PCD actions that will be applied to the user's PCD collection.
   *
   * @param req The request for feed issuance
   * @returns The response to the feed issuance request
   */
  private async feedIssue(
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return traced(LOG_NAME, "feedIssue", async (span) => {
      if (!req.pcd) {
        throw new Error("missing credential pcd");
      }

      if (
        this.definition.options.paused ||
        (await this.db.load(this.id)).length === 0
      ) {
        return { actions: [] };
      }

      const credential =
        await this.credentialSubservice.verifyAndExpectZupassEmail(req.pcd);
      const { emails, semaphoreId } = credential;

      span?.setAttribute("email", emails?.map((e) => e.email)?.join(",") ?? "");
      span?.setAttribute("semaphore_id", semaphoreId);

      await sqlTransaction(this.context.dbPool, async (client) => {
        for (const e of emails ?? []) {
          await this.consumerDB.save(
            client,
            this.id,
            e.email,
            semaphoreId,
            new Date()
          );
        }
      });

      // Consumer is validated, so save them in the consumer list

      // PODs must have entries
      const atomsToIssue = (await this.loadMatchingAtoms(credential)).filter(
        (atom) => Object.keys(atom.entries).length > 0
      );

      const serializedPCDs = await Promise.all(
        atomsToIssue.map(async (atom) => {
          // Get the final POD entries from the atom, output configuration,
          // and credential
          const entries = finalizeAtom(
            atom,
            this.definition.options.outputs[atom.outputId],
            credential
          );

          const id = uuidv5(JSON.stringify(podEntriesToJSON(entries)), this.id);

          let serializedPCD = await this.getCachedPCD(id);
          if (serializedPCD) {
            return serializedPCD;
          }

          // Create a PODPCD
          // @todo handle wrapper PCD outputs
          const pcd = await PODPCDPackage.prove({
            entries: {
              value: podEntriesToJSON(entries),
              argumentType: ArgumentTypeName.Object
            },
            privateKey: {
              value: this.eddsaPrivateKey,
              argumentType: ArgumentTypeName.String
            },
            id: {
              value: id,
              argumentType: ArgumentTypeName.String
            }
          });

          serializedPCD = await PODPCDPackage.serialize(pcd);
          await this.storeCachedPCD(id, serializedPCD);

          return serializedPCD;
        })
      );

      const actions: PCDAction[] = [];

      if (
        this.definition.options.feedOptions.feedType === "deleteAndReplace" &&
        (await this.db.hasLoaded(this.id))
      ) {
        actions.push({
          type: PCDActionType.DeleteFolder,
          folder: this.definition.options.feedOptions.feedFolder,
          recursive: true
        });
      }

      actions.push({
        type: PCDActionType.ReplaceInFolder,
        folder: this.definition.options.feedOptions.feedFolder,
        pcds: serializedPCDs
      });

      return { actions };
    });
  }

  /**
   * Loads an Input object from the given PODPipelineDefinition.
   * As of now, there's only one input type: CSV. In this case, return a
   * CSVInput object.
   *
   * @param definition The PODPipelineDefinition to load the input from
   * @returns The input object
   */
  public static loadInputFromDefinition(
    definition: PODPipelineDefinition
  ): Input {
    switch (definition.options.input.type) {
      case PODPipelineInputType.CSV:
        return new CSVInput(definition.options.input);
      default:
        assertUnreachable(
          definition.options.input.type,
          `Unrecognized input type: ${definition.options.input.type}`
        );
    }
  }

  /**
   * Creates atoms from the given input and outputs.
   * Technically it is possible to configure multiple outputs, but the Podbox
   * UI is restricted to the common case of a single output.
   *
   * The resulting atoms contain only data derived from the Input (e.g. a
   * CSV file) and do not contain issuance-time data derived from the user's
   * credential, which is a common way of including a Semaphore ID in a POD.
   *
   * @param input The input to create atoms from
   * @param outputs The outputs to create atoms from
   * @param pipelineId The id of the pipeline to create atoms from
   * @returns The atoms created from the given input and outputs
   */
  public static createAtoms(
    input: Input,
    outputs: Record<string, PODPipelineOutput>,
    pipelineId: string
  ): PODAtom[] {
    const atoms: PODAtom[] = [];
    const rows = input.getRows();

    // For each row in the input, create one of each configured output.
    for (const row of rows) {
      for (const [outputId, output] of Object.entries(outputs)) {
        const atom = atomize(
          input.getColumns(),
          row,
          output,
          outputId,
          pipelineId
        );
        atoms.push(atom);
      }
    }

    return atoms;
  }

  /**
   * Check if the given pipeline is a POD pipeline.
   *
   * @param pipeline The pipeline to check
   * @returns True if the given pipeline is a POD pipeline
   */
  public static is(pipeline: BasePipeline): pipeline is PODPipeline {
    return pipeline.type === PipelineType.POD;
  }

  public static uniqueIds(definition: PODPipelineDefinition): string[] {
    return [definition.id];
  }
}
