import { KnownPublicKeyType, KnownTicketGroup } from "@pcd/passport-interface";
import { RollbarService } from "@pcd/server-shared";
import { Pool } from "postgres-pool";
import { IDevconnectPretixAPI } from "../apis/devconnect/devconnectPretixAPI";
import {
  DevconnectPretixOrganizerConfig,
  getDevconnectPretixConfig
} from "../apis/devconnect/organizer";
import { fetchDevconnectProducts } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import {
  deleteKnownTicketType,
  fetchKnownTicketTypesByGroup,
  setKnownTicketType
} from "../database/queries/knownTicketTypes";
import { namedSqlTransaction, sqlTransaction } from "../database/sqlQuery";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { OrganizerSync } from "./devconnect/organizerSync";
import { ZUPASS_TICKET_PUBLIC_KEY_NAME } from "./issuanceService";
import { SemaphoreService } from "./semaphoreService";
import { setError, traced } from "./telemetryService";

const NAME = "Devconnect Pretix";

export type DevconnectPretixAPIFactory = () => Promise<IDevconnectPretixAPI>;

/**
 * Responsible for syncing users from Pretix into an internal representation.
 */
export class DevconnectPretixSyncService {
  private static readonly SYNC_INTERVAL_MS = 1000 * 60;

  private rollbarService: RollbarService | null;
  private semaphoreService: SemaphoreService;
  private pool: Pool;
  private timeout: NodeJS.Timeout | undefined;
  private _hasCompletedSyncSinceStarting: boolean;
  private organizers: Map<string, OrganizerSync>;
  private pretixAPIFactory: DevconnectPretixAPIFactory;

  public get hasCompletedSyncSinceStarting(): boolean {
    return this._hasCompletedSyncSinceStarting;
  }

  public constructor(
    context: ApplicationContext,
    pretixAPIFactory: DevconnectPretixAPIFactory,
    rollbarService: RollbarService | null,
    semaphoreService: SemaphoreService
  ) {
    this.pool = context.dbPool;
    this.rollbarService = rollbarService;
    this.semaphoreService = semaphoreService;
    this.pretixAPIFactory = pretixAPIFactory;
    this.organizers = new Map();
    this._hasCompletedSyncSinceStarting = false;
  }

  public startSyncLoop(): void {
    logger("[DEVCONNECT PRETIX] Starting sync loop");

    const trySync = async (): Promise<void> => {
      await this.trySync();
      this.timeout = setTimeout(
        () => trySync(),
        DevconnectPretixSyncService.SYNC_INTERVAL_MS
      );
    };

    trySync();
  }

  public async trySync(): Promise<void> {
    return traced(NAME, "trySync", async (span) => {
      try {
        logger("[DEVCONNECT PRETIX] (Re)loading Pretix Config");
        await this.setupOrganizers();

        logger("[DEVCONNECT PRETIX] Sync start");
        await this.sync();
        await this.setDevconnectTicketTypes();
        this.semaphoreService.scheduleReload();
        this._hasCompletedSyncSinceStarting = true;
        logger("[DEVCONNECT PRETIX] Sync successful");
      } catch (e) {
        // This should not happen merely as a result of sync failing.
        // If we're getting an exception here, something failed in the
        // orchestration of the sync jobs.
        this.rollbarService?.reportError(e);
        logger("[DEVCONNECT PRETIX] Sync failed", e);
        setError(e, span);
      }
    });
  }

