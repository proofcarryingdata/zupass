import { Pool } from "postgres-pool";
import { IDevconnectPretixAPI } from "../apis/devconnect/devconnectPretixAPI";
import {
  DevconnectPretixOrganizerConfig,
  getDevconnectPretixConfig
} from "../apis/devconnect/organizer";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { OrganizerSync } from "./devconnect/organizerSync";
import { RollbarService } from "./rollbarService";
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
  private db: Pool;
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
    this.db = context.dbPool;
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
    try {
      logger("[DEVCONNECT PRETIX] (Re)loading Pretix Config");
      await this.setupOrganizers();

      logger("[DEVCONNECT PRETIX] Sync start");
      await this.sync();
      await this.semaphoreService.reload();
      this._hasCompletedSyncSinceStarting = true;
      logger("[DEVCONNECT PRETIX] Sync successful");
    } catch (e) {
      this.rollbarService?.reportError(e);
      logger("[DEVCONNECT PRETIX] Sync failed", e);
    }
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
    const devconnectPretixConfig = await getDevconnectPretixConfig(this.db);

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
        this.rollbarService,
        this.db
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
      span?.setAttribute("organizers_count", this.organizers.size);
      try {
        return await organizer.run();
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] Error encounted when synchronizing organizer ${id}`,
          e
        );
        setError(e, span);
        this.rollbarService?.reportError(e);
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
}

/**
 * Kick off a period sync from Pretix into PCDPassport
 */
export async function startDevconnectPretixSyncService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  semaphoreService: SemaphoreService,
  devconnectPretixAPIFactory: DevconnectPretixAPIFactory | null
): Promise<DevconnectPretixSyncService | null> {
  if (context.isZuzalu) {
    logger("[DEVCONNECT PRETIX] Not starting service because IS_ZUZALU=true");
    return null;
  }

  if (!devconnectPretixAPIFactory) {
    logger(
      "[DEVCONNECT PRETIX] Can't start sync service - no api factory instantiated"
    );
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
