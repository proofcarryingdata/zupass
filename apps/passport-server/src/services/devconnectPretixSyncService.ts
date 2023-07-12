import { Pool } from "pg";
import {
  DevconnectPretixEventConfig,
  DevconnectPretixOrder,
  DevconnectPretixOrganizerConfig,
  IDevconnectPretixAPI,
} from "../apis/devconnectPretixAPI";
import { DevconnectPretixTicket } from "../database/models";
import { deleteDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/deleteDevconnectPretixTicket";
import {
  fetchAllDevconnectPretixTickets,
  fetchDevconnectPretixTicketsByOrgAndEvent,
} from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { insertDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import { updateDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import { ApplicationContext } from "../types";
import {
  pretixTicketsDifferent,
  ticketsToMapByEmail,
} from "../util/devconnectUser";
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
  private rollbarService: RollbarService | null;
  private semaphoreService: SemaphoreService;
  private context: ApplicationContext;
  private timeout: NodeJS.Timeout | undefined;
  private _hasCompletedSyncSinceStarting: boolean;

  public get hasCompletedSyncSinceStarting(): boolean {
    return this._hasCompletedSyncSinceStarting;
  }

  public constructor(
    context: ApplicationContext,
    pretixAPI: IDevconnectPretixAPI,
    rollbarService: RollbarService | null,
    semaphoreService: SemaphoreService
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.semaphoreService = semaphoreService;
    this.pretixAPI = pretixAPI;
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
    const trySync = async (): Promise<void> => {
      await this.trySync();
      this.timeout = setTimeout(() => trySync(), 1000 * 60);
    };

    trySync();
  }

  public async trySync(): Promise<void> {
    try {
      await this.sync();
      await this.semaphoreService.reload();
      this._hasCompletedSyncSinceStarting = true;
    } catch (e) {
      this.rollbarService?.reportError(e);
      logger(e);
    }
  }

  public stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  /**
   * Synchronize Pretix state with PCDPassport state.
   */
  private async sync(): Promise<void> {
    return traced(SERVICE_NAME_FOR_TRACING, "sync", async () => {
      const syncStart = Date.now();
      logger("[DEVCONNECT PRETIX] Sync start");

      const { dbPool } = this.context;

      const promises = [];
      for (const organizer of this.pretixAPI.config.organizers) {
        for (const event of organizer.events) {
          promises.push(
            this.syncTicketsForOrganizerAndEvent(dbPool, organizer, event)
          );
        }
      }
      try {
        await Promise.all(promises);
      } catch (e) {
        logger("[DEVCONNECT PRETIX] failed to save tickets");
        logger("[DEVCONNECT PRETIX]", e);
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
   * - Insert new tickets into the database.
   * - Update role and visitor dates of existing tickets, if they
   *   been changed.
   * - Delete tickets that are no longer residents.
   */
  private async saveTickets(
    dbClient: Pool,
    pretixTickets: DevconnectPretixTicket[]
  ): Promise<void> {
    return traced(SERVICE_NAME_FOR_TRACING, "saveTickets", async (span) => {
      const pretixTicketsAsMap = ticketsToMapByEmail(pretixTickets);
      const existingTickets = await fetchAllDevconnectPretixTickets(dbClient);
      const existingTicketsByEmail = ticketsToMapByEmail(existingTickets);
      const newTickets = pretixTickets.filter(
        (p) => !existingTicketsByEmail.has(p.email)
      );

      // Step 1 of saving: insert tickets that are new
      logger(`[DEVCONNECT PRETIX] Inserting ${newTickets.length} new tickets`);
      for (const ticket of newTickets) {
        logger(`[DEVCONNECT PRETIX] Inserting ${JSON.stringify(ticket)}`);
        await insertDevconnectPretixTicket(dbClient, ticket);
      }

      // Step 2 of saving: update tickets that have changed
      // Filter to tickets that existed before, and filter to those that have changed.
      const updatedTickets = pretixTickets
        .filter((p) => existingTicketsByEmail.has(p.email))
        .filter((p) => {
          const oldTicket = existingTicketsByEmail.get(p.email)!;
          const newTicket = p;
          return pretixTicketsDifferent(oldTicket, newTicket);
        });

      // For the tickets that have changed, update them in the database.
      logger(`[DEVCONNECT PRETIX] Updating ${updatedTickets.length} tickets`);
      for (const updatedTicket of updatedTickets) {
        const oldTicket = existingTicketsByEmail.get(updatedTicket.email);
        logger(
          `[DEVCONNECT PRETIX] Updating ${JSON.stringify(
            oldTicket
          )} to ${JSON.stringify(updatedTicket)}`
        );
        await updateDevconnectPretixTicket(dbClient, updatedTicket);
      }

      // Step 3 of saving: remove users that don't have a ticket anymore
      const removedTickets = existingTickets.filter(
        (existing) => !pretixTicketsAsMap.has(existing.email)
      );
      logger(`[DEVCONNECT PRETIX] Deleting ${removedTickets.length} users`);
      for (const removedTicket of removedTickets) {
        logger(`[DEVCONNECT PRETIX] Deleting ${JSON.stringify(removedTicket)}`);
        await deleteDevconnectPretixTicket(dbClient, removedTicket);
      }

      span?.setAttribute("ticketsInserted", newTickets.length);
      span?.setAttribute("ticketsUpdated", updatedTickets.length);
      span?.setAttribute("ticketsDeleted", removedTickets.length);
      span?.setAttribute(
        "ticketsTotal",
        existingTickets.length + newTickets.length - removedTickets.length
      );
    });
  }

  /**
   * Downloads the complete list of both visitors and residents from Pretix.
   */
  private async syncTicketsForOrganizerAndEvent(
    dbClient: Pool,
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig
  ): Promise<void> {
    return traced(SERVICE_NAME_FOR_TRACING, "loadAllTickets", async (span) => {
      const { orgURL, token } = organizer;
      const { eventID, activeItemIDs } = event;
      logger(
        `[DEVCONNECT PRETIX] fetching orders for ${orgURL} and ${eventID}`
      );

      let pretixOrders: DevconnectPretixOrder[];
      try {
        // TODO: Check activeItemIDs
        pretixOrders = await this.pretixAPI.fetchOrders(orgURL, token, eventID);
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] error while fetching orders for ${orgURL} and ${eventID}, skipping update`
        );
        return;
      }

      const tickets = this.ordersToDevconnectTickets(
        pretixOrders,
        eventID,
        orgURL,
        activeItemIDs
      );

      const newTicketsByEmail = ticketsToMapByEmail(tickets);
      const existingTickets = await fetchDevconnectPretixTicketsByOrgAndEvent(
        dbClient,
        orgURL,
        eventID
      );
      const existingTicketsByEmail = ticketsToMapByEmail(existingTickets);
      const newTickets = tickets.filter(
        (p) => !existingTicketsByEmail.has(p.email)
      );

      // Step 1 of saving: insert tickets that are new
      logger(`[DEVCONNECT PRETIX] Inserting ${newTickets.length} new tickets`);
      for (const ticket of newTickets) {
        logger(`[DEVCONNECT PRETIX] Inserting ${JSON.stringify(ticket)}`);
        await insertDevconnectPretixTicket(dbClient, ticket);
      }

      // Step 2 of saving: update tickets that have changed
      // Filter to tickets that existed before, and filter to those that have changed.
      const updatedTickets = tickets
        .filter((p) => existingTicketsByEmail.has(p.email))
        .filter((p) => {
          const oldTicket = existingTicketsByEmail.get(p.email)!;
          const newTicket = p;
          return pretixTicketsDifferent(oldTicket, newTicket);
        });

      // For the tickets that have changed, update them in the database.
      logger(`[DEVCONNECT PRETIX] Updating ${updatedTickets.length} tickets`);
      for (const updatedTicket of updatedTickets) {
        const oldTicket = existingTicketsByEmail.get(updatedTicket.email);
        logger(
          `[DEVCONNECT PRETIX] Updating ${JSON.stringify(
            oldTicket
          )} to ${JSON.stringify(updatedTicket)}`
        );
        await updateDevconnectPretixTicket(dbClient, updatedTicket);
      }

      // Step 3 of saving: remove users that don't have a ticket anymore
      const removedTickets = existingTickets.filter(
        (existing) => !newTicketsByEmail.has(existing.email)
      );
      logger(`[DEVCONNECT PRETIX] Deleting ${removedTickets.length} users`);
      for (const removedTicket of removedTickets) {
        logger(`[DEVCONNECT PRETIX] Deleting ${JSON.stringify(removedTicket)}`);
        await deleteDevconnectPretixTicket(dbClient, removedTicket);
      }

      span?.setAttribute("ticketsInserted", newTickets.length);
      span?.setAttribute("ticketsUpdated", updatedTickets.length);
      span?.setAttribute("ticketsDeleted", removedTickets.length);
      span?.setAttribute(
        "ticketsTotal",
        existingTickets.length + newTickets.length - removedTickets.length
      );
    });
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
    eventID: string,
    organizerURL: string,
    activeItemIDs: number[]
  ): DevconnectPretixTicket[] {
    // Go through all orders and aggregate all item IDs under
    // the same (email, event_id, organizer_url) tuple. Since we're
    // already fixing the event_id and organizer_url in this function,
    // we just need to have the email as the key for this map.
    const ticketsByEmail = new Map<string, DevconnectPretixTicket>();

    for (const order of orders) {
      // check that they paid
      if (order.status !== "p") {
        continue;
      }
      for (const {
        positionid,
        item,
        attendee_name,
        attendee_email,
      } of order.positions) {
        if (activeItemIDs.includes(item)) {
          // Try getting email from response to question; otherwise, default to email of purchaser
          if (!attendee_email) {
            logger(
              "[DEVCONNECT PRETIX] encountered order position without attendee email",
              {
                orderCode: order.code,
                positionID: positionid,
              }
            );
          }
          const email = (attendee_email || order.email).toLowerCase();

          // Push item ID into ticket if exists; otherwise, create new ticket
          const existingTicket = ticketsByEmail.get(email);
          if (existingTicket) {
            existingTicket.item_ids.push(item);
          } else {
            ticketsByEmail.set(email, {
              event_id: eventID,
              item_ids: [item],
              organizer_url: organizerURL,
              name: attendee_name,
              email,
            });
          }
        }
      }
    }

    return [...ticketsByEmail.values()];
  }
}
/**
 * Kick off a period sync from Pretix into PCDPassport
 */
export function startDevconnectPretixSyncService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  semaphoreService: SemaphoreService,
  pretixAPI: IDevconnectPretixAPI | null
): DevconnectPretixSyncService | null {
  if (!pretixAPI) {
    logger(
      "[DEVCONNECT PRETIX] can't start sync service - no api instantiated"
    );
    return null;
  }

  const pretixSyncService = new DevconnectPretixSyncService(
    context,
    pretixAPI,
    rollbarService,
    semaphoreService
  );

  pretixSyncService.startSyncLoop();
  return pretixSyncService;
}
