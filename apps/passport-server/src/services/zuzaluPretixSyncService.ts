import { DateRange, ZuzaluUserRole } from "@pcd/passport-interface";
import { RollbarService } from "@pcd/server-shared";
import { PoolClient } from "postgres-pool";
import {
  IZuzaluPretixAPI,
  ZuzaluPretixOrder,
  ZuzaluPretixSubevent
} from "../apis/zuzaluPretixAPI";
import { ZuzaluPretixTicket } from "../database/models";
import { deleteZuzaluTicket } from "../database/queries/zuzalu_pretix_tickets/deleteZuzaluUser";
import { fetchAllZuzaluPretixTickets } from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { insertZuzaluPretixTicket } from "../database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { updateZuzaluPretixTicket } from "../database/queries/zuzalu_pretix_tickets/updateZuzaluPretixTicket";
import { sqlQueryWithPool } from "../database/sqlQuery";
import { ApplicationContext, ServerMode } from "../types";
import { logger } from "../util/logger";
import {
  pretixTicketsDifferent,
  ticketsToMapByEmail
} from "../util/zuzaluUser";
import { SemaphoreService } from "./semaphoreService";
import { traced } from "./telemetryService";

const SERVICE_NAME_FOR_TRACING = "Pretix";

/**
 * Responsible for syncing users from Pretix into an internal representation.
 */
