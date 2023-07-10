import { Pool } from "pg";
import { IDevconnectPretixAPI } from "../apis/devconnectPretixAPI";
import { PretixOrder } from "../apis/pretixAPI";
import { DevconnectPretixTicket } from "../database/models";
import { deleteDevconnectUser } from "../database/queries/devconnect_pretix_tickets/deleteDevconnectPretixTicket";
import { fetchAllDevconnectPretixTickets } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
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
      const tickets = await this.loadAllTickets();
      const ticketEmails = new Set(tickets.map((p) => p.email));

      logger(
        `[DEVCONNECT PRETIX] loaded ${tickets.length} Pretix tickets (visitors, residents, and organizers)` +
          ` from Pretix, found ${ticketEmails.size} unique emails`
      );

      const { dbPool } = this.context;

      try {
        await this.saveTickets(dbPool, tickets);
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
        await deleteDevconnectUser(dbClient, removedTicket.email);
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
  private async loadAllTickets(): Promise<DevconnectPretixTicket[]> {
    return traced(SERVICE_NAME_FOR_TRACING, "loadAllTickets", async () => {
      logger(
        "[DEVCONNECT PRETIX] Fetching tickets (visitors, residents, organizers)"
      );

      const tickets: DevconnectPretixTicket[] = [];
      for (const organizer of this.pretixAPI.config.organizers) {
        for (const eventID of organizer.eventIDs) {
          const pretixOrders = await this.pretixAPI.fetchOrders(
            organizer.orgUrl,
            organizer.token,
            eventID
          );
          tickets.push(
            ...this.ordersToDevconnectTickets(pretixOrders, eventID, "test")
          );
        }
      }
      return tickets;
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
    orders: PretixOrder[],
    eventID: string,
    ticketName: string
  ): DevconnectPretixTicket[] {
    const tickets: DevconnectPretixTicket[] = orders
      // check that they paid
      .filter((o) => o.status === "p")
      // an order can have more than one "position" (ticket)
      // for visitor orders--eg, paying for 3 individual 1-week tickets
      .filter((o) => o.positions.length >= 1)
      // check that they have an email and a name
      .filter((o) => !!o.positions[0].attendee_name)
      .filter((o) => !!(o.email || o.positions[0].attendee_email))
      .map((o) => {
        return {
          ticket_name: ticketName,
          email: (o.email || o.positions[0].attendee_email).toLowerCase(),
          name: o.positions[0].attendee_name,
          order_id: o.code,
          event_id: eventID,
        } satisfies DevconnectPretixTicket;
      });

    return tickets;
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
