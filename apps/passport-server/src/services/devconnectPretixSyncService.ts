import { Pool } from "pg";
import {
  DevconnectPretixOrder,
  IDevconnectPretixAPI
} from "../apis/devconnect/devconnectPretixAPI";
import {
  DevconnectPretixConfig,
  DevconnectPretixEventConfig,
  DevconnectPretixOrganizerConfig,
  getDevconnectPretixConfig
} from "../apis/devconnect/organizer";
import { DevconnectPretixTicket, PretixItemInfo } from "../database/models";
import { fetchDevconnectPretixTicketsByEvent } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { insertDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import { softDeleteDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/softDeleteDevconnectPretixTicket";
import { updateDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import {
  fetchPretixEventInfo,
  insertPretixEventsInfo,
  updatePretixEventsInfo
} from "../database/queries/pretixEventInfo";
import {
  deletePretixItemInfo,
  fetchPretixItemsInfoByEvent,
  insertPretixItemsInfo,
  updatePretixItemsInfo
} from "../database/queries/pretixItemInfo";
import { ApplicationContext } from "../types";
import {
  getEmailAndItemKey,
  pretixTicketsDifferent,
  ticketsToMapByEmailAndItem
} from "../util/devconnectTicket";
import { logger } from "../util/logger";
import { RollbarService } from "./rollbarService";
import { SemaphoreService } from "./semaphoreService";
import { traced } from "./telemetryService";

const SERVICE_NAME_FOR_TRACING = "Devconnect Pretix";

/**
 * Responsible for syncing users from Pretix into an internal representation.
 */
export class DevconnectPretixSyncService {
  private pretixAPI: IDevconnectPretixAPI;
  private pretixConfig: DevconnectPretixConfig;
  private rollbarService: RollbarService | null;
  private semaphoreService: SemaphoreService;
  private context: ApplicationContext;
  private db: Pool;
  private timeout: NodeJS.Timeout | undefined;
  private _hasCompletedSyncSinceStarting: boolean;

  public get hasCompletedSyncSinceStarting(): boolean {
    return this._hasCompletedSyncSinceStarting;
  }

  public constructor(
    context: ApplicationContext,
    pretixAPI: IDevconnectPretixAPI,
    pretixConfig: DevconnectPretixConfig,
    rollbarService: RollbarService | null,
    semaphoreService: SemaphoreService
  ) {
    this.context = context;
    this.db = context.dbPool;
    this.rollbarService = rollbarService;
    this.semaphoreService = semaphoreService;
    this.pretixAPI = pretixAPI;
    this.pretixConfig = pretixConfig;
    this._hasCompletedSyncSinceStarting = false;
  }

  public replaceApi(newAPI: IDevconnectPretixAPI): void {
    const wasRunning = !!this.timeout;

    if (wasRunning) {
      this.stop();
    }

    this.pretixAPI = newAPI;
    this._hasCompletedSyncSinceStarting = false;

    if (wasRunning) {
      this.startSyncLoop();
    }
  }

  public startSyncLoop(): void {
    logger("[DEVCONNECT PRETIX] Starting sync loop");

    const trySync = async (): Promise<void> => {
      await this.trySync();
      this.timeout = setTimeout(() => trySync(), 1000 * 60);
    };

    trySync();
  }

  public async trySync(): Promise<void> {
    try {
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
  }

  /**
   * Download Pretix state, and apply a diff to our state so that it
   * reflects the state in Pretix.
   */
  private async sync(): Promise<void> {
    return traced(SERVICE_NAME_FOR_TRACING, "sync", async () => {
      const syncStart = Date.now();

      const eventSyncPromises = []; // one per organizer-event pair

      for (const organizer of this.pretixConfig.organizers) {
        for (const event of organizer.events) {
          eventSyncPromises.push(
            this.syncAllPretixForOrganizerAndEvent(organizer, event)
          );
        }
      }

      try {
        await Promise.all(eventSyncPromises);
      } catch (e) {
        logger(
          "[DEVCONNECT PRETIX] failed to save tickets for one or more events",
          e
        );
        this.rollbarService?.reportError(e);
      }

      const syncEnd = Date.now();

      logger(
        `[DEVCONNECT PRETIX] Sync end. Completed in ${Math.floor(
          (syncEnd - syncStart) / 1000
        )} seconds`
      );
    });
  }

  /**
   * Sync, and update data for Pretix event.
   * Returns whether update was successful.
   */
  private async syncEventInfos(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig
  ): Promise<boolean> {
    return traced(SERVICE_NAME_FOR_TRACING, "syncEventInfos", async (span) => {
      const { orgURL, token } = organizer;
      const { eventID, id: eventConfigID } = event;

      try {
        const {
          name: { en: eventNameFromAPI }
        } = await this.pretixAPI.fetchEvent(orgURL, token, eventID);
        const existingEvent = await fetchPretixEventInfo(
          this.db,
          eventConfigID
        );
        if (!existingEvent) {
          await insertPretixEventsInfo(
            this.db,
            eventNameFromAPI,
            eventConfigID
          );
        } else {
          await updatePretixEventsInfo(
            this.db,
            existingEvent.id,
            eventNameFromAPI
          );
        }
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] error while syncing event for ${orgURL} and ${eventID}, skipping update`,
          { error: e }
        );
        return false;
      }

      return true;
    });
  }

  /**
   * Sync, check, and update data for Pretix active items under event.
   * Returns whether update was successful.
   */
  private async syncItemInfos(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig
  ): Promise<boolean> {
    return traced(SERVICE_NAME_FOR_TRACING, "syncItemInfos", async (span) => {
      const { orgURL, token } = organizer;
      const { eventID, activeItemIDs, id: eventConfigID } = event;

      try {
        const eventInfo = await fetchPretixEventInfo(this.db, eventConfigID);

        if (!eventInfo) {
          throw new Error(
            `couldn't find an event info matching event config id ${eventConfigID}`
          );
        }

        const itemsFromAPI = await this.pretixAPI.fetchItems(
          orgURL,
          token,
          eventID
        );
        const newItemIDsSet = new Set(itemsFromAPI.map((i) => i.id.toString()));
        const activeItemIDsSet = new Set(activeItemIDs);
        // Ensure all configured "active items" exist under the Pretix event's returned items.
        // If any do not exist under active items, log an error and stop syncing.
        if (activeItemIDs.some((i) => !newItemIDsSet.has(i))) {
          throw new Error(
            `One or more of event's active items no longer exist on Pretix.\n` +
              `old event set: ${activeItemIDs.join(",")}\n` +
              `new event set: ${Array.from(newItemIDsSet).join(",")}\n`
          );
        }
        const newActiveItems = itemsFromAPI.filter((i) =>
          activeItemIDsSet.has(i.id.toString())
        );

        const newActiveItemsByItemID = new Map(
          newActiveItems.map((i) => [i.id.toString(), i])
        );
        const existingItemsInfo = await fetchPretixItemsInfoByEvent(
          this.db,
          eventInfo.id
        );
        const existingItemsInfoByItemID = new Map(
          existingItemsInfo.map((i) => [i.item_id, i])
        );
        const itemsToInsert = newActiveItems.filter(
          (i) => !existingItemsInfoByItemID.has(i.id.toString())
        );

        // Step 1 of saving: insert items that are new
        logger(`[DEVCONNECT PRETIX] Inserting ${itemsToInsert.length} items`);
        for (const item of itemsToInsert) {
          logger(`[DEVCONNECT PRETIX] Inserting ${JSON.stringify(item)}`);
          await insertPretixItemsInfo(
            this.db,
            item.id.toString(),
            eventInfo.id,
            item.name.en
          );
        }

        // Step 2 of saving: update items that have changed
        // Filter to items that existed before, and filter to those that have changed.
        const itemsToUpdate = newActiveItems
          .filter((i) => existingItemsInfoByItemID.has(i.id.toString()))
          .filter((i) => {
            const oldItem = existingItemsInfoByItemID.get(i.id.toString())!;
            return oldItem.item_name !== i.name.en;
          });

        // For the active item that have changed, update them in the database.
        logger(`[DEVCONNECT PRETIX] Updating ${itemsToUpdate.length} items`);
        for (const item of itemsToUpdate) {
          const oldItem = existingItemsInfoByItemID.get(item.id.toString())!;
          logger(
            `[DEVCONNECT PRETIX] Updating ${JSON.stringify(
              oldItem
            )} to ${JSON.stringify({ ...oldItem, item_name: item.name.en })}`
          );
          await updatePretixItemsInfo(this.db, oldItem.id, item.name.en);
        }

        // Step 3 of saving: remove items that are not active anymore
        const itemsToRemove = existingItemsInfo.filter(
          (existing) => !newActiveItemsByItemID.has(existing.item_id)
        );
        logger(`[DEVCONNECT PRETIX] Deleting ${itemsToRemove.length} items`);
        for (const item of itemsToRemove) {
          logger(`[DEVCONNECT PRETIX] Deleting ${JSON.stringify(item)}`);
          await deletePretixItemInfo(this.db, item.id);
        }
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] error while syncing items for ${orgURL} and ${eventID}, skipping update`,
          { error: e }
        );
        return false;
      }

      return true;
    });
  }

  /**
   * Sync and update data for Pretix tickets under event.
   * Returns whether update was successful.
   */
  private async syncTickets(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig
  ): Promise<boolean> {
    return traced(SERVICE_NAME_FOR_TRACING, "syncTickets", async (span) => {
      const { orgURL, token } = organizer;
      const { eventID, id: eventConfigID } = event;

      let pretixOrders: DevconnectPretixOrder[];
      try {
        const eventInfo = await fetchPretixEventInfo(this.db, eventConfigID);

        if (!eventInfo) {
          throw new Error(
            `couldn't find an event info matching event config id ${eventConfigID}`
          );
        }

        pretixOrders = await this.pretixAPI.fetchOrders(orgURL, token, eventID);

        // Fetch updated version after DB updates
        const updatedItemsInfo = await fetchPretixItemsInfoByEvent(
          this.db,
          eventInfo.id
        );

        const tickets = this.ordersToDevconnectTickets(
          pretixOrders,
          updatedItemsInfo
        );

        const newTicketsByEmailAndItem = ticketsToMapByEmailAndItem(tickets);
        const existingTickets = await fetchDevconnectPretixTicketsByEvent(
          this.db,
          eventConfigID
        );
        const existingTicketsByEmailAndItem =
          ticketsToMapByEmailAndItem(existingTickets);
        const newTickets = tickets.filter(
          (t) => !existingTicketsByEmailAndItem.has(getEmailAndItemKey(t))
        );

        // Step 1 of saving: insert tickets that are new
        logger(
          `[DEVCONNECT PRETIX] Inserting ${newTickets.length} new tickets`
        );
        for (const ticket of newTickets) {
          logger(`[DEVCONNECT PRETIX] Inserting ${JSON.stringify(ticket)}`);
          await insertDevconnectPretixTicket(this.db, ticket);
        }

        // Step 2 of saving: update tickets that have changed
        // Filter to tickets that existed before, and filter to those that have changed.
        const updatedTickets = tickets
          .filter((t) =>
            existingTicketsByEmailAndItem.has(getEmailAndItemKey(t))
          )
          .filter((t) => {
            const oldTicket = existingTicketsByEmailAndItem.get(
              getEmailAndItemKey(t)
            )!;
            const newTicket = t;
            return pretixTicketsDifferent(oldTicket, newTicket);
          });

        // For the tickets that have changed, update them in the database.
        logger(`[DEVCONNECT PRETIX] Updating ${updatedTickets.length} tickets`);
        for (const updatedTicket of updatedTickets) {
          const oldTicket = existingTicketsByEmailAndItem.get(
            getEmailAndItemKey(updatedTicket)
          );
          logger(
            `[DEVCONNECT PRETIX] Updating ${JSON.stringify(
              oldTicket
            )} to ${JSON.stringify(updatedTicket)}`
          );
          await updateDevconnectPretixTicket(this.db, updatedTicket);
        }

        // Step 3 of saving: remove users that don't have a ticket anymore
        const removedTickets = existingTickets.filter(
          (existing) =>
            !newTicketsByEmailAndItem.has(getEmailAndItemKey(existing))
        );
        logger(`[DEVCONNECT PRETIX] Deleting ${removedTickets.length} users`);
        for (const removedTicket of removedTickets) {
          logger(
            `[DEVCONNECT PRETIX] Deleting ${JSON.stringify(removedTicket)}`
          );
          await softDeleteDevconnectPretixTicket(this.db, removedTicket);
        }

        span?.setAttribute("ticketsInserted", newTickets.length);
        span?.setAttribute("ticketsUpdated", updatedTickets.length);
        span?.setAttribute("ticketsDeleted", removedTickets.length);
        span?.setAttribute(
          "ticketsTotal",
          existingTickets.length + newTickets.length - removedTickets.length
        );
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] error while syncing for ${orgURL} and ${eventID}, skipping update`,
          { error: e }
        );
        return false;
      }
      return true;
    });
  }

  /**
   * Syncs tickets from Pretix API for a given organizer and event
   */
  private async syncAllPretixForOrganizerAndEvent(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig
  ): Promise<void> {
    return traced(
      SERVICE_NAME_FOR_TRACING,
      "syncAllPretixForOrganizerAndEvent",
      async (span) => {
        const { orgURL } = organizer;
        const { eventID } = event;

        logger(
          `[DEVCONNECT PRETIX] syncing Pretix for ${orgURL} and ${eventID}`
        );

        if (!(await this.syncEventInfos(organizer, event))) {
          logger(
            `[DEVCONNECT PRETIX] aborting sync due to error in updating event info`
          );
          return;
        }

        if (!(await this.syncItemInfos(organizer, event))) {
          logger(
            `[DEVCONNECT PRETIX] aborting sync due to error in updating event info`
          );
          return;
        }

        if (!(await this.syncTickets(organizer, event))) {
          logger(`[DEVCONNECT PRETIX] error updating tickets`);
          return;
        }
      }
    );
  }

  /**
   * Converts a given list of orders to tickets, and sets
   * all of their roles to equal the given role. When `subEvents`
   * is passed in as a parameter, cross-reference them with the
   * orders, and set the visitor date ranges for the new
   * `DevconnectPretixTicket` to equal to the date ranges of the visitor
   * subevent events they have in their order.
   */
  private ordersToDevconnectTickets(
    orders: DevconnectPretixOrder[],
    itemsInfo: PretixItemInfo[]
  ): DevconnectPretixTicket[] {
    // Go through all orders and aggregate all item IDs under
    // the same (email, event_id, organizer_url) tuple. Since we're
    // already fixing the event_id and organizer_url in this function,
    // we just need to have the email as the key for this map.
    const itemsInfoByItemID = new Map(itemsInfo.map((i) => [i.item_id, i]));
    const tickets: DevconnectPretixTicket[] = [];

    for (const order of orders) {
      // check that they paid
      if (order.status !== "p") {
        continue;
      }
      for (const {
        positionid,
        item,
        attendee_name,
        attendee_email
      } of order.positions) {
        const existingItem = itemsInfoByItemID.get(item.toString());
        if (existingItem) {
          // Try getting email from response to question; otherwise, default to email of purchaser
          if (!attendee_email) {
            logger(
              `[DEVCONNECT PRETIX] encountered order position without attendee email, defaulting to order email`,
              {
                orderCode: order.code,
                positionID: positionid,
                orderEmail: order.email
              }
            );
          }
          const email = (attendee_email || order.email).toLowerCase();

          tickets.push({
            email,
            full_name: attendee_name,
            devconnect_pretix_items_info_id: existingItem.id,
            is_deleted: false,
            is_consumed: false
          });
        }
      }
    }
    return tickets;
  }
}

/**
 * Kick off a period sync from Pretix into PCDPassport
 */
export async function startDevconnectPretixSyncService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  semaphoreService: SemaphoreService,
  devconnectPretixAPI: IDevconnectPretixAPI | null
): Promise<DevconnectPretixSyncService | null> {
  if (context.isZuzalu) {
    logger("[DEVCONNECT PRETIX] not starting service because IS_ZUZALU=true");
    return null;
  }

  if (!devconnectPretixAPI) {
    logger(
      "[DEVCONNECT PRETIX] can't start sync service - no api instantiated"
    );
    return null;
  }

  const devconnectPretixConfig = await getDevconnectPretixConfig(
    context.dbPool
  );

  if (!devconnectPretixConfig) {
    return null;
  }

  logger(
    `[DEVCONNECT PRETIX] initializing with configuration: ${JSON.stringify(
      devconnectPretixConfig,
      null,
      2
    )}`
  );

  const pretixSyncService = new DevconnectPretixSyncService(
    context,
    devconnectPretixAPI,
    devconnectPretixConfig,
    rollbarService,
    semaphoreService
  );

  pretixSyncService.startSyncLoop();
  return pretixSyncService;
}