export class ZuzaluPretixSyncService {
  private pretixAPI: IZuzaluPretixAPI;
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
    pretixAPI: IZuzaluPretixAPI,
    rollbarService: RollbarService | null,
    semaphoreService: SemaphoreService
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.semaphoreService = semaphoreService;
    this.pretixAPI = pretixAPI;
    this._hasCompletedSyncSinceStarting = false;
  }

  public replaceApi(newAPI: IZuzaluPretixAPI): void {
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
      const success = await this.trySync();

      if (success) {
        logger(`[PRETIX] success`);
      } else {
        logger(`[PRETIX] failed to sync`);
      }

      this.timeout = setTimeout(() => trySync(), 1000 * 60);
    };

    trySync();
  }

  public async trySync(): Promise<boolean> {
    try {
      await this.sync();
      await this.semaphoreService.reload();
      this._hasCompletedSyncSinceStarting = true;
      return true;
    } catch (e) {
      this.rollbarService?.reportError(e);
      logger(e);
      return false;
    }
  }

  public stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  /**
   * Synchronize Pretix state with Zupass state.
   */
  private async sync(): Promise<void> {
    return traced(SERVICE_NAME_FOR_TRACING, "sync", async () => {
      const syncStart = Date.now();
      logger("[PRETIX] Sync start");
      const tickets = await this.loadAllTickets();
      const ticketEmails = new Set(tickets.map((p) => p.email));

      logger(
        `[PRETIX] loaded ${tickets.length} Pretix tickets (visitors, residents, and organizers)` +
          ` from Pretix, found ${ticketEmails.size} unique emails`
      );

      const { dbPool } = this.context;

      try {
        await sqlQueryWithPool(dbPool, (client) =>
          this.saveTickets(client, tickets)
        );
      } catch (e) {
        logger("[PRETIX] failed to save tickets");
        logger("[PRETIX]", e);
        this.rollbarService?.reportError(e);
      }

      const syncEnd = Date.now();
      logger(
        `[PRETIX] Sync end. Completed in ${Math.floor(
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
    client: PoolClient,
    pretixTickets: ZuzaluPretixTicket[]
  ): Promise<void> {
    return traced(SERVICE_NAME_FOR_TRACING, "saveTickets", async (span) => {
      const pretixTicketsAsMap = ticketsToMapByEmail(pretixTickets);
      const existingTickets = await fetchAllZuzaluPretixTickets(client);
      const existingTicketsByEmail = ticketsToMapByEmail(existingTickets);
      const newTickets = pretixTickets.filter(
        (p) => !existingTicketsByEmail.has(p.email)
      );

      // Step 1 of saving: insert tickets that are new
      logger(`[PRETIX] Inserting ${newTickets.length} new tickets`);
      for (const ticket of newTickets) {
        logger(`[PRETIX] Inserting ${JSON.stringify(ticket)}`);
        await insertZuzaluPretixTicket(client, ticket);
      }

      // Step 2 of saving: update tickets that have changed
      // Filter to tickets that existed before, and filter to those that have changed.
      const updatedTickets = pretixTickets
        .filter((p) => existingTicketsByEmail.has(p.email))
        .filter((p) => {
          const oldTicket = existingTicketsByEmail.get(
            p.email
          ) as ZuzaluPretixTicket;
          const newTicket = p;
          return pretixTicketsDifferent(oldTicket, newTicket);
        });

      // For the tickets that have changed, update them in the database.
      logger(`[PRETIX] Updating ${updatedTickets.length} tickets`);
      for (const updatedTicket of updatedTickets) {
        const oldTicket = existingTicketsByEmail.get(updatedTicket.email);
        logger(
          `[PRETIX] Updating ${JSON.stringify(oldTicket)} to ${JSON.stringify(
            updatedTicket
          )}`
        );
        await updateZuzaluPretixTicket(client, updatedTicket);
      }

      // Step 3 of saving: remove users that don't have a ticket anymore
      const removedTickets = existingTickets.filter(
        (existing) => !pretixTicketsAsMap.has(existing.email)
      );
      logger(`[PRETIX] Deleting ${removedTickets.length} users`);
      for (const removedTicket of removedTickets) {
        logger(`[PRETIX] Deleting ${JSON.stringify(removedTicket)}`);
        await deleteZuzaluTicket(client, removedTicket.email);
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
  private async loadAllTickets(): Promise<ZuzaluPretixTicket[]> {
    return traced(SERVICE_NAME_FOR_TRACING, "loadAllTickets", async () => {
      logger("[PRETIX] Fetching tickets (visitors, residents, organizers)");

      const residents = await this.loadResidents();
      const visitors = await this.loadVisitors();

      const residentsAsMap = ticketsToMapByEmail(residents);
      const nonResidentVisitors = visitors.filter(
        (v) => !residentsAsMap.has(v.email)
      );

      return [...residents, ...nonResidentVisitors];
    });
  }

  /**
   * Loads those tickets for residents and organizers (not visitors) of Zuzalu.
   */
  private async loadResidents(): Promise<ZuzaluPretixTicket[]> {
    return traced(SERVICE_NAME_FOR_TRACING, "loadResidents", async () => {
      logger("[PRETIX] Fetching residents");

      // Fetch orders
      const orders = await this.pretixAPI.fetchOrders(
        this.pretixAPI.config.zuEventID
      );

      // Extract organizers
      const orgOrders = orders.filter(
        (o) =>
          o.positions[0].item === this.pretixAPI.config.zuEventOrganizersItemID
      );
      logger(
        `[PRETIX] ${orgOrders.length} organizer / ${orders.length} total resident orders`
      );
      const organizers = this.ordersToZuzaluTickets(
        orgOrders,
        [],
        ZuzaluUserRole.Organizer
      );
      const orgEmails = new Set(organizers.map((p) => p.email));

      // Extract other residents
      const residents = this.ordersToZuzaluTickets(
        orders,
        [],
        ZuzaluUserRole.Resident
      ).filter((p) => !orgEmails.has(p.email));

      // Return the combined list
      logger(
        `[PRETIX] loaded ${organizers.length} organizers, ${residents.length} residents`
      );
      return [...organizers, ...residents];
    });
  }

  /**
   * Loads all visitors of Zuzalu. Visitors are defined as those
   * who are not members of the main Zuzalu event in pretix.
   */
  private async loadVisitors(): Promise<ZuzaluPretixTicket[]> {
    return traced(SERVICE_NAME_FOR_TRACING, "loadVisitors", async () => {
      logger("[PRETIX] Fetching visitors");
      const subevents = await this.pretixAPI.fetchSubevents(
        this.pretixAPI.config.zuVisitorEventID
      );
      const visitorOrders = await this.pretixAPI.fetchOrders(
        this.pretixAPI.config.zuVisitorEventID
      );

      const visitorTickets = this.ordersToZuzaluTickets(
        visitorOrders,
        subevents,
        ZuzaluUserRole.Visitor
      );

      const visitors = this.deduplicateVisitorTickets(visitorTickets);

      logger(`[PRETIX] loaded ${visitors.length} visitors`);

      return visitors;
    });
  }

  /**
   * Converts a given list of orders to tickets, and sets
   * all of their roles to equal the given role. When `subEvents`
   * is passed in as a parameter, cross-reference them with the
   * orders, and set the visitor date ranges for the new
   * `ZuzaluPretixTicket` to equal to the date ranges of the visitor
   * subevent events they have in their order.
   */
  private ordersToZuzaluTickets(
    orders: ZuzaluPretixOrder[],
    visitorSubEvents: ZuzaluPretixSubevent[],
    role: ZuzaluUserRole
  ): ZuzaluPretixTicket[] {
    const tickets: ZuzaluPretixTicket[] = orders
      // check that they paid
      .filter((o) => o.status === "p")
      // an order can have more than one "position" (ticket)
      // for visitor orders--eg, paying for 3 individual 1-week tickets
      .filter((o) => o.positions.length >= 1)
      // check that they have an email and a name
      .filter((o) => !!o.positions[0].attendee_name)
      .filter((o) => !!(o.email || o.positions[0].attendee_email))
      .map((o) => {
        const orderSubevents = o.positions
          .map((position) => position.subevent)
          .map((positionSubeventId) =>
            visitorSubEvents.find(
              (subEvent) => subEvent.id === positionSubeventId
            )
          )
          .filter((subEvent) => !!subEvent);

        const visitorDateRanges = orderSubevents.map(
          (subEvent) =>
            ({
              date_from: subEvent?.date_from,
              date_to: subEvent?.date_to
            }) satisfies DateRange
        );

        return {
          role,
          email: (o.email || o.positions[0].attendee_email).toLowerCase(),
          name: o.positions[0].attendee_name,
          order_id: o.code,
          visitor_date_ranges: visitorDateRanges
        } satisfies ZuzaluPretixTicket;
      });

    return tickets;
  }

  /**
   * Some visitors have multiple orders. These orders need to be merged
   * into a single pretix ticket Zupass-side, so that a single user
   * on our end contains all the dates they have a visitor ticket to.
   */
  private deduplicateVisitorTickets(
    visitors: ZuzaluPretixTicket[]
  ): ZuzaluPretixTicket[] {
    const dedupedVisitors: Map<string /* email */, ZuzaluPretixTicket> =
      new Map();

    for (const visitor of visitors) {
      const existingVisitor = dedupedVisitors.get(visitor.email);

      if (existingVisitor) {
        existingVisitor.visitor_date_ranges =
          existingVisitor.visitor_date_ranges ?? [];

        existingVisitor.visitor_date_ranges.push(
          ...(visitor.visitor_date_ranges ?? [])
        );
      } else {
        dedupedVisitors.set(visitor.email, visitor);
      }
    }

    return Array.from(dedupedVisitors.values());
  }
}
/**
 * Kick off a period sync from Pretix into Zupass.
 */
export function startZuzaluPretixSyncService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  semaphoreService: SemaphoreService | null,
  pretixAPI: IZuzaluPretixAPI | null
): ZuzaluPretixSyncService | null {
  if (process.env.DISABLE_JOBS === "true") {
    logger("[PRETIX] not starting because DISABLE_JOBS");
    return null;
  }

  if (![ServerMode.UNIFIED, ServerMode.PARALLEL_MAIN].includes(context.mode)) {
    logger(
      `[INIT] zuzalu pretix sync service not started, not in unified or parallel main mode`
    );
    return null;
  }

  if (process.env.SELF_HOSTED_PODBOX_MODE === "true") {
    logger(
      `[INIT] SELF_HOSTED_PODBOX_MODE is true - not starting zuzalu pretix sync service`
    );
    return null;
  }

  if (!semaphoreService) {
    logger(
      `[INIT] zuzalu pretix sync service not started, no semaphore service`
    );
    return null;
  }

  if (!pretixAPI) {
    logger("[PRETIX] can't start sync service - no api instantiated");
    return null;
  }

  if (process.env.PRETIX_SYNC_DISABLED === "true") {
    logger("[PRETIX] not starting because PRETIX_SYNC_DISABLED");
    return null;
  }

  const pretixSyncService = new ZuzaluPretixSyncService(
    context,
    pretixAPI,
    rollbarService,
    semaphoreService
  );

  pretixSyncService.startSyncLoop();

  return pretixSyncService;
}