  public stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    for (const [_id, organizerSync] of this.organizers) {
      organizerSync.cancel();
    }
  }

  /**
   * (Re)load Pretix configuration, and set up organizers.
   */
  private async setupOrganizers(): Promise<void> {
    const devconnectPretixConfig = await sqlTransaction(this.pool, (client) =>
      getDevconnectPretixConfig(client)
    );

    if (!devconnectPretixConfig) {
      throw new Error("Pretix Config could not be loaded");
    }

    const orgIds = new Set(
      devconnectPretixConfig.organizers.map((org) => org.id)
    );

    const previousOrgIds = new Set(this.organizers.keys());
    const removedOrgIds = [...previousOrgIds].filter((x) => !orgIds.has(x));
    const newOrgIds = [...orgIds].filter((x) => !previousOrgIds.has(x));

    // Make sure we have an OrganizerSync for any new organizers.
    // This is also how initial OrganizerSyncs are created.
    for (const id of newOrgIds) {
      const config = devconnectPretixConfig.organizers.find(
        (org) => org.id === id
      ) as DevconnectPretixOrganizerConfig;
      const org = new OrganizerSync(
        config,
        await this.pretixAPIFactory(),
        this.pool
      );
      this.organizers.set(id, org);
    }

    for (const id of removedOrgIds) {
      this.organizers.get(id)?.cancel();
      this.organizers.delete(id);
    }
  }

  private async syncSingleOrganizer(
    id: string,
    organizer: OrganizerSync
  ): Promise<void> {
    return traced(NAME, "syncSingleOrganizer", async (span) => {
      try {
        await organizer.run();
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] Error encounted when synchronizing organizer ${id}`,
          e
        );
        setError(e, span);
        this.rollbarService?.reportError(
          new Error("Devconnect Pretix Sync failed", { cause: e })
        );
      }
    });
  }

  /**
   * Download Pretix state, and apply a diff to our state so that it
   * reflects the state in Pretix.
   */
  private async sync(): Promise<void> {
    return traced(NAME, "sync", async (span) => {
      span?.setAttribute("organizers_count", this.organizers.size);

      const syncStart = Date.now();
      const organizerPromises = [];

      // Attempt to run each organizer job in parallel
      for (const [id, organizer] of this.organizers.entries()) {
        if (!organizer.isRunning) {
          organizerPromises.push(this.syncSingleOrganizer(id, organizer));
        }
      }

      // Wait until all organizers have either completed or failed
      // This might take > 1 minute if one of the organizers hits a limit
      // on requests to Pretix.
      // In the meantime, this function might get called again, so there
      // might be two overlapping syncs occurring. The !organizer.isRunning
      // check earlier should prevent the same organizer being synced
      // concurrently.
      await Promise.allSettled(organizerPromises);

      const syncEnd = Date.now();
      logger(
        `[DEVCONNECT PRETIX] Sync end. Began at ${new Date(
          syncStart
        ).toString()} and completed in ${Math.floor(
          (syncEnd - syncStart) / 1000
        )} seconds.`
      );
    });
  }

  /**
   * After synchronization with Pretix, we can register the known "ticket
   * types" we have just synchronized in the database.
   *
   * Ticket types are comprised of a combination of event ID, product ID,
   * public key and "group". The public key is the counterpart of the
   * private key we use to sign PCDs, and the event/product IDs are the
   * ones we just sync'ed.
   *
   * See also {@link setupKnownTicketTypes} in the issuance service.
   */
  public async setDevconnectTicketTypes(): Promise<void> {
    return namedSqlTransaction(
      this.pool,
      "setDevconnectTicketTypes",
      async (client) => {
        const products = await fetchDevconnectProducts(client);
        const savedProductIds = [];

        for (const product of products) {
          await setKnownTicketType(
            client,
            `sync-${product.product_id}`,
            product.event_id,
            product.product_id,
            ZUPASS_TICKET_PUBLIC_KEY_NAME,
            KnownPublicKeyType.EdDSA,
            // This works since we're only using this sync service for Devconnect
            KnownTicketGroup.Devconnect23,
            "Devconnect '23"
          );

          savedProductIds.push(product.product_id);
        }

        // Check to see if there are any tickets in the DB which were not present
        // in the sync, and delete them.
        const existingTicketTypes = await fetchKnownTicketTypesByGroup(
          client,
          KnownTicketGroup.Devconnect23
        );
        for (const existingType of existingTicketTypes) {
          if (!savedProductIds.find((p) => p === existingType.product_id)) {
            await deleteKnownTicketType(client, existingType.identifier);
          }
        }
      }
    );
  }
}

/**
 * Kick off a periodic sync from Pretix into Zupass
 */
export async function startDevconnectPretixSyncService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  semaphoreService: SemaphoreService,
  devconnectPretixAPIFactory: DevconnectPretixAPIFactory | null
): Promise<DevconnectPretixSyncService | null> {
  if (!devconnectPretixAPIFactory) {
    logger(
      "[DEVCONNECT PRETIX] Can't start sync service - no api factory instantiated"
    );
    return null;
  }

  if (process.env.PRETIX_SYNC_DISABLED === "true") {
    logger("[DEVCONNECT PRETIX] not starting because PRETIX_SYNC_DISABLED");
    return null;
  }

  const pretixSyncService = new DevconnectPretixSyncService(
    context,
    devconnectPretixAPIFactory,
    rollbarService,
    semaphoreService
  );

  pretixSyncService.startSyncLoop();

  return pretixSyncService;
}
